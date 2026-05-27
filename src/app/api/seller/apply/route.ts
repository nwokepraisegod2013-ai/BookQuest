import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { createSubaccount } from "@/lib/paystack";

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
     * Check DB directly (avoid stale Clerk session state)
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
        storeSlug: z.string().min(2).max(60),
        bio: z.string().max(500).optional().nullable(),

        bankCode: z.string().optional(),
        accountNumber: z.string().optional(),
      })
      .parse(await req.json());

    const slug = slugify(body.storeSlug);

    /**
     * Ensure both bank fields are provided together
     */
    const hasPartialBank =
      (!!body.bankCode && !body.accountNumber) ||
      (!body.bankCode && !!body.accountNumber);

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
     * Check slug uniqueness
     */
    const slugExists = await db.sellerProfile.findUnique({
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
     * MAIN TRANSACTION
     * =========================
     */
    const result = await db.$transaction(async (tx) => {
      const sellerProfile = await tx.sellerProfile.create({
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

      return sellerProfile;
    });

    /**
     * =========================
     * PAYSTACK SUBACCOUNT (OPTIONAL)
     * =========================
     */
    let subaccountCode: string | null = null;

    if (body.bankCode && body.accountNumber) {
      try {
        subaccountCode = await createSubaccount({
          storeName: body.storeName,
          bankCode: body.bankCode,
          accountNumber: body.accountNumber,
        });

        await db.sellerProfile.update({
          where: { id: result.id },
          data: { subaccountCode },
        });
      } catch (err) {
        console.error("Paystack subaccount creation failed:", err);
      }
    }

    return NextResponse.json({
      ok: true,
      seller: {
        id: result.id,
        storeName: result.storeName,
        storeSlug: result.storeSlug,
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
