// ═══════════════════════════════════════════════════════════════════════════════
// Content Skills — Best practices, phases, checklists and AI prompts
// for each content format. Built from research on top-performing creators
// and platform algorithm behavior (2024-2025).
// ═══════════════════════════════════════════════════════════════════════════════

export type SkillId = "SHORT_VIDEO" | "LONG_VIDEO" | "INSTAGRAM"

export type PhaseId =
  | "IDEA" | "RESEARCH" | "SCRIPT" | "RECORDING"
  | "EDITING" | "THUMBNAIL" | "REVIEW" | "SCHEDULED" | "PUBLISHED"

export interface PhaseChecklist {
  label: string
  tip?: string
}

export interface PhaseConfig {
  id: PhaseId
  label: string
  description: string
  checklist: PhaseChecklist[]
  tips: string[]
  aiPromptContext: string // context injected into AI prompts for this phase
}

export interface ContentSkill {
  id: SkillId
  label: string
  icon: string
  description: string
  platforms: string[]
  phases: PhaseConfig[]
  bestPractices: string[]
  commonMistakes: string[]
  kpis: { label: string; target: string; why: string }[]
  scriptTemplates: { name: string; structure: string[] }[]
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL 1: SHORT VIDEO (TikTok, YouTube Shorts, Instagram Reels)
// ─────────────────────────────────────────────────────────────────────────────

const SHORT_VIDEO: ContentSkill = {
  id: "SHORT_VIDEO",
  label: "Vídeo Curto",
  icon: "⚡",
  description: "TikTok, YouTube Shorts, Instagram Reels (15s–90s)",
  platforms: ["TIKTOK", "YOUTUBE", "INSTAGRAM"],
  phases: [
    {
      id: "IDEA",
      label: "Ideação",
      description: "Definir conceito, ângulo e gancho do vídeo",
      checklist: [
        { label: "Tema definido e validado (trending ou evergreen)", tip: "Use TikTok Creative Center ou Google Trends para validar" },
        { label: "Público-alvo claro (quem vai assistir?)" },
        { label: "Ângulo único definido (o que diferencia este vídeo?)", tip: "Mesmo tema popular precisa de ângulo original" },
        { label: "Hook de 3 segundos rascunhado", tip: "O hook decide 90% da performance" },
        { label: "Formato escolhido (tutorial, storytelling, POV, antes/depois, lista)" },
        { label: "Duração alvo definida (15s, 30s ou 60s)" },
      ],
      tips: [
        "Vídeos de 21-34 segundos têm a melhor taxa de conclusão no TikTok",
        "Comece pelo hook — se não funciona em 3s, o conceito inteiro falha",
        "Temas 'como fazer X' e 'X coisas que...' têm consistentemente alta performance",
        "Busque inspiração em vídeos virais do nicho, mas NUNCA copie — adapte o formato",
      ],
      aiPromptContext: "Gere ideias de vídeo curto considerando: hooks virais, ângulos únicos, formatos comprovados (POV, tutorial, lista, antes/depois, storytelling). O hook deve funcionar nos primeiros 1-3 segundos. Cada ideia deve incluir: título, hook, formato e duração sugerida.",
    },
    {
      id: "SCRIPT",
      label: "Roteiro",
      description: "Escrever o roteiro completo com hook, corpo e CTA",
      checklist: [
        { label: "Hook escrito (primeiros 1-3 segundos)", tip: "Use: pergunta chocante, afirmação polêmica, visual impactante, ou 'Você sabia que...'" },
        { label: "Corpo com 1 ideia central (não tente falar de tudo)" },
        { label: "Pattern interrupts a cada 3-5 segundos", tip: "Mudança de câmera, texto, zoom, gesto, tom de voz" },
        { label: "CTA claro no final (seguir, salvar, comentar)", tip: "CTAs que pedem 'salvar' geram mais alcance que 'curtir'" },
        { label: "Texto de legenda/caption com keyword no início" },
        { label: "Tempo estimado bate com duração alvo" },
      ],
      tips: [
        "HOOK PATTERNS que funcionam: 'Pare de fazer X', 'Ninguém te conta isso sobre X', 'Em 30 segundos você vai aprender...', 'O erro que 99% das pessoas cometem'",
        "Cada frase deve ter propósito — corte palavras desnecessárias",
        "Escreva como fala, não como escreve. Tom conversacional > formal",
        "O CTA 'Salva pra ver depois' gera 3-5x mais salvamentos que 'Curte aí'",
        "Use open loops: mencione algo no início que só resolve no final",
      ],
      aiPromptContext: "Escreva um roteiro de vídeo curto. Estrutura: HOOK (1-3s, impactante) → CORPO (ideia central com pattern interrupts) → CTA. Tom conversacional. Marque [CORTE], [ZOOM], [TEXTO: xxx] para indicar edição. Inclua sugestões de texto overlay. O roteiro deve manter atenção a cada 3 segundos.",
    },
    {
      id: "RECORDING",
      label: "Gravação",
      description: "Gravar o vídeo seguindo o roteiro",
      checklist: [
        { label: "Iluminação adequada (luz natural frontal ou ring light)" },
        { label: "Áudio limpo (microfone lapela ou ambiente silencioso)", tip: "Áudio ruim é o #1 motivo de swipe away" },
        { label: "Enquadramento vertical 9:16 (1080x1920)" },
        { label: "Energia alta nos primeiros 3 segundos" },
        { label: "Múltiplos takes gravados (mínimo 2-3 opções)" },
        { label: "B-roll/cutaways gravados para edição" },
      ],
      tips: [
        "Olhe para a câmera, não para a tela — cria conexão",
        "Comece a falar IMEDIATAMENTE — sem 'oi gente' ou introduções",
        "Varie o tom de voz — monotonia = swipe",
        "Grave em pedaços curtos (facilita edição e retakes)",
        "Fundo limpo ou contextual (home office, gym, etc.) — nada distrativo",
      ],
      aiPromptContext: "Sugira direções de gravação para este vídeo curto: ângulos de câmera, dicas de enquadramento, expressões faciais, gestos que amplificam a mensagem, e momentos-chave onde a energia precisa ser mais alta.",
    },
    {
      id: "EDITING",
      label: "Edição",
      description: "Editar com ritmo rápido e elementos de retenção",
      checklist: [
        { label: "Cortes a cada 2-4 segundos (ritmo rápido)", tip: "Vídeos com corte a cada 2s têm 40% mais retenção" },
        { label: "Texto overlay nos pontos-chave", tip: "65% assistem sem som — texto é essencial" },
        { label: "Música/som trending adicionado", tip: "Áudio trending dá boost no algoritmo" },
        { label: "Zoom/pan em momentos de ênfase" },
        { label: "Caption automática adicionada (acessibilidade)" },
        { label: "Thumbnail/capa atrativa (primeiro frame)" },
        { label: "Loop testado (final conecta com início)", tip: "Loops aumentam watch time e replays" },
      ],
      tips: [
        "Corte silêncios e 'uhms' — cada milissegundo conta",
        "Use 3-5 estilos de texto overlay (destaque, narrativa, dados)",
        "O final ideal conecta com o início, criando um loop infinito",
        "Adicione SFX sutis (whoosh, pop) nos cortes — aumenta retenção 15-20%",
        "Teste o vídeo sem som — deve fazer sentido só com texto",
      ],
      aiPromptContext: "Sugira um plano de edição para este vídeo curto: onde colocar cortes, quais textos overlay, momentos para zoom/efeitos, sugestão de música/SFX, e como criar um loop no final.",
    },
    {
      id: "REVIEW",
      label: "Revisão",
      description: "Revisar qualidade antes de publicar",
      checklist: [
        { label: "Assistiu o vídeo inteiro como espectador" },
        { label: "Hook funciona nos primeiros 2 segundos?" },
        { label: "Áudio está limpo e mixado?" },
        { label: "Texto legível em tela de celular?" },
        { label: "CTA está claro?" },
        { label: "Hashtags relevantes (3-5, mix de volume)", tip: "#nicho + #médio + #trending" },
        { label: "Caption com keyword na primeira linha" },
      ],
      tips: [
        "Assista em mute — o texto conta a história?",
        "Mostre para 1-2 pessoas antes de publicar (feedback rápido)",
        "Se o hook não te prende, não vai prender ninguém",
      ],
      aiPromptContext: "Revise este conteúdo de vídeo curto e dê feedback: o hook é forte o suficiente? A estrutura mantém atenção? O CTA é efetivo? Sugira melhorias específicas.",
    },
    {
      id: "SCHEDULED",
      label: "Agendamento",
      description: "Agendar publicação no melhor horário",
      checklist: [
        { label: "Horário de pico do público definido", tip: "Terça a quinta, 11h-13h e 19h-21h geralmente performam melhor" },
        { label: "Cross-post programado (TikTok + Shorts + Reels)" },
        { label: "Notificações de engajamento ativadas (responder rápido)" },
      ],
      tips: [
        "Poste quando seu público está online (veja analytics)",
        "Responda TODOS os comentários na primeira hora — sinal forte pro algoritmo",
        "Frequência ideal: 1-2 vídeos/dia no TikTok, 3-5/semana no Shorts/Reels",
      ],
      aiPromptContext: "Sugira estratégia de publicação: melhor horário, copy de caption, hashtags relevantes para o nicho, e plano de engajamento pós-publicação.",
    },
    {
      id: "PUBLISHED",
      label: "Publicado",
      description: "Acompanhar métricas e aprender",
      checklist: [
        { label: "Respondeu comentários na primeira hora" },
        { label: "Métricas anotadas após 24h e 48h" },
        { label: "Lições documentadas (o que funcionou/não funcionou)" },
      ],
      tips: [
        "Taxa de conclusão > 50% = conteúdo bom. > 70% = viral potential",
        "Compartilhamentos valem 5-10x mais que likes no algoritmo",
        "Se um vídeo viralizar, faça 2-3 variações imediatamente",
      ],
      aiPromptContext: "Analise as métricas deste vídeo curto e sugira: o que pode ter contribuído para a performance, o que melhorar no próximo, e se vale fazer uma variação/continuação.",
    },
  ],
  bestPractices: [
    "Os primeiros 1-3 segundos decidem tudo — invista 80% do tempo criativo no hook",
    "1 vídeo = 1 ideia. Nunca tente cobrir múltiplos tópicos",
    "Consistência > qualidade perfeita. Poste regularmente para alimentar o algoritmo",
    "Recicle conteúdo entre plataformas adaptando formato (não repost genérico)",
    "Estude seus top 10 vídeos — padrões de sucesso se repetem",
    "Trending audios dão boost de 30-60% no alcance nos primeiros dias",
    "Grave em lote (batch) — 5-10 vídeos em uma sessão é mais eficiente",
    "Responder comentários com vídeo gera 2-3x mais engajamento",
  ],
  commonMistakes: [
    "Introdução longa antes do conteúdo ('Oi gente, tudo bem?')",
    "Áudio ruim ou ambiente barulhento",
    "Muitas ideias em um só vídeo",
    "Não adaptar conteúdo para cada plataforma (repost idêntico)",
    "Ignorar métricas e não iterar",
    "Usar hashtags irrelevantes ou banidas",
    "Não colocar legenda/caption (65% assistem mudo)",
    "Pedir para curtir antes de entregar valor",
  ],
  kpis: [
    { label: "Taxa de conclusão", target: "> 50%", why: "Principal sinal para o algoritmo distribuir o vídeo" },
    { label: "Compartilhamentos", target: "> 2% dos views", why: "Valem 5-10x mais que likes no push algorítmico" },
    { label: "Salvamentos", target: "> 3% dos views", why: "Indicam conteúdo de valor que será revisto" },
    { label: "Comentários", target: "> 1% dos views", why: "Engajamento ativo impulsiona distribuição" },
    { label: "Tempo médio de visualização", target: "> 80% da duração", why: "Métrica #1 de qualidade de conteúdo" },
  ],
  scriptTemplates: [
    {
      name: "Hook → Problema → Solução",
      structure: [
        "HOOK (1-3s): Afirmação impactante ou pergunta",
        "PROBLEMA (5-10s): Descrever a dor/frustração",
        "SOLUÇÃO (10-20s): Resolver com dicas práticas",
        "CTA (3s): Pedir para salvar/seguir",
      ],
    },
    {
      name: "Lista / X coisas que...",
      structure: [
        "HOOK (1-3s): '5 coisas que eu gostaria de saber antes de...'",
        "ITEM 1 (5s): Mais impactante primeiro",
        "ITEM 2-4 (5s cada): Crescendo de valor",
        "ITEM 5 (5s): Melhor item por último (retenção)",
        "CTA (3s): 'Salva pra não esquecer'",
      ],
    },
    {
      name: "Storytelling / POV",
      structure: [
        "HOOK (1-3s): Situação intrigante ('POV: você descobre que...')",
        "SETUP (5-10s): Contexto rápido",
        "CONFLITO (10-15s): Tensão/problema",
        "RESOLUÇÃO (5-10s): Virada + lição",
        "CTA (3s): 'Já passou por isso? Comenta'",
      ],
    },
    {
      name: "Antes e Depois / Transformação",
      structure: [
        "HOOK (1-3s): Resultado final impactante",
        "ANTES (5-10s): Estado inicial (pior possível)",
        "PROCESSO (10-15s): Montagem rápida da transformação",
        "DEPOIS (5s): Resultado final detalhado",
        "CTA (3s): 'Quer saber como? Segue para mais'",
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL 2: LONG VIDEO (YouTube 8-20+ min)
// ─────────────────────────────────────────────────────────────────────────────

const LONG_VIDEO: ContentSkill = {
  id: "LONG_VIDEO",
  label: "Vídeo Longo",
  icon: "🎬",
  description: "YouTube (8–25 min) — vídeos completos e aprofundados",
  platforms: ["YOUTUBE"],
  phases: [
    {
      id: "IDEA",
      label: "Ideação",
      description: "Definir tema, ângulo e potencial de busca/clique",
      checklist: [
        { label: "Tema validado com volume de busca", tip: "Use vidIQ, TubeBuddy ou Google Trends" },
        { label: "Pesquisa de competição (o que já existe no YouTube?)" },
        { label: "Ângulo diferenciador definido (por que alguém escolheria SEU vídeo?)" },
        { label: "Formato definido (tutorial, análise, ranking, documentário, vlog)" },
        { label: "Rascunho de título com curiosity gap", tip: "O título deve criar uma pergunta na cabeça do espectador" },
        { label: "Duração-alvo definida (8-15 min sweet spot)" },
        { label: "Série ou standalone? Se série, qual o arco?" },
      ],
      tips: [
        "O vídeo começa no título — se o título não gera clique, o conteúdo não importa",
        "Fórmulas de título comprovadas: 'Como X em Y', 'X que Mudou Minha Vida', 'Por que X é Y', número + superlativos",
        "Busque temas com alta demanda e baixa oferta (underserved topics)",
        "Pergunte: 'Eu clicaria neste vídeo?' — se hesitar, reformule",
      ],
      aiPromptContext: "Gere ideias de vídeo longo para YouTube. Cada ideia deve incluir: 3 variações de título otimizado para CTR, ângulo diferenciador, duração sugerida, e keywords principais. Títulos devem criar curiosity gap.",
    },
    {
      id: "RESEARCH",
      label: "Pesquisa",
      description: "Levantar dados, fontes e estrutura do conteúdo",
      checklist: [
        { label: "Fontes de dados coletadas (artigos, estudos, estatísticas)" },
        { label: "Top 5 vídeos do mesmo tema analisados", tip: "O que funcionou? O que faltou? Onde você pode ser melhor?" },
        { label: "Comentários dos vídeos concorrentes lidos", tip: "Goldmine de dúvidas não respondidas" },
        { label: "Outline (esboço) da estrutura do vídeo" },
        { label: "Pontos de retenção mapeados (onde manter atenção?)" },
      ],
      tips: [
        "Leia os 50 comentários mais curtidos em vídeos do mesmo tema — são perguntas não respondidas",
        "Use o 'autocomplete' do YouTube para encontrar sub-tópicos que as pessoas buscam",
        "Estruture o vídeo em capítulos — ajuda SEO e retenção",
        "Identifique o 'valley of death' (minuto 2-4) e planeje algo forte ali",
      ],
      aiPromptContext: "Ajude a pesquisar e estruturar o conteúdo deste vídeo longo. Sugira: outline com capítulos, pontos de dados interessantes, perguntas que o público pode ter, e onde colocar ganchos de retenção (open loops).",
    },
    {
      id: "SCRIPT",
      label: "Roteiro",
      description: "Escrever roteiro completo com ganchos de retenção",
      checklist: [
        { label: "Intro/Hook (0-30s): Promessa clara + preview do valor", tip: "Nos primeiros 30s declare: o que vão aprender E por que importa" },
        { label: "Open loop criado no início (resolvido só depois)", tip: "'No final eu vou revelar X que mudou tudo...' mantém até o fim" },
        { label: "Capítulos definidos com transições claras" },
        { label: "Pattern interrupt a cada 60-90 segundos", tip: "Mudança visual, B-roll, gráfico, mudança de energia" },
        { label: "Momentos de re-engajamento nos minutos 2-4", tip: "Valley of death — pico de drop-off" },
        { label: "Conclusão com CTA (inscrever, próximo vídeo, playlist)" },
        { label: "End screen planejada (últimos 20s)" },
      ],
      tips: [
        "INTRO: 'Neste vídeo você vai aprender [RESULTADO] que [BENEFÍCIO]. E no final vou mostrar [OPEN LOOP]'",
        "Nunca diga 'antes de começar...' — comece direto no conteúdo",
        "A cada capítulo novo, faça um mini-hook: 'O próximo ponto é o mais importante...'",
        "Use a estrutura PAS em cada seção: Problem → Agitate → Solve",
        "Escreva como fala. Leia em voz alta — se soa robótico, reescreva",
        "Marque no roteiro: [B-ROLL], [GRÁFICO], [CUTAWAY] para guiar a edição",
      ],
      aiPromptContext: "Escreva um roteiro de vídeo longo para YouTube. Estrutura: HOOK (0-30s com promessa e open loop) → CAPÍTULOS (cada um com mini-hook, conteúdo denso, e transição) → CONCLUSÃO (resolver open loop + CTA). Marque [B-ROLL], [GRÁFICO], [CORTE] para edição. Tom conversacional, cada parágrafo com propósito claro.",
    },
    {
      id: "RECORDING",
      label: "Gravação",
      description: "Gravar com qualidade profissional",
      checklist: [
        { label: "Câmera configurada (mín. 1080p, ideal 4K)" },
        { label: "Áudio com microfone dedicado (lapela ou shotgun)", tip: "Áudio > vídeo em importância. Invista aqui primeiro" },
        { label: "Iluminação 3-point ou ring light + preenchimento" },
        { label: "Cenário organizado e coerente com a marca" },
        { label: "Teleprompter ou notas de apoio preparados" },
        { label: "Energia alta na intro (primeiros 30s)" },
        { label: "B-roll gravado para cobrir cortes" },
      ],
      tips: [
        "Grave a intro por último — quando está mais aquecido e confiante",
        "Faça pausas curtas entre seções (facilita edição)",
        "Varie a energia: seções sérias vs entusiastas mantêm interesse",
        "Grave 2-3 versões do hook — escolha o melhor na edição",
        "Eye contact com a câmera é obrigatório — cole um adesivo ao lado da lente",
      ],
      aiPromptContext: "Sugira direções de gravação para este vídeo longo: setup de câmera, dicas de enquadramento, momentos que precisam de mais energia, sugestões de B-roll, e como manter naturalidade em gravações longas.",
    },
    {
      id: "EDITING",
      label: "Edição",
      description: "Editar mantendo ritmo e retenção alta",
      checklist: [
        { label: "Cortes de silêncio e 'uhms' removidos" },
        { label: "Pattern interrupts visuais a cada 30-60s", tip: "B-roll, zoom, lower thirds, gráficos" },
        { label: "Música de fundo (baixa, ambiente, muda por seção)" },
        { label: "Capítulos/timestamps adicionados", tip: "Capítulos melhoram SEO e experiência" },
        { label: "Lower thirds e gráficos informativos" },
        { label: "Cards internos apontando para vídeos relacionados" },
        { label: "End screen com vídeo sugerido (últimos 20s)" },
        { label: "Exportação em alta qualidade (1080p mín, bitrate alto)" },
      ],
      tips: [
        "A regra dos 8 segundos: nenhum plano deve durar mais de 8s sem corte ou elemento visual novo",
        "Use J-cuts e L-cuts para transições suaves entre seções",
        "Adicione SFX sutis em transições de capítulo",
        "O ritmo de edição deve acelerar gradualmente ao longo do vídeo",
        "Color grade consistente = profissionalismo",
      ],
      aiPromptContext: "Sugira plano de edição para este vídeo longo: pontos de corte, onde inserir B-roll/gráficos, sugestão de música por seção, timestamps de capítulos, e elementos visuais que aumentam retenção.",
    },
    {
      id: "THUMBNAIL",
      label: "Thumbnail & Título",
      description: "Criar thumbnail e título otimizados para CTR",
      checklist: [
        { label: "3+ variações de thumbnail criadas", tip: "A/B test se possível" },
        { label: "Rosto com expressão forte (surpresa, empolgação, choque)", tip: "Thumbnails com rosto têm 30% mais cliques" },
        { label: "Texto grande e legível (3-5 palavras máximo)" },
        { label: "Contraste alto de cores (destaca no feed)" },
        { label: "Título final com < 60 caracteres", tip: "Títulos cortam em mobile após ~50 chars" },
        { label: "Título cria curiosity gap (promete sem revelar)" },
        { label: "Título + Thumbnail contam histórias complementares (não repetitivas)" },
      ],
      tips: [
        "TÍTULO e THUMBNAIL são 80% do sucesso — gaste tempo aqui",
        "Teste a thumbnail: reduza a 20% do tamanho — ainda comunica?",
        "Cores quentes (amarelo, vermelho) performam melhor em thumbnails",
        "Nunca coloque o mesmo texto no título e na thumbnail",
        "Fórmulas: Número + Adjetivo + Keyword + Promessa ('7 Erros FATAIS que Destroem Seu...'')",
        "CTR alvo: 8-12% bom, > 15% excelente",
      ],
      aiPromptContext: "Gere opções de título e descrição de thumbnail para este vídeo. Títulos: 5 variações com curiosity gap, < 60 chars. Thumbnails: descreva composição visual (expressão facial, cores, texto overlay, elementos) para 3 variações. Título e thumbnail devem ser complementares, não repetitivos.",
    },
    {
      id: "REVIEW",
      label: "Revisão",
      description: "Checagem final de qualidade",
      checklist: [
        { label: "Assistiu o vídeo inteiro como espectador" },
        { label: "Intro mantém atenção nos primeiros 30s?" },
        { label: "Há valleys (trechos chatos)? Se sim, cortar ou adicionar elemento" },
        { label: "Descrição otimizada com keywords" },
        { label: "Tags adicionadas (15-25 relevantes)" },
        { label: "Legenda/subtitle verificada" },
        { label: "Cards e end screens configurados" },
      ],
      tips: [
        "Se você pular algum trecho assistindo, o espectador também vai",
        "A descrição deve ter a keyword principal nas primeiras 2 linhas",
        "Adicione timestamps na descrição = capítulos automáticos",
      ],
      aiPromptContext: "Revise este conteúdo de vídeo longo: a intro é forte? Há pontos de queda de atenção? O título gera clique? Sugira melhorias na descrição e tags para SEO.",
    },
    {
      id: "SCHEDULED",
      label: "Agendamento",
      description: "Agendar publicação estrategicamente",
      checklist: [
        { label: "Horário de publicação otimizado", tip: "2-3h antes do pico do público (17h-20h geralmente)" },
        { label: "Community tab/stories anunciando" },
        { label: "Notificação de engajamento ativo nas primeiras 2h" },
      ],
      tips: [
        "As primeiras 2 horas são críticas — responda todos os comentários",
        "Publique de terça a quinta para melhor performance inicial",
        "Use premieres para criar evento e gerar buzz",
      ],
      aiPromptContext: "Sugira estratégia de lançamento: copy para community tab, horário ideal, ações de engajamento nas primeiras horas, e descrição otimizada para SEO.",
    },
    {
      id: "PUBLISHED",
      label: "Publicado",
      description: "Monitorar e iterar",
      checklist: [
        { label: "Métricas de 48h documentadas (CTR, AVD, retenção)" },
        { label: "Gráfico de retenção analisado (onde caem?)" },
        { label: "Comentários respondidos" },
        { label: "Lições para próximo vídeo anotadas" },
      ],
      tips: [
        "CTR > 10% + AVD > 50% = algoritmo vai empurrar forte",
        "Analise o gráfico de retenção: cada queda é uma lição",
        "Se CTR alto + AVD baixa = thumbnail/título bons mas conteúdo decepcionou",
        "Se CTR baixo + AVD alta = conteúdo bom mas título/thumb fracos",
      ],
      aiPromptContext: "Analise as métricas deste vídeo e sugira: diagnóstico de performance (CTR vs AVD), o que melhorar, e se vale criar vídeo complementar ou atualização.",
    },
  ],
  bestPractices: [
    "80% do sucesso é título + thumbnail. Invista tempo desproporcional nisso",
    "Os primeiros 30 segundos decidem se o espectador fica ou sai",
    "Use open loops para manter retenção ('Vou revelar no final...')",
    "Capítulos melhoram SEO e UX — sempre adicione",
    "Consistência de publicação (1-2x/semana) > viralidade esporádica",
    "Estude seu gráfico de retenção — é o feedback mais valioso",
    "Responda comentários nas primeiras 2h — impulsiona algoritmo",
    "Faça vídeos em séries/playlists — aumenta session time",
  ],
  commonMistakes: [
    "Intro longa com logos, jingles, 'fala galera' antes do conteúdo",
    "Título genérico sem curiosity gap",
    "Thumbnail com texto pequeno demais ou sem rosto",
    "Não analisar gráfico de retenção para iterar",
    "Espaçar publicações demais (inconsistência)",
    "Pedir para inscrever antes de entregar valor",
    "Não usar capítulos/timestamps na descrição",
    "Mesma energia do início ao fim (sem variação)",
  ],
  kpis: [
    { label: "CTR (Click-Through Rate)", target: "8-12%", why: "Mede eficácia do título + thumbnail em gerar cliques" },
    { label: "AVD (Average View Duration)", target: "> 50% do vídeo", why: "Sinal #1 de qualidade para o algoritmo" },
    { label: "Retenção no primeiro minuto", target: "> 70%", why: "Se perder 30% logo, dificilmente recupera" },
    { label: "Impressions → Views", target: "Crescimento mensal", why: "Indica que o algoritmo está expandindo alcance" },
    { label: "Inscritos por vídeo", target: "> 1-2% dos views", why: "Mede conversão em audiência recorrente" },
  ],
  scriptTemplates: [
    {
      name: "Tutorial / How-To",
      structure: [
        "HOOK (0-30s): Mostrar resultado final + promessa ('Ao final deste vídeo você vai saber fazer X')",
        "CONTEXTO (30s-1min): Por que isso importa + open loop",
        "PASSO 1-N (corpo): Cada passo com mini-hook + demonstração + dica pro",
        "BÔNUS (pré-conclusão): Dica extra que ninguém ensina",
        "CONCLUSÃO: Recapitular + resolver open loop + CTA",
      ],
    },
    {
      name: "Análise / Essay",
      structure: [
        "HOOK (0-30s): Tese controversa ou surpreendente",
        "SETUP (1-3min): Contextualizar o tema, dados de apoio",
        "ARGUMENTO 1-3: Cada um com evidência + storytelling",
        "PLOT TWIST: Virada ou perspectiva inesperada",
        "CONCLUSÃO: Síntese + reflexão + CTA",
      ],
    },
    {
      name: "Ranking / Listicle",
      structure: [
        "HOOK (0-30s): Teaser do #1 + por que a lista importa",
        "ITEM N → 2: Do menos ao mais impactante (crescendo)",
        "PRÉ-#1: Build up de anticipação ('E o número 1...')",
        "#1: O melhor item com explicação detalhada",
        "MENÇÃO HONROSA (pós-conclusão): Bônus inesperado + CTA",
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// SKILL 3: INSTAGRAM (Carrosséis, Reels, Stories, Feed)
// ─────────────────────────────────────────────────────────────────────────────

const INSTAGRAM: ContentSkill = {
  id: "INSTAGRAM",
  label: "Instagram",
  icon: "📸",
  description: "Carrosséis, Reels, Stories e Posts estáticos",
  platforms: ["INSTAGRAM"],
  phases: [
    {
      id: "IDEA",
      label: "Ideação",
      description: "Definir formato, ângulo e mensagem",
      checklist: [
        { label: "Formato definido (Carrossel, Reel, Post estático, Story)", tip: "Carrosséis têm 2-3x mais alcance que posts estáticos em 2025" },
        { label: "Pilar de conteúdo identificado (educar, entreter, inspirar, vender)" },
        { label: "Hook visual ou textual definido" },
        { label: "Objetivo do post (alcance, engajamento, conversão, DM)" },
        { label: "CTA planejado (salvar, compartilhar, comentar, link)" },
      ],
      tips: [
        "Ranking de alcance em 2025: Reels > Carrosséis > Stories > Posts estáticos",
        "Carrosséis educacionais são o formato mais consistente em engajamento",
        "Misture pilares: 40% valor/educação, 30% entretenimento, 20% inspiração, 10% venda",
        "O Instagram prioriza Saves e Shares sobre Likes — crie conteúdo 'salvável'",
      ],
      aiPromptContext: "Gere ideias de conteúdo para Instagram. Para cada ideia inclua: formato (Carrossel/Reel/Story), hook, estrutura, CTA, e por que esse formato é o ideal para essa mensagem. Foque em formatos que geram saves e shares.",
    },
    {
      id: "SCRIPT",
      label: "Copywriting",
      description: "Escrever copy, slides ou roteiro do conteúdo",
      checklist: [
        { label: "Hook no primeiro slide/frame (parar o scroll)", tip: "Primeira linha da caption e primeiro slide são TUDO" },
        { label: "Conteúdo de valor em cada slide/seção" },
        { label: "CTA no último slide/final da caption" },
        { label: "Caption escrita com hook na primeira linha", tip: "Apenas as 2 primeiras linhas aparecem antes do 'mais'" },
        { label: "Hashtags pesquisadas (5-15, relevantes ao nicho)", tip: "Mix: 5 grandes + 5 médias + 5 nicho" },
      ],
      tips: [
        "CARROSSEL: 7-10 slides ideal. Slide 1 = hook visual. Slide 2 = contexto/problema. Slides 3-8 = conteúdo. Slide 9 = recap. Slide 10 = CTA",
        "HOOKS DE CAPTION: 'Pare de fazer X se quer Y', 'O que ninguém te conta sobre X', 'Salva esse post se você...'",
        "Use line breaks na caption — blocos de texto denso = skip",
        "CTA patterns: 'Salva pra depois', 'Marca quem precisa ver', 'Manda nos stories', 'Link na bio'",
        "REEL caption: curta (1-2 linhas) + hashtags. A mensagem vai no vídeo",
        "Emojis com moderação — 1-2 por parágrafo, não em cada frase",
      ],
      aiPromptContext: "Escreva o conteúdo para este post de Instagram. Se carrossel: texto de cada slide + caption. Se Reel: roteiro + caption curta. Se post: caption completa. Inclua hook forte na primeira linha, CTAs de save/share, e sugira 10 hashtags relevantes (mix de tamanhos).",
    },
    {
      id: "RECORDING",
      label: "Design / Gravação",
      description: "Criar os visuais ou gravar o conteúdo",
      checklist: [
        { label: "Identidade visual consistente (cores, fontes, estilo)", tip: "Templates reutilizáveis economizam 80% do tempo" },
        { label: "Formato correto: Feed 1:1 ou 4:5, Reels 9:16, Stories 9:16" },
        { label: "Texto legível em tela de celular (tamanho mínimo 24pt)" },
        { label: "Contraste alto entre texto e fundo" },
        { label: "Imagens de alta qualidade (sem pixelização)" },
        { label: "Se Reel: mesmas dicas de vídeo curto aplicam" },
      ],
      tips: [
        "Crie 3-5 templates de carrossel reutilizáveis (Canva, Figma)",
        "Feed 4:5 (1080x1350) ocupa mais espaço no feed = mais atenção",
        "Mantenha no máximo 2 fontes e 3 cores da marca por post",
        "O primeiro slide do carrossel é sua 'thumbnail' — tratamento premium",
        "Rostos humanos geram 38% mais engajamento que gráficos puros",
      ],
      aiPromptContext: "Sugira direções visuais para este conteúdo de Instagram: estilo do design, cores, layout dos slides, elementos visuais, e composição da imagem/vídeo.",
    },
    {
      id: "REVIEW",
      label: "Revisão",
      description: "Revisar visual, copy e experiência completa",
      checklist: [
        { label: "Swipou pelo carrossel/assistiu o Reel como espectador" },
        { label: "Hook do primeiro slide/frame para o scroll?" },
        { label: "Texto sem erros e tom adequado?" },
        { label: "CTA claro e natural?" },
        { label: "Hashtags relevantes e não banidas?" },
        { label: "Alt text adicionado (acessibilidade + SEO)" },
        { label: "Preview do grid: combina com posts anteriores?" },
      ],
      tips: [
        "Teste em tela de celular real — 95% do consumo é mobile",
        "Verifique se todas hashtags são permitidas (hashtags banidas = shadowban)",
        "A primeira impressão no grid importa — zoom out e veja o conjunto",
      ],
      aiPromptContext: "Revise este conteúdo de Instagram e dê feedback: o hook é forte? A copy é engajante? O CTA é efetivo? Sugira melhorias na caption, hashtags e visual.",
    },
    {
      id: "SCHEDULED",
      label: "Agendamento",
      description: "Agendar para o melhor horário com estratégia",
      checklist: [
        { label: "Horário de pico do público (ver Insights)", tip: "Geralmente 12h-14h e 18h-21h performam melhor" },
        { label: "Story de antecipação agendada (teaser)" },
        { label: "Plano de engajamento: responder comentários nos primeiros 30min" },
        { label: "Story de repost após publicar (amplifica alcance)" },
      ],
      tips: [
        "Os primeiros 30 minutos são cruciais — engajamento rápido = Explore page",
        "Poste um Story apontando pro post novo (arrasta pra ver)",
        "Frequência ideal: 3-5 posts/semana + Stories diários",
        "Responda TODOS os comentários — especialmente os longos (algoritmo pesa)",
      ],
      aiPromptContext: "Sugira estratégia de publicação para este conteúdo de Instagram: horário, copy do story de divulgação, plano de engajamento pós-publicação, e sequência de stories complementares.",
    },
    {
      id: "PUBLISHED",
      label: "Publicado",
      description: "Monitorar métricas e aprender",
      checklist: [
        { label: "Métricas de 24h documentadas (alcance, saves, shares)" },
        { label: "Comentários respondidos" },
        { label: "Post fixado se teve alta performance" },
        { label: "Lições anotadas para próximos posts" },
      ],
      tips: [
        "Saves > Shares > Comments > Likes (em ordem de valor algorítmico)",
        "Se um carrossel performou bem, faça uma 'parte 2'",
        "Use Insights para mapear horários e formatos que funcionam para SEU público",
        "Repost conteúdo top nos Stories a cada 3-4 semanas (recicle)",
      ],
      aiPromptContext: "Analise as métricas deste post de Instagram e sugira: o que contribuiu para a performance, o que melhorar, e se vale reciclar/expandir este conteúdo.",
    },
  ],
  bestPractices: [
    "Carrosséis educacionais são o rei do engajamento — priorizem",
    "Saves e Shares valem 5-10x mais que Likes para o algoritmo",
    "Consistência visual (brand templates) = reconhecimento instantâneo no feed",
    "Stories diários mantêm você no topo do feed (story ring)",
    "Responda comments com perguntas — gera mais replies = mais engajamento",
    "Caption com hook forte na 1ª linha (antes do '...mais')",
    "Hashtags relevantes e específicas > hashtags genéricas com milhões de posts",
    "Recicle top performers: transforme carrossel em Reel e vice-versa",
    "Poste quando SEU público está online (veja Instagram Insights)",
    "Use stickers interativos nos Stories (enquete, quiz, slider) — boost de 15-20% no alcance",
  ],
  commonMistakes: [
    "Texto muito pequeno no carrossel (ilegível no celular)",
    "Postar sem caption ou com caption genérica",
    "Hashtags banidas ou 100% genéricas (#love #happy)",
    "Inconsistência visual no grid (parece conta abandonada)",
    "Focar em likes em vez de saves e shares",
    "Não usar Stories (perde visibilidade no topo do feed)",
    "Repostar Reel com marca d'água do TikTok (penalizado)",
    "Caption que não tem hook na primeira linha",
    "Não responder comentários (mata engajamento)",
    "Postar mais de 30 hashtags (spam signal)",
  ],
  kpis: [
    { label: "Alcance / Impressões", target: "Crescimento mensal", why: "Mede visibilidade do conteúdo" },
    { label: "Taxa de Saves", target: "> 3% dos alcance", why: "Sinal #1 de conteúdo valioso para o algoritmo" },
    { label: "Taxa de Shares", target: "> 1% do alcance", why: "Impulsiona distribuição para novos públicos" },
    { label: "Engagement Rate", target: "> 3-6%", why: "Media ponderada de todas interações / followers" },
    { label: "Story Completion Rate", target: "> 70%", why: "Mede se seus stories mantêm atenção" },
    { label: "Profile Visits → Follows", target: "> 10%", why: "Mede conversão de curiosos em seguidores" },
  ],
  scriptTemplates: [
    {
      name: "Carrossel Educacional",
      structure: [
        "SLIDE 1 (Hook): Título impactante + subtítulo contextualizando",
        "SLIDE 2: O problema / por que isso importa",
        "SLIDES 3-8: Uma dica/ponto por slide (visual + texto curto)",
        "SLIDE 9: Recap / resumo visual",
        "SLIDE 10: CTA ('Salva pra depois' + 'Segue pra mais')",
      ],
    },
    {
      name: "Carrossel Storytelling",
      structure: [
        "SLIDE 1 (Hook): Situação intrigante ou resultado",
        "SLIDE 2-3: Setup / contexto",
        "SLIDE 4-6: Desenvolvimento / conflito",
        "SLIDE 7-8: Virada / resolução",
        "SLIDE 9: Lição aprendida",
        "SLIDE 10: CTA + pergunta para comentários",
      ],
    },
    {
      name: "Reel Instagram",
      structure: [
        "HOOK (1-3s): Texto bold + frase impactante",
        "CONTEÚDO (15-30s): Mesma estrutura de vídeo curto",
        "CTA (3s): Pedir save/follow",
        "CAPTION: 1-2 linhas + hashtags",
      ],
    },
    {
      name: "Story Sequence (Engajamento)",
      structure: [
        "STORY 1: Pergunta ou enquete (aquecer)",
        "STORY 2: Contexto / problema",
        "STORY 3-5: Conteúdo / dicas",
        "STORY 6: Slider de reação ou quiz",
        "STORY 7: CTA (link, DM, ver post novo)",
      ],
    },
  ],
}

// ─────────────────────────────────────────────────────────────────────────────
// Export
// ─────────────────────────────────────────────────────────────────────────────

export const CONTENT_SKILLS: Record<SkillId, ContentSkill> = {
  SHORT_VIDEO,
  LONG_VIDEO,
  INSTAGRAM,
}

export const SKILL_LIST = [SHORT_VIDEO, LONG_VIDEO, INSTAGRAM]
