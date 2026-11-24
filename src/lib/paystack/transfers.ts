import { paystackRequest } from "./client";

export async function createTransferRecipient(input: { name: string; accountNumber: string; bankCode: string }) {
  const recipient = await paystackRequest<{ recipient_code: string }>("/transferrecipient", {
    method: "POST",
    body: JSON.stringify({ type: "nuban", name: input.name, account_number: input.accountNumber, bank_code: input.bankCode, currency: "NGN" }),
  });
  if (!recipient.recipient_code) throw new Error("Paystack did not return a transfer recipient code");
  return recipient.recipient_code;
}

export async function initiateTransfer(input: { amountCents: number; recipientCode: string; reference: string; reason: string }) {
  return paystackRequest<{ transfer_code: string; status: string }>("/transfer", {
    method: "POST",
    body: JSON.stringify({ source: "balance", amount: input.amountCents, recipient: input.recipientCode, reference: input.reference, reason: input.reason, currency: "NGN" }),
  });
}
