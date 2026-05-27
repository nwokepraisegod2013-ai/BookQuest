import { NextResponse } from "next/server";
import { z } from "zod";
import { Role } from "@prisma/client";
import { syncUserFromClerk } from "@/lib/auth";
import { db } from "@/lib/db";
import { slugify } from "@/lib/utils";
import { createSubaccount } from "@/lib/paystack";

export async function POST(req: Request) {
  const user = await syncUserFromClerk();

  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (user.sellerProfile) {
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
      storeName: z.string().min(2).max(80),
      storeSlug: z
        .string()
        .min(2)
        .max(60)
        .regex(/^[a-z0-9-]+$/),
      bio: z.string().max(500).optional().nullable(),

      /**
       * OPTIONAL (needed for Paystack subaccount)
       * If not provided, seller can add later
       */
      bankCode: z.string().optional(),
      accountNumber: z.string().optional(),
    })
    .parse(await req.json());

  const slug = slugify(body.storeSlug);

  const exists = await db.sellerProfile.findUnique({
    where: { storeSlug: slug },
  });

  if (exists) {
    return NextResponse.json(
      { error: "Store slug taken" },
      { status: 400 }
    );
  }

  /**
   * =========================
   * CREATE SELLER PROFILE
   * =========================
   */
  const sellerProfile = await db.sellerProfile.create({
    data: {
      userId: user.id,
      storeName: body.storeName,
      storeSlug: slug,
      bio: body.bio ?? undefined,
      verified: false,
    },
  });

  /**
   * =========================
   * UPDATE USER ROLE
   * =========================
   */
  await db.user.update({
    where: { id: user.id },
    data: { role: Role.SELLER },
  });

  /**
   * =========================
   * PAYSTACK SUBACCOUNT (SAFE)
   * =========================
   * Only runs if bank details exist
   */
  try {
    if (body.bankCode && body.accountNumber) {
      const subaccountCode = await createSubaccount({
        storeName: body.storeName,
        bankCode: body.bankCode,
        accountNumber: body.accountNumber,
      });

      await db.sellerProfile.update({
        where: { id: sellerProfile.id },
        data: {
          subaccountCode,
        },
      });
    }
  } catch (err) {
    /**
     * IMPORTANT:
     * We DO NOT fail seller creation if Paystack fails
     * This prevents onboarding breakdowns
     */
    console.error("Paystack subaccount creation failed:", err);
  }

  return NextResponse.json({
    ok: true,
    message: "Seller account created successfully",
  });
}
