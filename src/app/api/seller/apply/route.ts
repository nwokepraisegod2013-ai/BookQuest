import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { createSubaccount } from "@/lib/paystack/subaccount";

export async function POST(req: Request) {
  try {
    const user = await syncUserFromClerk();

    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    /**
     * =========================
     * EXISTING SELLER GUARD
     * =========================
     */
    const existingSeller = await db.sellerProfile.findUnique({
      where: { userId: user.id },
    });

    if (existingSeller) {
      return NextResponse.json(
        { error: "Already a seller" },
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
        storeName: z.string().min(2).max(80).trim(),
        storeSlug: z.string().min(2).max(60).trim(),
        bio: z.string().max(500).optional().nullable(),

        bankCode: z.string().optional(),
        accountNumber: z.string().optional(),
      })
      .parse(await req.json());

    const slug = slugify(body.storeSlug);

    /**
     * =========================
     * BANK VALIDATION (ATOMIC RULE)
     * =========================
     */
    const hasBankInfo = !!body.bankCode || !!body.accountNumber;
    const hasPartialBank =
      (body.bankCode && !body.accountNumber) ||
      (!body.bankCode && body.accountNumber);

    if (hasPartialBank) {
      return NextResponse.json(
        {
          error:
            "Both bankCode and accountNumber are required for payout setup",
        },
        { status: 400 }
      );
    }

    /**
     * =========================
     * RACE-SAFE SLUG CHECK
     * =========================
     */
    const slugExists = await db.sellerProfile.findFirst({
      where: { storeSlug: slug },
    });

    if (slugExists) {
      return NextResponse.json(
        { error: "Store slug already taken" },
        { status: 400 }
      );
    }

    /**
     * =========================
     * CREATE SELLER (CORE TX)
     * =========================
     * Only creates DB records (NO Paystack here yet)
     */
    const sellerProfile = await db.$transaction(async (tx) => {
      const seller = await tx.sellerProfile.create({
        data: {
          userId: user.id,
          storeName: body.storeName,
          storeSlug: slug,
          bio: body.bio ?? undefined,
          verified: false,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { role: Role.SELLER },
      });

      return seller;
    });

    /**
     * =========================
     * PAYSTACK SUBACCOUNT (SIDE EFFECT)
     * =========================
     * IMPORTANT: kept OUTSIDE transaction intentionally
     */
    let subaccountCode: string | null = null;

    if (hasBankInfo && body.bankCode && body.accountNumber) {
      try {
        subaccountCode = await createSubaccount({
          storeName: body.storeName,
          bankCode: body.bankCode,
          accountNumber: body.accountNumber,
        });

        await db.sellerProfile.update({
          where: { id: sellerProfile.id },
          data: { subaccountCode },
        });
      } catch (error) {
        /**
         * IMPORTANT:
         * Do NOT fail seller onboarding if Paystack fails
         * Instead mark for retry
         */
        console.error("Paystack subaccount creation failed:", error);

        await db.sellerProfile.update({
          where: { id: sellerProfile.id },
          data: {
            subaccountCode: null,
          },
        });
      }
    }

    return NextResponse.json({
      ok: true,
      seller: {
        id: sellerProfile.id,
        storeName: sellerProfile.storeName,
        storeSlug: sellerProfile.storeSlug,
        subaccountConfigured: !!subaccountCode,
      },
    });
  } catch (err) {
    console.error("Seller apply error:", err);

    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
