# Adega Control - Contexto para Claude

Leia este documento E o `docs/PROJETO.md` para entender completamente o projeto antes de fazer qualquer alteração.

## Comandos

```bash
npm run dev          # Dev server em localhost:3000
npm run build        # Build de produção
npx vercel --prod --yes --scope studiocode1020-3488s-projects  # Deploy na Vercel
```

## Stack

- Next.js 16 (App Router) + TypeScript + TailwindCSS v4
- shadcn/ui baseado em **base-ui** (NÃO radix) - `Select` onValueChange passa `string | null`, `Button` NÃO tem `asChild`, Tooltip usa `render` prop
- localStorage para persistência (sem backend no MVP)
- Recharts para gráficos
- Deploy na Vercel: https://adega-control.vercel.app
- Repo: https://github.com/studiocode1020/adega-control

## Regras Importantes

- Tema escuro fixo (sem toggle light/dark) - cores de vinho (bordô #722F37, dourado #C9A84C, background #0f0a0a)
- Fonte Playfair Display para títulos, Inter para corpo e valores numéricos
- Público-alvo: dono de adega PESSOAL (colecionador), não apenas comercial
- Sempre pensar mobile-first - app será usado no celular dentro da adega
- Dados mockados realistas com vinhos brasileiros, portugueses, argentinos, chilenos, franceses, italianos
- Versão inicial do `localStorage` usa key `adega-initialized-v2` - ao mudar estrutura de dados, incrementar versão
