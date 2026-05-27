import { paystackRequest, PAYSTACK_CURRENCY } from "./client";

export function paystackReferenceForOrder(orderId: string) {
  return `bq_${orderId}`;
}

/**
 * =========================
 * INIT TRANSACTION
 * =========================
 */
export async function initializePaystackTransaction(input: {
  email: string;
  amountCents: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;
  subaccountCode?: string;
  transactionChargeCents?: number;
  bearer?: "account" | "subaccount";
}) {
  return paystackRequest<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>("/transaction/initialize", {
    method: "POST",
    body: JSON.stringify({
      email: input.email,
      amount: input.amountCents,
      currency: PAYSTACK_CURRENCY,
      reference: input.reference,
      callback_url: input.callbackUrl,
      metadata: input.metadata,

      ...(input.subaccountCode
        ? { subaccount: input.subaccountCode }
        : {}),

      ...(typeof input.transactionChargeCents === "number"
        ? { transaction_charge: input.transactionChargeCents }
        : {}),

      bearer: input.bearer ?? "account",
    }),
  });
}

/**
 * =========================
 * VERIFY TRANSACTION
 * =========================
 */
export async function verifyPaystackTransaction(reference: string) {
  return paystackRequest<{
    status: string;
    reference: string;
    amount: number;
    currency: string;
    metadata?: { orderId?: string; userId?: string };
  }>(`/transaction/verify/${encodeURIComponent(reference)}`, {
    method: "GET",
  });
}