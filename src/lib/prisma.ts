import { PrismaClient } from "@prisma/client";

// Reuse a single PrismaClient across HMR reloads in dev to avoid exhausting
// SQLite/Postgres connections. In production this is a no-op since the
// module is only loaded once.

const globalForPrisma = globalThis as unknown as {
  prisma?: PrismaClient;
};

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["error", "warn"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
