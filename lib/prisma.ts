import "server-only";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { ApiError } from "@/lib/api-errors";

type PrismaGlobal = typeof globalThis & {
  finTrackPrisma?: PrismaClient;
};

const globalForPrisma = globalThis as PrismaGlobal;

export function getPrisma(): PrismaClient {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new ApiError(
      503,
      "DATABASE_NOT_CONFIGURED",
      "Banco não configurado. Copie .env.example para .env, defina DATABASE_URL e reinicie o servidor.",
    );
  }

  if (!globalForPrisma.finTrackPrisma) {
    globalForPrisma.finTrackPrisma = new PrismaClient({
      adapter: new PrismaPg({ connectionString }),
    });
  }

  return globalForPrisma.finTrackPrisma;
}
