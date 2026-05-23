import Stripe from "stripe";

export const CURRENCY = "ngn";

let stripeClient: Stripe | null = null;

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) {
    throw new Error("STRIPE_SECRET_KEY is not set");
  }
  if (!stripeClient) {
    stripeClient = new Stripe(key, { typescript: true });
  }
  return stripeClient;
}
