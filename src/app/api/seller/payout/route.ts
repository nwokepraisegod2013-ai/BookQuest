import { NextResponse } from "next/server";
import { z } from "zod";
import { getAuthUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { createTransferRecipient } from "@/lib/paystack";
import { encryptAccountNumber } from "@/lib/payout-account";

const accountSchema = z.object({
  bankName: z.string().trim().min(2).max(100),
  bankCode: z.string().trim().min(2).max(20),
  accountName: z.string().trim().min(2).max(120),
  accountNumber: z.string().trim().regex(/^\d{10}$/, "Enter a valid 10-digit Nigerian account number"),
});

export async function POST(req: Request) {
  try {
    const user = await getAuthUser();
    if (!user?.sellerProfile) return NextResponse.json({ error: "Seller profile required" }, { status: 403 });
    const account = accountSchema.parse(await req.json());
    const recipientCode = await createTransferRecipient({ name: account.accountName, accountNumber: account.accountNumber, bankCode: account.bankCode });
    await db.sellerProfile.update({
      where: { id: user.sellerProfile.id },
      data: { ...account, accountNumber: encryptAccountNumber(account.accountNumber), transferRecipientCode: recipientCode },
    });
    return NextResponse.json({ ok: true });
  } catch (err) {
    console.error("Seller payout setup error:", err);

    return NextResponse.json(
      { error: err instanceof Error ? err.message : "Could not save payout account" }, { status: 400 }
    );
  }
}
