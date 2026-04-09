import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash("admin12345", 12)

  const user = await db.user.upsert({
    where: { email: "storming@tempestlabs.gg" },
    update: { name: "Nelson Weippert", password },
    create: {
      name: "Nelson Weippert",
      email: "storming@tempestlabs.gg",
      password,
    },
  })

  console.log("Usuário criado/atualizado:", user.email)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
