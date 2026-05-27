import { paystackRequest } from "./client";

/**
 * =========================
 * REFUND TRANSACTION
 * =========================
 */
export async function refundPaystackTransaction(input: {
  transactionReference: string;
  amountCents?: number;
  reason?: string;
}) {
  return paystackRequest<{
    id: number;
    status: string;
    transaction: string;
    amount: number;
  }>("/refund", {
    method: "POST",
    body: JSON.stringify({
      transaction: input.transactionReference,

      ...(typeof input.amountCents === "number"
        ? { amount: input.amountCents }
        : {}),

      customer_note: input.reason ?? "Refund issued by platform",
    }),
  });
}