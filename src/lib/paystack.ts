import crypto from "crypto";

export const PAYSTACK_CURRENCY = "NGN";
const PAYSTACK_BASE = "https://api.paystack.co";

export function getPaystackSecretKey() {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function paystackReferenceForOrder(orderId: string) {
  return `bq_${orderId}`;
}

type PaystackResponse<T> = {
  status: boolean;
  message: string;
  data: T;
};

/**
 * ===============================
 * INITIALIZE TRANSACTION (UPGRADED)
 * ===============================
 */
export async function initializePaystackTransaction(input: {
  email: string;
  amountCents: number;
  reference: string;
  callbackUrl: string;
  metadata: Record<string, string>;

  /**
   * 👇 NEW: seller subaccount code (ACCT_xxx)
   */
  subaccountCode?: string;

  /**
   * 👇 NEW: platform fee in kobo (e.g. 50000 = ₦500)
   */
  transactionChargeCents?: number;

  /**
   * Optional Paystack control
   * "account" = split from total amount
   */
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

      // =========================
      // 🔥 MARKETPLACE SPLIT LOGIC
      // =========================
      ...(input.subaccountCode ? { subaccount: input.subaccountCode } : {}),

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
 * VERIFY TRANSACTION (UNCHANGED)
 */
export async function verifyPaystackTransaction(reference: string) {
  const res = await fetch(
    `${PAYSTACK_BASE}/transaction/verify/${encodeURIComponent(reference)}`,
    {
      headers: { Authorization: `Bearer ${getPaystackSecretKey()}` },
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
 * WEBHOOK SIGNATURE VERIFICATION (UNCHANGED)
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
