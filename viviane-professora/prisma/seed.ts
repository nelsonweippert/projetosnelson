import { config } from "dotenv"
config({ path: ".env.local" })
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"
import bcrypt from "bcryptjs"

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const email = process.env.SEED_EMAIL || "viviane@example.com"
  const password = process.env.SEED_PASSWORD || "mudar123"

  const user = await db.user.upsert({
    where: { email },
    update: {},
    create: {
      email,
      name: "Viviane",
      password: await bcrypt.hash(password, 10),
      schoolName: "Colégio Porto Seguro",
      schoolUnit: "Portinho",
      gradeLevel: "3º ano — Ensino Fundamental I",
      teachingYear: "2026",
    },
  })

  // Turma exemplo — 5 alunos
  const students = [
    { fullName: "Ana Clara Mendes", nickname: "Aninha", classroom: "3º A", birthDate: "2017-03-14", learningStyle: "visual", strengths: "Leitura fluente, gosto por interpretação de texto.", challenges: "Timidez em apresentações orais." },
    { fullName: "Bruno Tavares", nickname: null, classroom: "3º A", birthDate: "2017-06-22", learningStyle: "cinestesico", strengths: "Energia e criatividade em atividades práticas.", challenges: "Dificuldade de concentração em atividades longas.", specialNeeds: "TDAH — em acompanhamento" },
    { fullName: "Júlia Costa", nickname: "Juju", classroom: "3º A", birthDate: "2017-01-09", learningStyle: "auditivo", strengths: "Ótima memória auditiva e participação oral.", challenges: "Escrita com trocas de letras eventual." },
    { fullName: "Lucas Ferreira", nickname: null, classroom: "3º A", birthDate: "2017-08-30", learningStyle: "misto", strengths: "Raciocínio lógico forte, boa em matemática.", challenges: "Resistência a produção textual." },
    { fullName: "Mariana Silva", nickname: "Mari", classroom: "3º A", birthDate: "2017-11-05", learningStyle: "visual", strengths: "Organização impecável, lidera trabalhos em grupo.", challenges: "Perfeccionismo — se frustra com erros." },
  ]

  for (const s of students) {
    await db.student.upsert({
      where: { id: `seed-${s.fullName.toLowerCase().replace(/\s/g, "-")}` },
      update: {},
      create: {
        id: `seed-${s.fullName.toLowerCase().replace(/\s/g, "-")}`,
        ...s,
        birthDate: new Date(s.birthDate),
        userId: user.id,
      },
    })
  }

  // 3 observações exemplo
  const ana = await db.student.findFirst({ where: { fullName: "Ana Clara Mendes", userId: user.id } })
  if (ana) {
    await db.observation.create({
      data: {
        userId: user.id,
        studentId: ana.id,
        category: "ACADEMIC",
        sentiment: "POSITIVE",
        title: "Leitura em voz alta",
        note: "Leu com fluência o trecho do livro 'O Menino Maluquinho' para a turma. Muito mais segura que no bimestre passado.",
        subject: "Língua Portuguesa",
      },
    })
  }

  console.log("✅ Seed completo")
  console.log(`   Email: ${email}`)
  console.log(`   Senha: ${password}`)
  console.log(`   ${students.length} alunos cadastrados.`)
}

main().catch(console.error).finally(() => db.$disconnect())
