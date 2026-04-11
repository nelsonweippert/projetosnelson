import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateContentSuggestion } from "@/services/ai.service"
import { CONTENT_SKILLS, type SkillId } from "@/config/content-skills"

const SYSTEM_PROMPT = `Você é um especialista em criação de conteúdo digital para redes sociais e YouTube.
Você domina hooks virais, storytelling, copywriting, SEO para vídeo, e estratégias de engajamento.
Responda sempre em português brasileiro, de forma direta e prática.
Use markdown leve para formatação (negrito, listas, etc).`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json()
  const { action, skill, phase, title, hook, script, notes, series, research } = body as {
    action: string
    skill?: SkillId
    phase?: string
    title?: string
    hook?: string
    script?: string
    notes?: string
    series?: string
    research?: string
  }

  const skillConfig = skill ? CONTENT_SKILLS[skill] : null
  const phaseConfig = skillConfig?.phases.find((p) => p.id === phase)
  const aiContext = phaseConfig?.aiPromptContext ?? ""

  let prompt = ""

  switch (action) {
    case "generate_hook":
      prompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}
${notes ? `- Notas: ${notes}` : ""}
${series ? `- Série: ${series}` : ""}

Gere 5 opções de HOOK (gancho para os primeiros segundos) para este conteúdo.
Cada hook deve ser diferente em abordagem (pergunta, afirmação chocante, estatística, POV, direto).
Numere cada opção.`
      break

    case "generate_script":
      prompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}
${hook ? `- Hook definido: ${hook}` : ""}
${research ? `- Pesquisa/referências: ${research}` : ""}
${notes ? `- Notas: ${notes}` : ""}

Escreva um roteiro COMPLETO seguindo as boas práticas da skill.
${skillConfig?.scriptTemplates?.[0] ? `Use como base a estrutura: ${skillConfig.scriptTemplates[0].structure.join(" → ")}` : ""}
Marque indicações de edição como [CORTE], [B-ROLL], [ZOOM], [TEXTO: xxx], [SFX], [MÚSICA].`
      break

    case "generate_research":
      prompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}
${hook ? `- Hook: ${hook}` : ""}

Sugira um plano de pesquisa completo:
1. Pontos-chave para cobrir neste conteúdo
2. Perguntas que o público provavelmente tem sobre este tema
3. Dados/estatísticas interessantes para incluir
4. Referências e fontes sugeridas para pesquisar
5. Ângulos únicos que poucos criadores exploram`
      break

    case "generate_titles":
      prompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Tema/Título atual: ${title ?? "Não definido"}
${hook ? `- Hook: ${hook}` : ""}

Gere 8 variações de TÍTULO otimizados para clique (CTR).
Use técnicas: curiosity gap, números, superlativos, urgência, "como fazer", contraste.
Cada título deve ter menos de 60 caracteres.
Numere cada opção e indique a técnica usada entre parênteses.`
      break

    case "generate_thumbnail":
      prompt = `Você é um especialista em design de thumbnails para ${skillConfig?.label ?? "conteúdo digital"}.

Contexto:
- Título: ${title ?? "Não definido"}
${hook ? `- Hook: ${hook}` : ""}
${notes ? `- Notas visuais: ${notes}` : ""}

Gere 3 conceitos de THUMBNAIL/ARTE VISUAL detalhados:
Para cada um descreva:
1. Composição visual (layout, elementos, posição)
2. Expressão facial/pose se aplicável
3. Texto overlay (máximo 5 palavras)
4. Esquema de cores (primária, secundária, contraste)
5. Estilo/mood (minimalista, energético, dramático, etc)
6. Prompt para usar em ferramentas de IA de imagem (DALL-E/Midjourney)

Numere cada conceito.`
      break

    case "review":
      prompt = `${aiContext}

Revise este conteúdo e dê feedback detalhado:

- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}
${hook ? `- Hook: ${hook}` : ""}
${script ? `- Roteiro:\n${script}` : ""}
${research ? `- Pesquisa: ${research}` : ""}

Analise:
1. O hook é forte o suficiente? Sugira melhoria se não
2. A estrutura mantém atenção ao longo de todo o conteúdo?
3. O CTA é claro e efetivo?
4. Pontos fortes do conteúdo
5. Pontos a melhorar (seja específico)
6. Nota geral de 1-10 com justificativa`
      break

    case "generate_series":
      prompt = `${aiContext}

Tema/nicho: ${title ?? "Não definido"}
Tipo de conteúdo: ${skillConfig?.label ?? "Geral"}
${series ? `Série existente: ${series}` : ""}

Gere uma SÉRIE de 6-8 peças de conteúdo sobre este tema.
Para cada peça inclua:
1. **Título** (otimizado para clique)
2. **Hook** (1-2 frases)
3. **Ângulo** (o que torna esta peça única na série)

A série deve ter progressão lógica (do básico ao avançado, ou cronológica, ou por subtema).
Formate cada peça numerada claramente.`
      break

    default:
      return NextResponse.json({ error: "Ação desconhecida" }, { status: 400 })
  }

  try {
    const result = await generateContentSuggestion(SYSTEM_PROMPT, prompt)
    return NextResponse.json({ result })
  } catch (err) {
    console.error("[content/ai] error:", err)
    return NextResponse.json({ error: "Erro ao gerar sugestão" }, { status: 500 })
  }
}
