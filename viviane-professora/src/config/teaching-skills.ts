/**
 * Registry das 8 skills pedagógicas.
 * Usado pra render de landing, nav e documentação in-app.
 */

export type TeachingSkillId =
  | "STUDENTS"
  | "OBSERVATIONS"
  | "ASSESSMENTS"
  | "REPORTS"
  | "LESSON_PLANS"
  | "ACTIVITIES"
  | "COMMUNICATION"
  | "CORRECTIONS"
  | "CALENDAR"

export interface TeachingSkill {
  id: TeachingSkillId
  label: string
  icon: string
  route: string
  tagline: string
  description: string
  claudeFeatures: string[]   // quais features da Claude API essa skill usa
  ordering: number
}

export const TEACHING_SKILLS: TeachingSkill[] = [
  {
    id: "STUDENTS",
    label: "Alunos",
    icon: "👧",
    route: "/alunos",
    tagline: "Ficha completa de cada criança",
    description: "Perfil, contato dos pais, histórico, dificuldades e pontos fortes. É a base que alimenta todas as outras skills.",
    claudeFeatures: ["Prompt caching (perfil reutilizado)", "Structured outputs (resumo do aluno)"],
    ordering: 1,
  },
  {
    id: "OBSERVATIONS",
    label: "Observações diárias",
    icon: "✍️",
    route: "/observacoes",
    tagline: "Diário de bordo da turma em 30 segundos",
    description: "Anotações rápidas sobre comportamento, aprendizagem e bem-estar. Viram matéria-prima pros relatórios descritivos.",
    claudeFeatures: ["Text generation (resumo/tags)", "Adaptive thinking"],
    ordering: 2,
  },
  {
    id: "ASSESSMENTS",
    label: "Avaliações mensais",
    icon: "📊",
    route: "/avaliacoes",
    tagline: "Radar 8 eixos pra reunião pedagógica",
    description: "Avaliação mensal de cada aluno em Alimentação, Comportamento, Relações, Participação, Autonomia, Aprendizagem, Emocional e Higiene. Comparativo com mês anterior + texto pronto pra ata.",
    claudeFeatures: [],
    ordering: 3,
  },
  {
    id: "REPORTS",
    label: "Relatórios descritivos",
    icon: "📝",
    route: "/relatorios",
    tagline: "Parecer bimestral sem perder o fim de semana",
    description: "Gerador assistido que cruza todas as observações do aluno no período e monta o relatório descritivo pra revisão.",
    claudeFeatures: ["Prompt caching", "Structured outputs (Zod)", "Adaptive thinking", "Batches API (fim de bimestre)"],
    ordering: 4,
  },
  {
    id: "LESSON_PLANS",
    label: "Planos de aula",
    icon: "📚",
    route: "/planos-aula",
    tagline: "Planejamento alinhado à BNCC, com fontes citadas",
    description: "Sugestões de plano de aula baseadas em objetivos, com pesquisa web de referências e códigos BNCC citados.",
    claudeFeatures: ["web_search (BNCC)", "web_fetch (documentos oficiais)", "Citations", "Structured outputs"],
    ordering: 5,
  },
  {
    id: "ACTIVITIES",
    label: "Atividades",
    icon: "🧩",
    route: "/atividades",
    tagline: "Banco + gerador de exercícios",
    description: "Gere listas de exercícios, provas e projetos em formato estruturado. Filtro por BNCC, dificuldade e matéria.",
    claudeFeatures: ["Structured outputs (Zod schema)", "Adaptive thinking"],
    ordering: 6,
  },
  {
    id: "COMMUNICATION",
    label: "Comunicação com pais",
    icon: "💬",
    route: "/comunicacao",
    tagline: "Rascunho de recado, e-mail ou ata em 1 clique",
    description: "IA propõe tom empático e estrutura clara. Edite e envie. Histórico por aluno pra consultar depois.",
    claudeFeatures: ["Structured outputs", "Prompt caching (perfil do aluno)"],
    ordering: 7,
  },
  {
    id: "CORRECTIONS",
    label: "Correções",
    icon: "✅",
    route: "/correcoes",
    tagline: "Foto do caderno → feedback construtivo",
    description: "Upload da foto da atividade do aluno, IA sugere correção, feedback e alinhamento BNCC. Você revisa e envia.",
    claudeFeatures: ["Vision (análise de imagem)", "PDF support", "Structured outputs (rubrica)"],
    ordering: 8,
  },
  {
    id: "CALENDAR",
    label: "Calendário pedagógico",
    icon: "📅",
    route: "/calendario",
    tagline: "Aulas, reuniões, provas e prazos em um só lugar",
    description: "Visão semanal e mensal com tipos de evento (aula, reunião, avaliação, recesso).",
    claudeFeatures: [],
    ordering: 9,
  },
]

export function getSkill(id: TeachingSkillId) {
  return TEACHING_SKILLS.find(s => s.id === id)
}
