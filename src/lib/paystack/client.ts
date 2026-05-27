import crypto from "crypto";

export const PAYSTACK_BASE = "https://api.paystack.co";
export const PAYSTACK_CURRENCY = "NGN";

/**
 * =========================
 * SECRET KEY
 * =========================
 */
export function getPaystackSecretKey(): string {
  const key = process.env.PAYSTACK_SECRET_KEY;
  if (!key) throw new Error("PAYSTACK_SECRET_KEY is not set");
  return key;
}

/**
 * =========================
 * SAFE PAYSTACK REQUEST WRAPPER
 * =========================
 * - Handles network errors
 * - Validates Paystack response shape
 * - Prevents silent runtime failures
 */
export async function paystackRequest<T>(
  path: string,
  options: RequestInit = {}
): Promise<T> {
  const res = await fetch(`${PAYSTACK_BASE}${path}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${getPaystackSecretKey()}`,
      "Content-Type": "application/json",
      ...(options.headers ?? {}),
    },
  });

  let json: any;

  try {
    json = await res.json();
  } catch {
    throw new Error(`Paystack returned invalid JSON for ${path}`);
  }

  /**
   * Paystack always uses:
   * status: boolean
   * message: string
   * data: object
   */
  if (!res.ok || json?.status !== true) {
    throw new Error(json?.message || `Paystack request failed: ${path}`);
  }

  return json.data as T;
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
