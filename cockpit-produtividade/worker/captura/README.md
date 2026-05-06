# Worker — Captura via Telegram

Worker em TypeScript que recebe mensagens (texto + áudio) num bot Telegram, transcreve voz, classifica via LLM e persiste direto no Postgres via Prisma.

Como o app é single-user (NextAuth com 1 dono), o worker confia no `CAPTURE_USER_ID` do `.env.local` e não passa pela API REST. Mais simples e robusto.

## Fluxo

```
Telegram Bot (long-polling) →
  Worker (tsx) →
    Groq Whisper API   (se voz)
    ↓
    Anthropic Claude Haiku 4.5  (Zod-validated structured output)
    ↓
    Prisma direto:
      task           → Task
      event          → CalendarEvent
      study_session  → StudySession (resolve study via fuzzy match)
      ambiguous      → Task com priority LOW pra revisão manual
    ↓
    Reply de confirmação no Telegram
```

## Setup

1. Criar bot via [@BotFather](https://t.me/BotFather) — `/newbot`, copia token
2. Pegar API keys: [Groq](https://console.groq.com/keys), [Anthropic](https://console.anthropic.com/settings/keys)
3. Pegar seu `userId` no Postgres (rodar `npx prisma studio`, abrir tabela `users`, copiar id)
4. Adicionar no `.env.local` na raiz de `cockpit-produtividade/`:
   ```
   # já deve ter:
   DATABASE_URL=postgresql://...

   # adicionar:
   TELEGRAM_BOT_TOKEN=...
   TELEGRAM_OWNER_CHAT_ID=          # opcional — preenche depois (ver passo 6)
   GROQ_API_KEY=...
   ANTHROPIC_API_KEY=...
   CAPTURE_USER_ID=cm_xxx           # cuid do user dono
   CAPTURE_VOCABULARY=               # opcional, separado por vírgula
   ```
5. Rodar:
   ```bash
   npm run worker:captura
   ```
6. Pra descobrir o `TELEGRAM_OWNER_CHAT_ID`: deixa o worker rodando em modo aberto (sem a var), manda `/start` pro bot, vê o log com o `chat.id`. Põe no `.env.local` e reinicia. Sem essa var, o worker aceita mensagens de qualquer chat — inseguro.

## Estrutura

```
worker/captura/
├── README.md            (este)
├── index.ts             (entry: long-polling loop)
├── schema/
│   └── captured-item.ts (Zod discriminated union: task | event | study_session | ambiguous)
├── lib/
│   ├── telegram.ts      (Bot API client: getUpdates, sendMessage, downloadFile)
│   ├── transcribe.ts    (Groq Whisper)
│   ├── classify.ts      (Claude Haiku + tool-based structured output)
│   ├── router.ts        (CapturedItem → Prisma create direto)
│   ├── inbox.ts         (state file pra idempotency)
│   └── db.ts            (Prisma client isolado)
└── data/
    └── inbox.json       (gitignored — runtime state)
```

## Princípios de UX

- **<3s** entre mensagem e confirmação do bot
- **Inbox-first** — bot nunca pergunta "qual área?" no momento; AI sugere e user corrige depois
- **Confirmação visual leve** com tipo + id da entidade criada
- **Idempotency** via `update_id` (evita duplicatas)
- **Stateless por default** — nada de multi-turn

## Mapeamento de tipos

| Tipo CapturedItem | Cria em | Notas |
|---|---|---|
| `task` | `Task` (status TODO) | Resolve `area_hint` por fuzzy match nas Areas do user |
| `event` | `CalendarEvent` (type GENERAL) | `date` ISO obrigatório no schema; sem data, LLM cai pra task |
| `study_session` | `StudySession` + atualiza `Study.doneHours` | `topic_hint` resolve por fuzzy match nos Studies não-COMPLETED |
| `ambiguous` | `Task` (priority LOW, prefixo `[REVISAR]`) | Inclui sugestões e transcrição original na descrição |
