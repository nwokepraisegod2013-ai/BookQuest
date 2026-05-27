import { PrismaClient, OrderStatus } from "@prisma/client";

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
 * PRISMA CLIENT INSTANCE
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
 * DEV OBSERVABILITY LAYER
 * =========================
 */
if (process.env.NODE_ENV === "development") {
  db.$on("query", (e) => {
    console.log("🟡 QUERY:", e.query);
    console.log("⏱ Duration:", `${e.duration}ms`);
  });

  db.$on("error", (e) => {
    console.error("🔴 PRISMA ERROR:", e);
  });

  db.$on("warn", (e) => {
    console.warn("🟠 PRISMA WARN:", e.message);
  });
}

/**
 * =========================
 * 🔥 FINANCIAL SAFETY MIDDLEWARE
 * =========================
 * Tracks critical order state transitions (PAID → REFUNDED)
 */
db.$use(async (params, next) => {
  const result = await next(params);

  try {
    /**
     * Track ORDER status changes
     */
    if (params.model === "Order" && params.action === "update") {
      const data = params.args?.data;

      if (data?.status === OrderStatus.REFUNDED) {
        console.log("💸 ORDER REFUNDED:", {
          orderId: params.args.where?.id,
          timestamp: new Date().toISOString(),
        });
      }

      if (data?.status === OrderStatus.PAID) {
        console.log("💰 ORDER PAID:", {
          orderId: params.args.where?.id,
        });
      }
    }
  } catch (err) {
    console.error("⚠️ Prisma middleware error:", err);
  }

  return result;
});

/**
 * =========================
 * 🔐 SAFE REFUND AUDIT HELPER
 * =========================
 * Centralized way to record refund actions
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
      // If your schema supports metadata, you can extend it later
    },
  });
}

/**
 * =========================
 * GRACEFUL SHUTDOWN SAFETY
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
