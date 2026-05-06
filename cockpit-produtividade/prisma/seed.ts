import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

const DEFAULT_DEV_EMAIL = "storming@tempestlabs.gg"
const DEFAULT_DEV_NAME = "Nelson Weippert"
const DEFAULT_DEV_PASSWORD = "admin12345"

async function main() {
  const email = process.env.SEED_EMAIL ?? DEFAULT_DEV_EMAIL
  const name = process.env.SEED_NAME ?? DEFAULT_DEV_NAME
  const password = process.env.SEED_PASSWORD ?? DEFAULT_DEV_PASSWORD

  const usingDefaults =
    !process.env.SEED_EMAIL ||
    !process.env.SEED_PASSWORD ||
    !process.env.SEED_NAME

  if (usingDefaults && process.env.NODE_ENV === "production") {
    console.error(
      "[seed] ❌ NODE_ENV=production e SEED_EMAIL/SEED_PASSWORD/SEED_NAME não definidos.",
    )
    console.error(
      "[seed] Defina as 3 variáveis no .env.local ou no provider antes de rodar seed em produção.",
    )
    process.exit(1)
  }

  if (usingDefaults) {
    console.warn(
      "[seed] ⚠️  Usando credenciais default (dev). Defina SEED_EMAIL/SEED_PASSWORD/SEED_NAME pra customizar.",
    )
  }

  const hash = await bcrypt.hash(password, 12)

  const user = await db.user.upsert({
    where: { email },
    update: { name, password: hash },
    create: { name, email, password: hash },
  })

  console.log(`[seed] ✅ usuário ${usingDefaults ? "(dev)" : ""} ok:`, user.email)
}

main()
  .catch((err) => {
    console.error("[seed] erro:", err)
    process.exit(1)
  })
  .finally(() => db.$disconnect())
