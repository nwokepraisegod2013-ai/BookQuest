import { PrismaClient } from "@prisma/client";

/**
 * =========================
 * GLOBAL TYPE SAFETY
 * =========================
 */
type PrismaGlobal = typeof globalThis & {
  prisma?: PrismaClient;
};

/**
 * =========================
 * PRISMA SINGLETON (NEXT.JS SAFE)
 * Prevents multiple instances during hot reload
 * =========================
 */
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
        : [
            { level: "error", emit: "event" },
          ],
  });

/**
 * =========================
 * ATTACH PERFORMANCE LOGGER
 * =========================
 * Logs query execution time (DEV ONLY)
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
 * OPTIONAL: GLOBAL ERROR GUARD
 * Wraps disconnect safety on shutdown
 * =========================
 */
process.on("beforeExit", async () => {
  await db.$disconnect();
});

/**
 * =========================
 * CACHE INSTANCE (IMPORTANT FOR NEXT DEV MODE)
 * =========================
 */
if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = db;
}
