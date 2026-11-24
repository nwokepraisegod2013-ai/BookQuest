import crypto from "crypto";
import { getPaystackSecretKey } from "@/lib/paystack/client";

function key() {
  return crypto.createHash("sha256").update(`bookquest:payout-account:${getPaystackSecretKey()}`).digest();
}

export function encryptAccountNumber(accountNumber: string) {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const encrypted = Buffer.concat([cipher.update(accountNumber, "utf8"), cipher.final()]);
  return `enc:${iv.toString("base64url")}.${cipher.getAuthTag().toString("base64url")}.${encrypted.toString("base64url")}`;
}

export function decryptAccountNumber(value: string | null) {
  if (!value || !value.startsWith("enc:")) return value;
  const [ivValue, tagValue, encryptedValue] = value.slice(4).split(".");
  if (!ivValue || !tagValue || !encryptedValue) throw new Error("Invalid encrypted payout account data");
  const decipher = crypto.createDecipheriv("aes-256-gcm", key(), Buffer.from(ivValue, "base64url"));
  decipher.setAuthTag(Buffer.from(tagValue, "base64url"));
  return Buffer.concat([decipher.update(Buffer.from(encryptedValue, "base64url")), decipher.final()]).toString("utf8");
}
