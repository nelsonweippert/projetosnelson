import type { RadarAxis } from "@/components/RadarChart"

export const ASSESSMENT_AXES: (RadarAxis & { field: string; description: string })[] = [
  { key: "alimentacao",          field: "alimentacao",          emoji: "🍎", label: "Alimentação",          description: "Hábitos, variedade, autonomia no lanche e refeições" },
  { key: "comportamento",        field: "comportamento",        emoji: "🎯", label: "Comportamento",        description: "Autocontrole, respeito às regras, postura em sala" },
  { key: "relacoesInterpessoais",field: "relacoesInterpessoais",emoji: "🤝", label: "Relações",             description: "Colegas, professora, forma de resolver conflitos" },
  { key: "participacao",         field: "participacao",         emoji: "🙋", label: "Participação",         description: "Interesse, perguntas, engajamento nas aulas" },
  { key: "autonomia",            field: "autonomia",            emoji: "🎒", label: "Autonomia",            description: "Tarefas, pertences, organização pessoal" },
  { key: "aprendizagem",         field: "aprendizagem",         emoji: "📚", label: "Aprendizagem",         description: "Progresso pedagógico geral (visão macro)" },
  { key: "emocional",            field: "emocional",            emoji: "💜", label: "Emocional",            description: "Autoestima, lidar com frustração, demonstração de afeto" },
  { key: "higiene",              field: "higiene",              emoji: "🧼", label: "Higiene",              description: "Cuidados pessoais, uniforme, asseio" },
]

export const SCORE_LABEL: Record<number, string> = {
  1: "Insuficiente",
  2: "Em desenvolvimento",
  3: "Satisfatório",
  4: "Bom",
  5: "Excelente",
}

export const SCORE_COLOR: Record<number, string> = {
  1: "#DC2626",
  2: "#F59E0B",
  3: "#6B7280",
  4: "#3B82F6",
  5: "#10B981",
}
