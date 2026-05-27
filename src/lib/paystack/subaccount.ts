import { paystackRequest } from "./client";

/**
 * =========================
 * CREATE SUBACCOUNT
 * =========================
 */
export async function createSubaccount(input: {
  storeName: string;
  bankCode: string;
  accountNumber: string;
  percentageCharge?: number;
}) {
  const res = await paystackRequest<{ subaccount_code: string }>(
    "/subaccount",
    {
      method: "POST",
      body: JSON.stringify({
        business_name: input.storeName,
        settlement_bank: input.bankCode,
        account_number: input.accountNumber,
        percentage_charge: input.percentageCharge ?? 0,
        description: `Subaccount for ${input.storeName}`,
      }),
    }
  );

  return res.subaccount_code;
}