import crypto from "crypto";

export const PAYSTACK_CURRENCY = "NGN";
const PAYSTACK_BASE = "https://api.paystack.co";

/**
 * =========================
 * CORE CONFIG
 * =========================
 */
export function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function paystackReferenceForOrder(orderId: string) {
  return `bq_${orderId}`;
}

/**
 * =========================
 * SHARED TYPES
 * =========================
 */
type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

/**
 * ===============================
 * INITIALIZE TRANSACTION
 * ===============================
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
  const res = await fetch(`${PAYSTACK_BASE}/transaction/initialize`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
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

  const json = (await res.json()) as PaystackResponse<{
    authorization_url: string;
    access_code: string;
    reference: string;
  }>;

  if (!res.ok || !json.status) {
    throw new Error(json.message || "Paystack initialize failed");
  }

  return json.data;
}

/**
 * ===============================
 * VERIFY TRANSACTION
 * ===============================
 */
export async function verifyPaystackTransaction(reference: string) {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: {
        Authorization: `Bearer ${getPaystackSecretKey()}`,
      },
    }
  );

  const json = (await res.json()) as PaystackResponse<{
    status: string;
    reference: string;
    amount: number;
    currency: string;
    metadata?: { orderId?: string; userId?: string };
  }>;

  if (!res.ok || !json.status) {
    throw new Error(json.message || "Paystack verify failed");
  }

  return json.data;
}

/**
 * ===============================
 * WEBHOOK SIGNATURE VERIFY
 * ===============================
 */
export function verifyPaystackWebhookSignature(
  body: string,
  signature: string | null
) {
  if (!signature) return false;

  const hash = crypto
    .createHmac("sha512", getPaystackSecretKey())
    .update(body)
    .digest("hex");

  return hash === signature;
}

/**
 * =========================
 * CREATE PAYSTACK SUBACCOUNT
 * =========================
 * Used for marketplace sellers
 */
export async function createSubaccount(input: {
  storeName: string;
  bankCode: string;
  accountNumber: string;
  percentageCharge?: number;
}) {
  const res = await fetch(`${PAYSTACK_BASE}/subaccount`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      business_name: input.storeName,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: input.percentageCharge ?? 0,
      description: `Subaccount for ${input.storeName}`,
    }),
  });

  const json = await res.json();

  if (!res.ok || !json.status) {
    throw new Error(json.message || "Failed to create Paystack subaccount");
  }

  return json.data.subaccount_code as string;
}

/**
 * ===============================
 * 🧠 REFUND TRANSACTION
 * ===============================
 */
export async function refundPaystackTransaction(input: {
  transactionReference: string;
  amountCents?: number;
  reason?: string;
}) {
  const res = await fetch(`${PAYSTACK_BASE}/refund`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      transaction: input.transactionReference,

      ...(typeof input.amountCents === "number"
        ? { amount: input.amountCents }
        : {}),

      customer_note: input.reason ?? "Refund issued by platform",
    }),
  });

  const json = (await res.json()) as PaystackResponse<{
    id: number;
    status: string;
    transaction: string;
    amount: number;
  }>;

  if (!res.ok || !json.status) {
    throw new Error(json.message || "Refund failed");
  }

  return json.data;
}
