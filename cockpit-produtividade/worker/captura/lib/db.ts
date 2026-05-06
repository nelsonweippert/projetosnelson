/**
 * Prisma client dedicado pro worker — instância isolada (não compartilha
 * pool com a app Next.js que pode estar rodando em paralelo).
 */
import { PrismaClient } from "../../../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
export const db = new PrismaClient({ adapter })
