import "dotenv/config"
import { PrismaPg } from "@prisma/adapter-pg"
import { PrismaClient } from "../src/generated/prisma/client"
import bcrypt from "bcryptjs"

const adapter = new PrismaPg({ connectionString: process.env.DATABASE_URL! })
const db = new PrismaClient({ adapter })

async function main() {
  const password = await bcrypt.hash("stormingbrabo", 12)

  const user = await db.user.upsert({
    where: { email: "nelson@cockpit.local" },
    update: { password },
    create: {
      name: "Nelson Weippert",
      email: "nelson@cockpit.local",
      password,
    },
  })

  console.log("Usuário criado/atualizado:", user.email)
}

main()
  .catch(console.error)
  .finally(() => db.$disconnect())
