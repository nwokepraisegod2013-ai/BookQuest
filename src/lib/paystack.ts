import crypto from "crypto";

export const PAYSTACK_CURRENCY = "NGN";
const PAYSTACK_BASE = "https://api.paystack.co";

/**
 * =========================
 * CORE CONFIG
 * =========================
 */
export function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

export function paystackReferenceForOrder(orderId: string): string {
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
 * =========================
 * INTERNAL FETCH WRAPPER
 * =========================
 */
async function paystackRequest<T>(
  path: string,
  options: RequestInit
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(options.headers || {}),
    },
  });

  const json = (await res.json()) as PaystackResponse<T>;

  if (!res.ok || !json.status) {
    throw new Error(json.message || `Paystack request failed: ${path}`);
  }

  return json.data;
}

/**
 * =========================
 * INITIALIZE TRANSACTION
 * =========================
 */
export async function initializePaystackTransaction(input: {
  email: string;
  amountCents: number; // kobo
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

/**
 * =========================
 * WEBHOOK SIGNATURE VERIFY
 * =========================
 */
export function verifyPaystackWebhookSignature(
  body: string,
  signature: string | null
): boolean {
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
 * Used for marketplace sellers onboarding
 */
export async function createSubaccount(input: {
  storeName: string;
  bankCode: string;
  accountNumber: string;
  percentageCharge?: number;
}) {
  return paystackRequest<{ subaccount_code: string }>("/subaccount", {
    method: "POST",
    body: JSON.stringify({
      business_name: input.storeName,
      settlement_bank: input.bankCode,
      account_number: input.accountNumber,
      percentage_charge: input.percentageCharge ?? 0,
      description: `Subaccount for ${input.storeName}`,
    }),
  }).then((data) => data.subaccount_code);
}

/**
 * =========================
 * REFUND TRANSACTION
 * =========================
 */
export async function refundPaystackTransaction(input: {
  transactionReference: string;
  amountCents?: number; // kobo
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
