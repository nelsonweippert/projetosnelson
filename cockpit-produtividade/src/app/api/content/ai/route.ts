import { NextRequest, NextResponse } from "next/server"
import { auth } from "@/lib/auth"
import { generateContentSuggestion } from "@/services/ai.service"
import { CONTENT_SKILLS, type SkillId } from "@/config/content-skills"

const SYSTEM_PROMPT = `Você é um especialista em criação de conteúdo digital para redes sociais e YouTube.
Você domina hooks virais, storytelling, copywriting, SEO para vídeo, e estratégias de engajamento.
Responda sempre em português brasileiro, de forma direta e prática.`

const SYSTEM_PROMPT_JSON = `Você é um especialista em criação de conteúdo digital para redes sociais e YouTube.
Você domina hooks virais, storytelling, copywriting, SEO para vídeo, e estratégias de engajamento.
Responda sempre em português brasileiro. Retorne APENAS JSON válido, sem markdown, sem code blocks, sem texto extra.`

export async function POST(req: NextRequest) {
  const session = await auth()
  if (!session?.user?.id) return NextResponse.json({ error: "Não autorizado" }, { status: 401 })

  const body = await req.json()
  const { action, skill, phase, title, hook, script, notes, series, research, targetDuration } = body as {
    action: string
    skill?: SkillId
    phase?: string
    title?: string
    hook?: string
    script?: string
    notes?: string
    series?: string
    research?: string
    targetDuration?: number
  }

  function formatDuration(s?: number) {
    if (!s) return "não definida"
    return s >= 60 ? `${Math.floor(s / 60)} minutos${s % 60 > 0 ? ` e ${s % 60} segundos` : ""}` : `${s} segundos`
  }
  const durationCtx = targetDuration ? `\n- Duração alvo: ${formatDuration(targetDuration)} — ADAPTE todo o conteúdo para caber nesta duração` : ""

  const skillConfig = skill ? CONTENT_SKILLS[skill] : null
  const phaseConfig = skillConfig?.phases.find((p) => p.id === phase)
  const aiContext = phaseConfig?.aiPromptContext ?? ""

  let prompt = ""

  switch (action) {
    case "generate_hook": {
      const hookPrompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}${durationCtx}
${notes ? `- Notas: ${notes}` : ""}
${series ? `- Série: ${series}` : ""}

Gere 5 opções de HOOK. Retorne APENAS um JSON array:
[{"text": "texto do hook", "style": "estilo usado (pergunta/chocante/estatística/POV/direto)", "why": "por que funciona"}]`
      try {
        const result = await generateContentSuggestion(SYSTEM_PROMPT_JSON, hookPrompt)
        const options = JSON.parse(result.replace(/```json?\n?/g, "").replace(/```/g, "").trim())
        return NextResponse.json({ type: "options", field: "hook", options })
      } catch {
        return NextResponse.json({ type: "options", field: "hook", options: [] })
      }
    }

    case "generate_titles": {
      const titlesPrompt = `${aiContext}

Contexto:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Tema/Título atual: ${title ?? "Não definido"}${durationCtx}
${hook ? `- Hook: ${hook}` : ""}

Gere 6 variações de TÍTULO otimizados para clique. Retorne APENAS um JSON array:
[{"text": "título aqui", "style": "técnica usada (curiosity gap/números/urgência/como fazer/contraste)", "why": "por que gera clique"}]
Cada título < 60 caracteres.`
      try {
        const result = await generateContentSuggestion(SYSTEM_PROMPT_JSON, titlesPrompt)
        const options = JSON.parse(result.replace(/```json?\n?/g, "").replace(/```/g, "").trim())
        return NextResponse.json({ type: "options", field: "title", options })
      } catch {
        return NextResponse.json({ type: "options", field: "title", options: [] })
      }
    }

    case "generate_series": {
      const seriesPrompt = `${aiContext}

Tema/nicho: ${title ?? "Não definido"}
Tipo de conteúdo: ${skillConfig?.label ?? "Geral"}
${series ? `Série existente: ${series}` : ""}

Gere uma SÉRIE de 6 peças de conteúdo. Retorne APENAS um JSON array:
[{"title": "título da peça", "hook": "hook sugerido (1-2 frases)", "angle": "ângulo único desta peça"}]
A série deve ter progressão lógica.`
      try {
        const result = await generateContentSuggestion(SYSTEM_PROMPT_JSON, seriesPrompt)
        const options = JSON.parse(result.replace(/```json?\n?/g, "").replace(/```/g, "").trim())
        return NextResponse.json({ type: "series", options })
      } catch {
        return NextResponse.json({ type: "series", options: [] })
      }
    }

    case "generate_script":
      prompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}${durationCtx}
${hook ? `- Hook definido: ${hook}` : ""}
${research ? `- Pesquisa/referências: ${research}` : ""}
${notes ? `- Notas: ${notes}` : ""}

Escreva um roteiro COMPLETO que caiba na duração alvo. seguindo as boas práticas da skill.
${skillConfig?.scriptTemplates?.[0] ? `Use como base a estrutura: ${skillConfig.scriptTemplates[0].structure.join(" → ")}` : ""}
Marque indicações de edição como [CORTE], [B-ROLL], [ZOOM], [TEXTO: xxx], [SFX], [MÚSICA].`
      break

    case "generate_research":
      prompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}${durationCtx}
${hook ? `- Hook: ${hook}` : ""}

Sugira um plano de pesquisa completo:
1. Pontos-chave para cobrir neste conteúdo
2. Perguntas que o público provavelmente tem sobre este tema
3. Dados/estatísticas interessantes para incluir
4. Referências e fontes sugeridas para pesquisar
5. Ângulos únicos que poucos criadores exploram`
      break

    case "generate_thumbnail":
      prompt = `Você é um especialista em design de thumbnails para ${skillConfig?.label ?? "conteúdo digital"}.

Contexto:
- Título: ${title ?? "Não definido"}${durationCtx}
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

    case "generate_description":
      prompt = `${aiContext}

Contexto do conteúdo:
- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}${durationCtx}
${hook ? `- Hook: ${hook}` : ""}
${script ? `- Roteiro (resumo): ${script.substring(0, 500)}` : ""}
${notes ? `- Notas: ${notes}` : ""}

Gere uma DESCRIÇÃO/CAPTION completa para publicação na plataforma.
Inclua:
1. Descrição otimizada para SEO (keywords naturais no texto)
2. Call-to-action
3. 10-15 hashtags relevantes (mix de tamanhos)
4. Se YouTube: inclua timestamps/capítulos sugeridos

Formate a descrição pronta para copiar e colar na plataforma.`
      break

    case "review":
      prompt = `${aiContext}

Revise este conteúdo e dê feedback detalhado:

- Tipo: ${skillConfig?.label ?? "Geral"}
- Título: ${title ?? "Não definido"}${durationCtx}
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
