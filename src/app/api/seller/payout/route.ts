import { NextResponse } from "next/server";
import { z } from "zod";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { createSubaccount } from "@/lib/paystack/subaccount";

export async function POST(req: Request) {
  try {
    const user = await syncUserFromClerk();

    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 401 }
      );
    }

    /**
     * =========================
     * FETCH SELLER PROFILE
     * =========================
     */
    const seller = await db.sellerProfile.findUnique({
      where: { userId: user.id },
    });

    if (!seller) {
      return NextResponse.json(
        { error: "Seller profile not found" },
        { status: 404 }
      );
    }

    /**
     * =========================
     * IDENTITY GUARD
     * =========================
     */
    if (seller.subaccountCode) {
      return NextResponse.json(
        { error: "Payout already configured" },
        { status: 400 }
      );
    }

    if (!seller.storeName) {
      return NextResponse.json(
        { error: "Invalid seller store name" },
        { status: 400 }
      );
    }

    /**
     * =========================
     * VALIDATION
     * =========================
     */
    const body = z
      .object({
        bankCode: z.string().min(1),
        accountNumber: z.string().min(6),
        accountName: z.string().optional(),
      })
      .parse(await req.json());

    /**
     * =========================
     * CREATE PAYSTACK SUBACCOUNT
     * =========================
     * NOTE:
     * Paystack uses ONLY:
     * - business_name
     * - settlement_bank
     * - account_number
     */
    const subaccountCode = await createSubaccount({
      storeName: seller.storeName,
      bankCode: body.bankCode,
      accountNumber: body.accountNumber,
    });

    /**
     * =========================
     * SAVE TO DATABASE
     * =========================
     */
    await db.sellerProfile.update({
      where: { id: seller.id },
      data: {
        subaccountCode,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "Payout setup successful",
      subaccountCode,
    });
  } catch (err) {
    console.error("Seller payout setup error:", err);

    return NextResponse.json(
      { error: "Failed to setup payout" },
      { status: 500 }
    );
  }
}
