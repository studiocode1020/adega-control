# Adega Control - Documentacao Completa do Projeto

## 1. Quem Somos

**StudioCode** e uma empresa de tecnologia fundada por **Angelo** e **Matheus**. O email de contato e dev@stepads.com.br. A conta do GitHub e `studiocode1020` e a Vercel esta vinculada ao mesmo perfil.

## 2. Origem do Projeto

Um cliente, dono de uma **adega pessoal de vinhos**, precisava de um sistema para controlar a entrada e saida dos vinhos da sua adega. Ele inicialmente procurou um **professor universitario** para desenvolver o sistema, mas o professor demorou muito para dar retorno.

O professor chegou a produzir um documento tecnico de 29 paginas chamado **"VinMatrix Web Technical Documentation v1.0"** (arquivo `VINMATRIX_WEB_TECHNICAL_DOCUMENTATION-3.pdf` na raiz do diretorio pai). O documento propunha uma plataforma ambiciosa com:

- Frontend Next.js + Backend Bun + PostgreSQL + Prisma
- IA Google Gemini para identificacao de vinhos por foto
- App Mobile React Native com sincronizacao bidirecional
- Google Drive, Google Sheets, Cloudinary, Nodemailer
- Docker, Nginx, GitHub Actions CI/CD

**Problema identificado**: O documento do professor focava em um catalogo inteligente com IA, mas **NAO tinha controle real de entrada e saida de vinhos** - justamente o que o cliente mais precisava. Alem disso, nenhum codigo foi entregue.

## 3. Estrategia da StudioCode

Angelo e Matheus decidiram criar um **MVP visual funcional** para apresentar ao cliente numa reuniao em 28/05/2026, com o objetivo de:

1. Mostrar que ja tinham algo funcional rodando (diferente do professor que so entregou documento)
2. Demonstrar o diferencial: controle real de entrada/saida que o professor nao tinha
3. Impressionar visualmente para fechar contrato
4. Coletar feedback do cliente para direcionar o desenvolvimento real

## 4. Publico-Alvo

**IMPORTANTE**: O sistema NAO e apenas para quem vende vinho comercialmente. O publico principal e uma **pessoa que possui uma adega pessoal** e quer:

- Controlar o que tem na adega
- Saber onde cada garrafa esta
- Registrar quando entra e sai vinho
- Ter funcionalidades interessantes como harmonizacao, degustacao, recomendacoes
- Curtir a experiencia de colecionar

O sistema pode atender perfis comerciais tambem, mas o foco primario e o colecionador/entusiasta.

## 5. O Que Foi Construido (Estado Atual)

### 5.1 Stack Tecnica

| Componente | Tecnologia |
|-----------|------------|
| Framework | Next.js 16.2.6 (App Router) |
| Linguagem | TypeScript |
| Estilizacao | TailwindCSS v4 |
| Componentes UI | shadcn/ui (base-ui, NAO radix) |
| Graficos | Recharts |
| Persistencia | localStorage (MVP) |
| Deploy | Vercel |
| Repositorio | github.com/studiocode1020/adega-control |
| URL producao | https://adega-control.vercel.app |

### 5.2 Tema Visual

- **Escuro elegante** (sem toggle light/dark)
- Cores: bordo `#722F37`, dourado `#C9A84C`, background `#0f0a0a`
- Fonte titulos: Playfair Display
- Fonte corpo: Inter
- Valores numericos (precos, KPIs): fonte Inter (NAO Playfair)

### 5.3 Paginas Implementadas (16 rotas)

#### Grupo: Gestao
| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/login` | Login | Tela visual elegante, sem auth real. Credito "StudioCode" no rodape |
| `/` | Dashboard | 6 KPIs, card de patrimonio da colecao com breakdown por tipo, alertas de estoque baixo, movimentacoes recentes |
| `/vinhos` | Listagem de Vinhos | Tabela com filtros (busca, tipo, pais), badges de status. Click abre dialog com detalhes, harmonizacao, curiosidades IA e foto |
| `/vinhos/novo` | Cadastro de Vinho | Formulario completo com 11+ campos, upload de foto do rotulo (camera no mobile), harmonizacao e descricao |
| `/entradas` | Registro de Entradas | Formulario: vinho, quantidade, data, fornecedor, NF. Atualiza quantidade no localStorage |
| `/saidas` | Registro de Saidas | Formulario: vinho, quantidade, data, motivo (venda/consumo/perda/devolucao). Valida estoque disponivel |
| `/movimentacoes` | Historico | Tabela completa com filtros por tipo, vinho e busca textual. Colunas responsivas |
| `/adega` | Matriz Visual | Grid 8x12 com cores por tipo de vinho, tooltip no hover, click abre detalhes. Stats de ocupacao |
| `/relatorios` | Relatorios | 3 graficos: barras (entradas vs saidas/mes), pizza (estoque por tipo), horizontal (top 10 por valor) |

#### Grupo: Minha Colecao
| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/wishlist` | Lista de Desejos | Cards visuais com prioridade (alta/media/baixa), marcar como comprado, adicionar/remover |
| `/scan` | Scan IA | Upload de foto do rotulo, simulacao de analise por IA com animacao, resultado com 94% confianca |
| `/recomendacoes` | Recomendacoes IA | Perfil de gosto baseado na colecao, 4 sugestoes personalizadas com % compatibilidade |

#### Grupo: Experiencia
| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/acordo-perfeito` | Acordo Perfeito | Digita o prato, IA sugere vinho da adega. Chips rapidos, matching por pairingFood |
| `/degustacao` | Modo Degustacao | 5 etapas guiadas (selecao, visual, olfativo, gustativo, avaliacao), timer, 5 estrelas |
| `/clima` | Clima e Vinho | 4 cards de clima (quente/ameno/frio/especial), sugere vinhos adequados da adega |

### 5.4 Modelo de Dados

```typescript
// Tipos de vinho
type WineType = 'Tinto' | 'Branco' | 'Rose' | 'Espumante' | 'Sobremesa' | 'Fortificado';

// Vinho - entidade principal
interface Wine {
  id: string;
  name: string;
  year: string;
  type: WineType;
  country: string;
  region: string;
  producer: string;
  grape: string;
  price: number;          // em reais (R$)
  quantity: number;
  minStock: number;
  imageUrl: string | null;
  imageData: string | null; // base64 da foto do rotulo
  location: string | null;  // posicao na adega, ex: "A1", "B3"
  pairingFood: string[];    // harmonizacao
  description: string | null;
  createdAt: string;
}

// Movimentacao de estoque
interface Movement {
  id: string;
  wineId: string;
  type: 'entrada' | 'saida';
  quantity: number;
  date: string;
  reason: 'venda' | 'consumo' | 'perda' | 'devolucao' | null; // null para entradas
  supplier: string | null;     // fornecedor (entradas)
  invoiceNumber: string | null; // nota fiscal (entradas)
  notes: string | null;
  createdAt: string;
}

// Posicao na adega (matriz 8x12)
interface CellarPosition {
  row: string;      // A-H
  column: number;   // 1-12
  wineId: string | null;
}

// Wishlist
interface WishlistItem {
  id: string;
  name: string;
  year: string;
  type: WineType;
  country: string;
  region: string;
  producer: string;
  grape: string;
  estimatedPrice: number;
  notes: string | null;
  priority: 'alta' | 'media' | 'baixa';
  purchased: boolean;
  createdAt: string;
}
```

### 5.5 Dados Mockados

- **20 vinhos** realistas de 8 paises (Brasil, Portugal, Argentina, Chile, Franca, Italia, Australia, Nova Zelandia)
- **40 movimentacoes** distribuidas nos ultimos 3 meses (marco, abril, maio 2026)
- **5 itens na wishlist** (Opus One, Sassicaia, Vega Sicilia, Penfolds Grange, Casa Valduga 130)
- **Matriz da adega** 8x12 com ~55% de ocupacao
- **Curiosidades** 3 por vinho, com informacoes reais e interessantes
- **4 vinhos com estoque abaixo do minimo** para demonstrar alertas
- Fornecedores mockados: "Distribuidora Grand Cru", "Wine Imports BR", "Porto Direct", etc.

### 5.6 Estrutura de Pastas

```
src/
├── app/
│   ├── layout.tsx              # Layout raiz (fonts, metadata, Toaster, TooltipProvider)
│   ├── globals.css             # Tema escuro elegante customizado
│   ├── login/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx          # Sidebar + Header
│       ├── page.tsx            # Dashboard
│       ├── vinhos/
│       │   ├── page.tsx        # Listagem
│       │   └── novo/page.tsx   # Cadastro
│       ├── entradas/page.tsx
│       ├── saidas/page.tsx
│       ├── movimentacoes/page.tsx
│       ├── adega/page.tsx      # Matriz visual
│       ├── relatorios/page.tsx
│       ├── wishlist/page.tsx
│       ├── scan/page.tsx
│       ├── recomendacoes/page.tsx
│       ├── acordo-perfeito/page.tsx
│       ├── degustacao/page.tsx
│       └── clima/page.tsx
├── components/
│   ├── layout/
│   │   ├── app-sidebar.tsx     # 3 grupos: Gestao, Minha Colecao, Experiencia
│   │   └── header.tsx
│   └── ui/                     # shadcn/ui (base-ui)
├── data/
│   ├── mock-wines.ts           # 20 vinhos com harmonizacao e descricao
│   ├── mock-movements.ts      # 40 movimentacoes
│   ├── mock-cellar.ts         # Matriz 8x12
│   ├── mock-wishlist.ts       # 5 itens
│   └── mock-curiosities.ts   # 3 curiosidades por vinho
├── hooks/
│   ├── use-wines.ts           # CRUD vinhos (localStorage)
│   ├── use-movements.ts      # CRUD movimentacoes + atualiza quantidade
│   ├── use-cellar.ts         # Gestao da matriz
│   └── use-wishlist.ts       # CRUD wishlist
├── lib/
│   ├── utils.ts              # cn() do shadcn
│   ├── storage.ts            # Wrapper localStorage com inicializacao
│   └── format.ts             # formatCurrency, formatDate, generateId
└── types/
    └── index.ts              # Wine, Movement, CellarPosition, WishlistItem
```

## 6. Detalhes Tecnicos Importantes

### 6.1 shadcn/ui e base-ui

Este projeto usa a versao mais recente do shadcn/ui que e baseada em **base-ui** (NÃO radix). Diferencas criticas:

- `Select` onValueChange: passa `(value: string | null, eventDetails) => void` - SEMPRE guardar null com `(v) => v && setSomething(v)`
- `Button`: NAO tem prop `asChild` - usar `<Link href="..."><Button>...</Button></Link>` em vez de `<Button asChild><Link>...</Link></Button>`
- `Tooltip` TooltipTrigger: NAO tem `asChild` - usar diretamente como wrapper ou usar prop `render`
- `SidebarMenuButton`: usa prop `render={<Link href="..." />}` em vez de `asChild`
- `Dialog` DialogTrigger: usar prop `render` em vez de `asChild`

### 6.2 localStorage

- Chaves: `adega-wines`, `adega-movements`, `adega-cellar`, `adega-wishlist`
- Inicializacao controlada por `adega-initialized-v2`
- Ao mudar estrutura de dados, incrementar versao para forcar re-seed
- Funcao `initializeData()` e chamada automaticamente nos getters
- Checagem `isClient()` para SSR safety

### 6.3 Deploy

```bash
# Vercel CLI
npx vercel --prod --yes --scope studiocode1020-3488s-projects

# Ou via git push (se conectar GitHub na Vercel)
git push origin master
```

## 7. O Que Pode Ser Implementado (Roadmap)

### 7.1 Features Ja Discutidas e Aprovadas como Ideias

| Feature | Descricao | Status |
|---------|-----------|--------|
| Notas de Degustacao | Rating 5 estrelas, aroma/sabor/corpo, diario pessoal | Ideia |
| Janela de Maturidade | Badge "Pronto para beber", "Guarde mais", "Passou do ponto" | Ideia |
| Ocasioes Especiais | Reservar vinhos para datas especificas | Ideia |
| Compartilhar Colecao | Link publico read-only da adega | Ideia |
| Sommelier Virtual | "O que abrir hoje?" baseado em ocasiao | Ideia |
| Mapa de Origens | Mapa visual com pins nos paises dos vinhos | Ideia |
| Comparador de Vinhos | Selecionar 2-3 vinhos e ver lado a lado | Ideia |
| Estatisticas de Consumo | Graficos de consumo, favoritos, gasto mensal | Ideia |
| Tags Personalizadas | Etiquetar vinhos com tags livres | Ideia |
| Historico de Precos | Variacao de preco ao longo do tempo | Ideia |
| Conquistas/Badges | Gamificacao (Explorador, Colecionador, Sommelier) | Ideia |
| Calendario de Vinhos | Timeline visual de entradas/saidas/degustacoes | Ideia |
| Album de Rotulos | Galeria estilo Pinterest das fotos de rotulos | Ideia |
| Sugestao de Presente | IA sugere vinho para levar de presente | Ideia |
| Rota de Vinicolas | Mapa de vinicolas para visitar | Ideia |
| Modo Convidado | Tela simplificada para mostrar no jantar | Ideia |
| Calculadora de Evento | Quantas garrafas para X convidados | Ideia |
| Temperatura Ideal | Info de temperatura de servico por tipo | Ideia |

### 7.2 Evolucao Tecnica para Versao Real

| Item | Descricao |
|------|-----------|
| Backend real | Migrar de localStorage para PostgreSQL/Supabase |
| Autenticacao | Login com email/senha ou Google (NextAuth/Better Auth) |
| Multi-usuario | Cada usuario com sua adega |
| PWA | Service worker para funcionar offline na adega |
| IA real | Integrar Google Gemini para scan de rotulos e curiosidades |
| Notificacoes | Alerta de estoque baixo por email/WhatsApp |
| Exportacao | Download de relatorios em Excel/PDF |
| QR Code | Gerar QR codes por posicao na adega |

## 8. Decisoes de Design Tomadas

1. **Tema escuro obrigatorio**: adegas sao ambientes escuros, tema escuro e mais confortavel de usar la dentro
2. **Mobile-first**: o dono vai usar dentro da adega com o celular na mao
3. **Dados mockados realistas**: vinhos que o cliente reconhece (Miolo, Casa Valduga, Casillero del Diablo...)
4. **Sidebar com 3 grupos**: separa gestao operacional, colecao pessoal e experiencias interativas
5. **Cores de vinho**: bordo para primaria, dourado para destaques, verde para sucesso, vermelho para alertas
6. **IA simulada no MVP**: as features de IA (scan, recomendacoes, curiosidades, acordo perfeito) usam dados mockados. Na versao real, conectar com Gemini/GPT
7. **Font Inter para valores**: valores monetarios e KPIs usam Inter (nao Playfair) para melhor legibilidade de numeros

## 9. Como Continuar o Desenvolvimento

1. Fazer `git pull` para pegar a versao mais recente
2. `npm install` para garantir dependencias
3. `npm run dev` para rodar localmente
4. Testar no navegador em `localhost:3000`
5. Para limpar dados mockados e re-seed: abrir DevTools > Application > Local Storage > limpar tudo e recarregar
6. Sempre testar responsivo (mobile) antes de aprovar
7. Angelo aprova localmente antes de subir para Vercel
8. Deploy: `npx vercel --prod --yes --scope studiocode1020-3488s-projects`
