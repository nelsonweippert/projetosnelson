# Viviane Professora

Assistente pedagógico para professora do Ensino Fundamental I (3ª série) no Colégio Porto Seguro — Portinho.

## Skills

O app é organizado em **8 skills**, cada uma cobrindo uma atividade recorrente da rotina docente:

| # | Skill | O que faz |
|---|---|---|
| 1 | **Alunos** | Ficha completa de cada criança (perfil, contato dos pais, pontos fortes, dificuldades) |
| 2 | **Observações diárias** | Diário de bordo rápido — matéria-prima dos relatórios |
| 3 | **Relatórios descritivos** | Parecer bimestral gerado a partir das observações |
| 4 | **Planos de aula** | Planejamento com pesquisa web e citações BNCC |
| 5 | **Atividades** | Banco e gerador de exercícios estruturados |
| 6 | **Comunicação com pais** | Rascunho de bilhete/e-mail/ata |
| 7 | **Correções** | Foto do caderno → feedback sugerido |
| 8 | **Calendário** | Agenda pedagógica (aulas, reuniões, prazos) |

## Recursos da Claude API em uso

- `claude-opus-4-7` como modelo padrão
- **Adaptive thinking** em toda chamada com raciocínio
- **Prompt caching** do perfil do aluno + contexto pedagógico (reutilizável)
- **Structured outputs** com Zod (relatórios, planos, atividades, correções)
- **web_search_20260209** + **web_fetch_20260209** (BNCC, documentos oficiais)
- **Vision** para fotos de caderno; **PDF support** para provas/apostilas
- **Batches API** (50% de desconto) pra gerar lote de relatórios no fim do bimestre
- **trackUsage** model-aware por ação — auditoria de custo

## Setup local

```bash
cp .env.example .env.local
# preencha DATABASE_URL, AUTH_SECRET (openssl rand -base64 32), ANTHROPIC_API_KEY

npm install
npm run db:migrate         # cria DB + gera client Prisma
npm run db:seed            # cria professora demo + 5 alunos
npm run dev                # http://localhost:3011

# login: viviane@example.com / mudar123
```

## Stack

- Next.js 16 (App Router) · React 19 · TypeScript
- Prisma 7 + Postgres
- NextAuth 5 (credentials)
- Tailwind 4 + design system próprio (paleta roxa educacional)
- Anthropic SDK 0.86 + Zod 4

## Estrutura

```
src/
├── app/
│   ├── (auth)/login            — tela de login
│   ├── (school)/               — área autenticada
│   │   ├── page.tsx            — landing com 8 skills
│   │   ├── alunos/             — CRUD completo (referência)
│   │   ├── observacoes/        — scaffold
│   │   ├── relatorios/         — scaffold
│   │   ├── planos-aula/        — scaffold
│   │   ├── atividades/         — scaffold
│   │   ├── comunicacao/        — scaffold
│   │   ├── correcoes/          — scaffold
│   │   └── calendario/         — scaffold
│   ├── actions/                — server actions
│   └── api/                    — REST endpoints
├── components/                 — Sidebar, SkillHeader, ComingSoon
├── config/teaching-skills.ts   — registry das 8 skills
├── lib/                        — auth, db, utils
├── providers/                  — React Query + NextAuth
├── services/ai.service.ts      — todos os helpers Claude (centralizado)
└── types/                      — tipos Prisma re-exportados
```

## Próximas implementações (ordem sugerida de ROI)

1. **Observações diárias** — quick input flutuante em cada ficha de aluno
2. **Relatórios descritivos** — a dor maior; usa observações já coletadas
3. **Correções** — Vision da foto do caderno
4. **Comunicação** — rascunhos rápidos (usa caching do perfil)
5. **Planos de aula** — web_search + BNCC
6. **Atividades** — gerador estruturado
7. **Calendário** — sem IA, só CRUD

Cada skill já tem schema Prisma + página stub + descrição do MVP. É preencher.
