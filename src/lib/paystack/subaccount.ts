import { paystackRequest } from "./client";

/**
 * =========================
 * PAYSTACK SUBACCOUNT TYPES
 * =========================
 */
export type CreateSubaccountInput = {
  storeName: string;
  bankCode: string;
  accountNumber: string;

  /**
   * Optional percentage charge (Paystack commission on subaccount)
   * e.g. 0 - 100
   */
  percentageCharge?: number;
};

type PaystackSubaccountResponse = {
  subaccount_code: string;
  business_name: string;
  settlement_bank: string;
  account_number: string;
  percentage_charge: number;
};

/**
 * =========================
 * CREATE SUBACCOUNT
 * =========================
 * Used for marketplace seller onboarding
 *
 * Returns:
 *  - ACCT_xxxxx (subaccount code)
 */
export async function createSubaccount(
  input: CreateSubaccountInput
): Promise<string> {
  const data = await paystackRequest<PaystackSubaccountResponse>(
    "/subaccount",
    {
      method: "POST",
      body: JSON.stringify({
        business_name: input.storeName,
        settlement_bank: input.bankCode,
        account_number: input.accountNumber,
        percentage_charge: input.percentageCharge ?? 0,

        /**
         * Optional but useful for admin tracking
         */
        description: `Marketplace seller subaccount: ${input.storeName}`,
      }),
    }
  );

  if (!data?.subaccount_code) {
    throw new Error("Paystack did not return a subaccount_code");
  }

  return data.subaccount_code;
}
