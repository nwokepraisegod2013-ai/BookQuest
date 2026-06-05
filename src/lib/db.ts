import { PrismaClient } from "@prisma/client";

/**
 * =========================
 * GLOBAL TYPE SAFETY
 * =========================
 */
type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

/**
 * =========================
 * PRISMA SINGLETON
 * =========================
 */
export const db =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? [
            { level: "query", emit: "event" },
            { level: "error", emit: "event" },
            { level: "warn", emit: "event" },
          ]
        : [{ level: "error", emit: "event" }],
  });

/**
 * =========================
 * DEV OBSERVABILITY
 * =========================
 */
if (process.env.NODE_ENV === "development") {
  console.log("Prisma development mode enabled");
}

/**
 * =========================
 * FINANCIAL STATE OBSERVER
 * =========================
 * Only logs transitions (DO NOT compute earnings here)
 */


/**
 * =====================================================
 * 📊 EARNINGS FOUNDATION (IMPORTANT FOR STEP 15+ SYSTEM)
 * =====================================================
 */

/**
 * Calculate marketplace split consistently
 * This ensures EVERY part of system uses same logic
 */
export function calculateMarketplaceSplit(input: {
  grossCents: number;
  platformFeePercent?: number; // default 10%
}) {
  const feePercent = input.platformFeePercent ?? 10;

  const platformFeeCents = Math.floor(
    (input.grossCents * feePercent) / 100
  );

  const sellerEarningsCents = input.grossCents - platformFeeCents;

  return {
    grossCents: input.grossCents,
    platformFeeCents,
    sellerEarningsCents,
  };
}

/**
 * =====================================================
 * 🧾 REFUND AUDIT LOGGER (SAFE + EXTENSIBLE)
 * =====================================================
 */
export async function recordRefundEvent(input: {
  orderId: string;
  reference: string;
  amountCents?: number;
  reason?: string;
}) {
  return db.paystackEvent.create({
    data: {
      id: `refund:${input.orderId}:${Date.now()}`,
      type: "refund.success",
    },
  });
}

/**
 * =========================
 * GRACEFUL SHUTDOWN
 * =========================
 */
process.on("beforeExit", async () => {
  await db.$disconnect();
});

/**
 * =========================
 * NEXT.JS SINGLETON CACHE
 * =========================
 */
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
