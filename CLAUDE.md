# Adega Control - Contexto para Claude

@AGENTS.md

Leia este documento E o `docs/PROJETO.md` para entender completamente o projeto antes de fazer qualquer alteração.

## Comandos

```bash
npm run dev          # Dev server em localhost:3000
npm run build        # Build de produção
git push origin master  # Deploy automático na Vercel via push
```

## Stack

- Next.js 16 (App Router) + TypeScript + TailwindCSS v4
- shadcn/ui baseado em **base-ui** (NÃO radix) - `Select` onValueChange passa `string | null`, `Button` NÃO tem `asChild`, Tooltip usa `render` prop
- **BUG SelectValue**: usar `<span>` manual dentro de `SelectTrigger` em vez de `<SelectValue>` — base-ui exibe value raw em vez do label
- **Supabase** (Postgres + Auth) para persistência - ver `docs/PROJETO.md` seção 7.2. Estrutura em `supabase/migrations/`, RLS por `owner_id`
- Recharts para gráficos
- Deploy na Vercel: https://adega-control.vercel.app
- Repo: https://github.com/studiocode1020/adega-control

## Navegação

- **NÃO usa sidebar** - navegação por **bottom tab bar** (estilo app mobile)
- 5 tabs: Início, Vinhos, (+) Ação Rápida, Adega, Menu
- Tab "+" (center FAB): abre sheet com Entrada, Saída, Cadastrar Vinho, Scan
- Tab "Menu": abre sheet com todas as demais páginas organizadas por categoria
- Header de app: logo+título na home, título da página nas demais, sininho de notificações à direita
- Componentes: `bottom-nav.tsx` (navegação), `header.tsx` (header de app)

## Sistema de Cores

- **NUNCA usar hex hardcoded ou cores Tailwind default (red-500, green-600, etc.) para cores do app**
- Todas as cores de tipo de vinho saem de `src/lib/colors.ts`: `WINE_TYPE_BADGE` (badges — usar apenas em dialogs/detalhes, NÃO em listas), `WINE_TYPE_SLOT` (adega grid), `WINE_TYPE_HEX` (Recharts)
- **Listas/cards de vinhos**: tipo de vinho como texto neutro (`text-muted-foreground`), NÃO badge colorido — evita poluição visual no mobile
- Cores semânticas para Recharts: usar `SEMANTIC_HEX` e `CHART_STYLE` de `src/lib/colors.ts`
- Tokens CSS em `globals.css`: `wine`, `wine-light`, `gold`, `gold-light`, `success`, `success-light`, `destructive`, `warning`, `info`, `type-tinto`, `type-branco`, `type-rose`, `type-espumante`, `type-sobremesa`, `type-fortificado`, `chart-axis`
- Tema escuro fixo (sem toggle light/dark) - background #0f0a0a
- Entrada/positivo = `success` | Saída/negativo = `destructive` | NUNCA usar green-500 ou red-500

## Regras Importantes

- Fonte Playfair Display para títulos, Inter para corpo e valores numéricos
- Público-alvo: dono de adega PESSOAL (colecionador), não apenas comercial
- **MOBILE-FIRST** - interface de APLICATIVO, não dashboard. Bottom tab bar, cards, botões grandes, touch-friendly
- Dados mockados realistas com vinhos brasileiros, portugueses, argentinos, chilenos, franceses, italianos
- Mudou a estrutura dos dados? Nova migration numerada em `supabase/migrations/` (rodada no SQL Editor) + mapeamento em `src/lib/storage.ts`
- `supabase/import/` tem dados de cliente e está no `.gitignore` - o repo é PÚBLICO, nunca commitar
- Logo personalizada em `public/logo.png` - usar `next/image` para renderizar
- **SEM conceito de localização fixa** - adega usa slots organizados por tipo de vinho
- Campo `location` no modelo Wine é legado e NÃO aparece na UI
- Páginas NÃO repetem títulos h1 — o header de app já mostra o título da página
- Content area tem `pb-24` para dar espaço à bottom nav
