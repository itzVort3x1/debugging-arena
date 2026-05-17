import { PrismaClient } from "@prisma/client";

// HMR-safe singleton: Next.js dev mode re-evaluates this module on every
// request, which would otherwise spawn a fresh PrismaClient (and a fresh
// connection pool) each time. Cache it on globalThis to keep one instance
// across reloads. In production this just runs once.
const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined;
};

export const prisma = globalForPrisma.prisma ?? new PrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
