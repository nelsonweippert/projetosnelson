import { config } from "dotenv"
config({ path: ".env.local" })
import { PrismaClient } from "../src/generated/prisma/client"
import { PrismaPg } from "@prisma/adapter-pg"

const db = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL! }),
})

async function main() {
  const ana = await db.student.findFirst({ where: { fullName: "Ana Clara Mendes" } })
  if (!ana) throw new Error("Ana Clara não encontrada — rode o seed primeiro.")
  const userId = ana.userId

  // Limpa consolidações antigas (manuais) pra o user testar o gerador IA
  await db.monthlyAssessment.deleteMany({ where: { studentId: ana.id } })
  await db.weeklyAssessment.deleteMany({ where: { studentId: ana.id } })

  // ABRIL/2026 tem 4 segundas-feiras: 6, 13, 20, 27 — progressão tímida→confiante
  const weeks = [
    {
      referenceWeek: new Date(2026, 3, 6),
      label: "Semana de 06/04",
      alimentacao: 4, comportamento: 5, relacoesInterpessoais: 3, participacao: 2,
      autonomia: 3, aprendizagem: 5, emocional: 3, higiene: 5,
      alimentacaoNote: "Lanche variado, seletiva com frutas.",
      comportamentoNote: "Autocontrole excelente em todas as atividades.",
      relacoesInterpessoaisNote: "Ficou apenas com as duas amiguinhas mais próximas no recreio.",
      participacaoNote: "Muito quieta. Só falou quando perguntei diretamente.",
      autonomiaNote: "Esqueceu a agenda uma vez.",
      aprendizagemNote: "Interpretação de texto de 'O Pequeno Príncipe' — leu com fluência alta.",
      emocionalNote: "Visivelmente tímida, principalmente na roda de conversa.",
      higieneNote: "Impecável como sempre.",
      highlight: "Leitura da fábula em voz alta pra si mesma no canto da leitura — fluência muito acima da média.",
      concerns: "Permanece isolada no recreio. Timidez crescente nas rodas de conversa.",
    },
    {
      referenceWeek: new Date(2026, 3, 13),
      label: "Semana de 13/04",
      alimentacao: 4, comportamento: 5, relacoesInterpessoais: 3, participacao: 3,
      autonomia: 4, aprendizagem: 5, emocional: 3, higiene: 5,
      alimentacaoNote: "Começou a experimentar maçã no lanche.",
      comportamentoNote: "Continua referência de comportamento pra turma.",
      relacoesInterpessoaisNote: "Abordou colega nova pra explicar a rotina — gesto espontâneo.",
      participacaoNote: "Levantou a mão 1 vez em Ciências (primeiro registro do bimestre!).",
      autonomiaNote: "Agenda organizada toda a semana.",
      aprendizagemNote: "Fez resumo escrito do capítulo com qualidade.",
      emocionalNote: "Reagiu bem ao elogio, ficou corada mas sorriu.",
      higieneNote: "Impecável.",
      highlight: "Levantou a mão pela primeira vez em Ciências! Comentou sobre o ciclo da água.",
      concerns: null as string | null,
    },
    {
      referenceWeek: new Date(2026, 3, 20),
      label: "Semana de 20/04",
      alimentacao: 4, comportamento: 5, relacoesInterpessoais: 4, participacao: 4,
      autonomia: 4, aprendizagem: 5, emocional: 4, higiene: 5,
      alimentacaoNote: "Variedade mantida, experimentou novos sabores.",
      comportamentoNote: "Ajudou a mediar pequeno desentendimento entre colegas.",
      relacoesInterpessoaisNote: "Brincou com grupo de 4 colegas no recreio — primeira vez.",
      participacaoNote: "Participações espontâneas em 3 aulas diferentes. Fez pergunta pertinente em Matemática.",
      autonomiaNote: "Iniciou organização do caderno por divisórias — iniciativa dela.",
      aprendizagemNote: "Matemática: resolveu problemas de multiplicação por 2 dígitos sem apoio.",
      emocionalNote: "Mais relaxada. Ri nos momentos de descontração.",
      higieneNote: "Impecável.",
      highlight: "Mediou conflito entre colegas por causa de lápis — postura de liderança emergindo.",
      concerns: null as string | null,
    },
    {
      referenceWeek: new Date(2026, 3, 27),
      label: "Semana de 27/04",
      alimentacao: 4, comportamento: 5, relacoesInterpessoais: 4, participacao: 5,
      autonomia: 4, aprendizagem: 5, emocional: 4, higiene: 5,
      alimentacaoNote: "Come a merenda completa, aceita frutas novas.",
      comportamentoNote: "Postura de pequena líder da fileira.",
      relacoesInterpessoaisNote: "Faz parte do grupo principal de amigas, sem se perder de suas 2 mais próximas.",
      participacaoNote: "Fez APRESENTAÇÃO ORAL sobre 'O Pequeno Príncipe' pra toda turma. 8 min, segura, com preparação.",
      autonomiaNote: "Caderno com divisórias coloridas, impecável. Sugestão pra turma.",
      aprendizagemNote: "Desempenho excelente em todas as matérias. Começou a ajudar colega com dificuldade em leitura.",
      emocionalNote: "Confiante. Relatou à professora estar 'se sentindo mais corajosa'.",
      higieneNote: "Impecável.",
      highlight: "APRESENTAÇÃO ORAL sobre O Pequeno Príncipe — marco do mês. Pediu pra repetir na próxima semana!",
      concerns: null as string | null,
    },
  ]

  for (const w of weeks) {
    await db.weeklyAssessment.create({
      data: { ...w, userId, studentId: ana.id },
    })
  }

  console.log(`✅ ${weeks.length} avaliações semanais criadas para Ana Clara — abril/2026`)
  console.log("   Progressão: semana 1 (tímida) → semana 4 (apresentação oral, confiante)")
  console.log("")
  console.log("Agora acesse /avaliacoes e clique em:")
  console.log('   "✨ Consolidar com IA" — Ana Clara · Abril 2026')
}

main().catch(console.error).finally(() => db.$disconnect())
