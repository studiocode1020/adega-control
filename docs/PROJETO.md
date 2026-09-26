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

Angelo e Matheus decidiram criar um **MVP visual funcional** para apresentar ao cliente, com o objetivo de:

1. Mostrar que ja tinham algo funcional rodando (diferente do professor que so entregou documento)
2. Demonstrar o diferencial: controle real de entrada/saida que o professor nao tinha
3. Impressionar visualmente para fechar contrato
4. Coletar feedback do cliente para direcionar o desenvolvimento real

## 4. Publico-Alvo

**IMPORTANTE**: O sistema NAO e apenas para quem vende vinho comercialmente. O publico principal e uma **pessoa que possui uma adega pessoal** e quer:

- Controlar o que tem na adega
- Organizar vinhos por slots na adega
- Registrar quando entra e sai vinho
- Ter funcionalidades interessantes como harmonizacao, degustacao, recomendacoes
- Curtir a experiencia de colecionar

O sistema pode atender perfis comerciais tambem, mas o foco primario e o colecionador/entusiasta.

**MOBILE-FIRST**: O app e projetado prioritariamente para uso no celular, dentro da adega.

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
| Deploy | Vercel (CLI manual) |
| Repositorio | github.com/studiocode1020/adega-control |
| URL producao | https://adega-control.vercel.app |

### 5.2 Tema Visual

- **Escuro elegante** (sem toggle light/dark)
- Cores: bordo `#722F37`, dourado `#C9A84C`, background `#0f0a0a`
- Fonte titulos: Playfair Display
- Fonte corpo: Inter
- Valores numericos (precos, KPIs): fonte Inter (NAO Playfair)
- **Logo personalizada**: garrafa de vinho em mosaico (bordo/dourado) em `public/logo.png`
- **Design mobile-first**: cards em vez de tabelas, botoes grandes, touch-friendly

### 5.3 Paginas Implementadas (16 rotas)

#### Grupo: Gestao
| Rota | Pagina | Descricao |
|------|--------|-----------|
| `/login` | Login | Tela visual elegante com logo, sem auth real. Credito "StudioCode" no rodape |
| `/` | Dashboard | 5 KPIs clicaveis com popup detalhado, card de patrimonio da colecao, alertas de estoque baixo (cards com barra de progresso), movimentacoes recentes (cards timeline) |
| `/vinhos` | Listagem de Vinhos | Cards mobile-friendly com filtros (busca, tipo, pais). Click abre dialog com detalhes, harmonizacao, curiosidades IA e foto |
| `/vinhos/novo` | Cadastro de Vinho | Formulario com campos essenciais, upload de foto do rotulo (camera no mobile), harmonizacao e descricao |
| `/entradas` | Registro de Entradas | Formulario com card de info do vinho selecionado, botao "Cadastrar novo vinho", icone calendario visivel |
| `/saidas` | Registro de Saidas | Formulario com card de info do vinho, motivo (venda/consumo/perda/devolucao), valida estoque disponivel |
| `/movimentacoes` | Historico | Cards timeline com filtros por tipo e vinho. Cards de resumo: Saldo do Periodo, Total Entradas, Total Saidas |
| `/adega` | Mapa da Adega | Grid 8x12 de slots com cores por tipo de vinho, tooltip no hover, click abre detalhes. Stats de ocupacao |
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
| `/clima` | Clima e Vinho | 4 cards de clima (quente/ameno/frio/especial), sugere vinhos compativeis da adega |

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
  location: string | null;  // campo legado, nao mais usado na UI
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

// Slot na adega (grid 8x12)
interface CellarPosition {
  row: string;      // A-H (fileiras)
  column: number;   // 1-12 (slots)
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

// Notificacao do sensor RFID
interface SensorNotification {
  id: string;
  tagId: string;           // ID da tag RFID
  wineId: string | null;   // vinho mapeado (null se tag desconhecida)
  wineName: string | null;
  type: 'entrada' | 'saida';
  quantity: number;         // sempre 1 (deteccao individual)
  detectedAt: string;
  status: 'pending' | 'confirmed' | 'rejected';
  confirmedAt: string | null;
}
```

### 5.5 Dados Mockados

- **20 vinhos** realistas de 8 paises (Brasil, Portugal, Argentina, Chile, Franca, Italia, Australia, Nova Zelandia)
- **40 movimentacoes** distribuidas nos ultimos 3 meses
- **5 itens na wishlist** (Opus One, Sassicaia, Vega Sicilia, Penfolds Grange, Casa Valduga 130)
- **Mapa da adega** 8x12 com ~55% de ocupacao
- **Curiosidades** 3 por vinho, com informacoes reais e interessantes
- **4 vinhos com estoque abaixo do minimo** para demonstrar alertas
- **4 notificacoes do sensor** mockadas (3 vinhos conhecidos + 1 tag desconhecida)
- Fornecedores mockados: "Distribuidora Grand Cru", "Wine Imports BR", "Porto Direct", etc.

### 5.6 Estrutura de Pastas

```
src/
├── app/
│   ├── layout.tsx              # Layout raiz (fonts, metadata, viewport, Toaster)
│   ├── loading.tsx             # Tela de carregamento global com logo
│   ├── globals.css             # Tema escuro elegante customizado
│   ├── login/page.tsx
│   └── (dashboard)/
│       ├── layout.tsx          # Header de app + BottomNav (SEM sidebar)
│       ├── loading.tsx         # Loading interno com logo
│       ├── page.tsx            # Home (dashboard)
│       ├── vinhos/
│       │   ├── page.tsx        # Listagem (cards)
│       │   └── novo/page.tsx   # Cadastro
│       ├── entradas/page.tsx
│       ├── saidas/page.tsx
│       ├── movimentacoes/page.tsx
│       ├── adega/page.tsx      # Mapa de slots
│       ├── relatorios/page.tsx
│       ├── wishlist/page.tsx
│       ├── scan/page.tsx
│       ├── recomendacoes/page.tsx
│       ├── acordo-perfeito/page.tsx
│       ├── degustacao/page.tsx
│       └── clima/page.tsx
├── components/
│   ├── layout/
│   │   ├── bottom-nav.tsx     # Bottom tab bar (5 tabs + sheets)
│   │   ├── header.tsx         # Header de app (titulo + sininho)
│   │   └── app-sidebar.tsx    # Legado (nao utilizado, mantido para referencia)
│   └── ui/                     # shadcn/ui (base-ui)
├── data/
│   ├── mock-wines.ts           # 20 vinhos com harmonizacao e descricao
│   ├── mock-movements.ts      # 40 movimentacoes
│   ├── mock-cellar.ts         # Grid 8x12
│   ├── mock-wishlist.ts       # 5 itens
│   ├── mock-curiosities.ts   # 3 curiosidades por vinho
│   └── mock-notifications.ts # 4 deteccoes RFID simuladas
├── hooks/
│   ├── use-wines.ts           # CRUD vinhos (localStorage)
│   ├── use-movements.ts      # CRUD movimentacoes + atualiza quantidade
│   ├── use-cellar.ts         # Gestao dos slots
│   ├── use-wishlist.ts       # CRUD wishlist
│   └── use-notifications.ts  # Notificacoes do sensor RFID (confirm/reject/addFromSensor)
├── lib/
│   ├── utils.ts              # cn() do shadcn
│   ├── storage.ts            # Wrapper localStorage com inicializacao
│   └── format.ts             # formatCurrency, formatDate, generateId
├── public/
│   └── logo.png              # Logo da aplicacao (garrafa mosaico)
└── types/
    └── index.ts              # Wine, Movement, CellarPosition, WishlistItem
```

## 6. Sistema Embarcado RFID (Em Desenvolvimento)

### 6.1 Visao Geral

A interface web sera conectada a um **sistema embarcado** com sensor RFID que detecta automaticamente a entrada e saida de vinhos na adega. Cada garrafa tera uma **tag RFID** associada.

### 6.2 Fluxo de Funcionamento

1. Sensor RFID detecta uma tag (garrafa entrando ou saindo)
2. Sistema envia notificacao para a plataforma web
3. **Sininho** no header mostra notificacao pendente
4. Usuario abre o painel de notificacoes e ve a deteccao
5. Usuario clica **"Confirmar"** ou **"Rejeitar"**
6. Se confirmado: cria movimentacao, atualiza estoque, adega, relatorios
7. Se rejeitado: descarta a deteccao

### 6.3 O Que Ja Esta Pronto (Frontend)

- **Tipo `SensorNotification`**: com tagId, wineId, status (pending/confirmed/rejected)
- **Hook `useNotifications`**: confirm(), reject(), clearResolved(), **addFromSensor()** - esta ultima sera chamada pela conexao com o sensor
- **Painel do sininho**: Sheet lateral com lista de notificacoes pendentes, botoes confirmar/rejeitar, toast de feedback
- **4 notificacoes mockadas** para demonstracao
- **Ao confirmar**: automaticamente cria Movement e atualiza quantidade do vinho

### 6.4 O Que Falta (Backend/Hardware - Matheus)

- Definir protocolo de comunicacao sensor → web (WebSocket, API REST, MQTT)
- Mapear tags RFID para vinhos no cadastro
- Implementar endpoint/listener que chama `addFromSensor()` quando sensor envia dados
- Leitor RFID FM-50X ja tem ferramentas de bancada em `tools/rfid/`

## 7. Detalhes Tecnicos Importantes

### 7.1 shadcn/ui e base-ui

Este projeto usa a versao mais recente do shadcn/ui que e baseada em **base-ui** (NAO radix). Diferencas criticas:

- `Select` onValueChange: passa `(value: string | null, eventDetails) => void` - SEMPRE guardar null com `(v) => v && setSomething(v)`
- **BUG do SelectValue**: `SelectValue` exibe o `value` raw (ex: "all", "w1") em vez do label. **Workaround**: usar `<span>` manual dentro do `SelectTrigger` em vez de `<SelectValue>`. Exemplo:
  ```jsx
  <SelectTrigger>
    <span className="flex flex-1 text-left truncate text-sm">
      {value === "all" ? "Todos" : displayLabel}
    </span>
  </SelectTrigger>
  ```
- `Button`: NAO tem prop `asChild` - usar `<Link href="..."><Button>...</Button></Link>` em vez de `<Button asChild><Link>...</Link></Button>`
- `Tooltip` TooltipTrigger: NAO tem `asChild` - usar diretamente como wrapper ou usar prop `render`
- `SidebarMenuButton`: usa prop `render={<Link href="..." />}` em vez de `asChild`
- `Dialog` DialogTrigger: usar prop `render` em vez de `asChild`

### 7.2 localStorage

- Chaves: `adega-wines`, `adega-movements`, `adega-cellar`, `adega-wishlist`
- Inicializacao controlada por `adega-initialized-v2`
- Ao mudar estrutura de dados, incrementar versao para forcar re-seed
- Funcao `initializeData()` e chamada automaticamente nos getters
- Checagem `isClient()` para SSR safety

### 7.3 Deploy

```bash
# Vercel CLI (deploy manual - NAO tem auto-deploy via GitHub)
npx vercel --prod --yes --scope studiocode1020-3488s-projects
```

### 7.4 Conceito de Adega

A adega e representada como um **grid de slots** (8 fileiras x 12 slots). Cada slot pode conter um vinho ou estar vazio. Os slots sao organizados por tipo de vinho (cor visual). **NAO existe conceito de "localizacao" fixa** — o campo `location` no modelo Wine e legado e nao aparece na UI.

## 8. O Que Pode Ser Implementado (Roadmap)

### 8.1 Features Ja Discutidas e Aprovadas como Ideias

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

### 8.2 Evolucao Tecnica para Versao Real

| Item | Descricao |
|------|-----------|
| Backend real | Migrar de localStorage para PostgreSQL/Supabase |
| Autenticacao | Login com email/senha ou Google (NextAuth/Better Auth) |
| Multi-usuario | Cada usuario com sua adega |
| PWA | Service worker para funcionar offline na adega |
| IA real | Integrar Google Gemini para scan de rotulos e curiosidades |
| Notificacoes | Alerta de estoque baixo por email/WhatsApp |
| Exportacao | Download de relatorios em Excel/PDF |

## 9. Decisoes de Design Tomadas

1. **Tema escuro obrigatorio**: adegas sao ambientes escuros, tema escuro e mais confortavel de usar la dentro
2. **Mobile-first**: o dono vai usar dentro da adega com o celular na mao — cards em vez de tabelas, botoes grandes, touch targets de no minimo 44px
3. **Cards em vez de tabelas**: todas as listagens (vinhos, movimentacoes, alertas) usam cards para melhor leitura no mobile
4. **KPIs clicaveis**: cada KPI do dashboard abre popup com detalhamento
5. **Dados mockados realistas**: vinhos que o cliente reconhece (Miolo, Casa Valduga, Casillero del Diablo...)
6. **Sidebar com 3 grupos**: separa gestao operacional, colecao pessoal e experiencias interativas
7. **Cores de vinho**: bordo para primaria, dourado para destaques, verde para sucesso, vermelho para alertas
8. **IA simulada no MVP**: as features de IA (scan, recomendacoes, curiosidades, acordo perfeito) usam dados mockados. Na versao real, conectar com Gemini/GPT
9. **Font Inter para valores**: valores monetarios e KPIs usam Inter (nao Playfair) para melhor legibilidade de numeros
10. **Sem localizacao fixa**: a adega usa slots organizados por tipo de vinho, sem conceito de "posicao A1"
11. **Select com span manual**: workaround para bug do base-ui SelectValue que mostra value raw
12. **Bottom tab bar (nao sidebar)**: navegacao por tabs na parte inferior como apps nativos iOS/Android. 5 tabs: Inicio, Vinhos, (+) FAB, Adega, Menu
13. **FAB central (+)**: botao elevado no centro da bottom nav para acoes mais frequentes (entrada, saida, cadastro, scan)
14. **Header de app**: logo + titulo na home, titulo da pagina nas demais. Sem hamburger/sidebar trigger
15. **Paginas sem h1**: titulo ja esta no header de app, paginas so mostram subtitulo/descricao

## 10. Historico de Atualizacoes

| Data | Descricao |
|------|-----------|
| 2026-09-25 | Revisao completa de textos: corrigidos ~50 acentos faltantes, traduzido "Wishlist" para "Lista de Desejos", todos os textos em portugues correto |
| 2026-09-25 | Redesign mobile-first: Dashboard com KPIs clicaveis e cards, Vinhos e Movimentacoes com cards em vez de tabelas, Entradas/Saidas com card de info do vinho e botao cadastro, Degustacao com fix de overflow |
| 2026-09-25 | Logo personalizada adicionada: sidebar, login e telas de loading |
| 2026-09-25 | Removido conceito de localizacao: adega agora usa slots organizados por tipo |
| 2026-09-25 | Fix Select base-ui: todos os selects usam span manual para exibir nomes corretos |
| 2026-09-25 | Otimizacao mobile completa: touch targets 44px, inputs/botoes maiores, dialogs com scroll |
| 2026-09-25 | Textos unicode corrigidos no cadastro (Pais, Regiao, Preco, Minimo), "Safra/Ano" → "Safra" |
| 2026-09-25 | Grids impares: ultimo card ocupa largura total no mobile (Dashboard, Movimentacoes, Relatorios, Wishlist) |
| 2026-09-25 | Sistema de notificacoes RFID: sininho com painel lateral, confirmar/rejeitar deteccoes, hook addFromSensor pronto para integracao |
| 2026-09-25 | Transformacao dashboard → app mobile: sidebar removida, bottom tab bar com FAB central (+), header de app (logo/titulo + sininho), sheets para acoes rapidas e menu completo, meta tags PWA, scrollbar oculta no mobile, safe-area insets, paginas sem headers redundantes, grids otimizados para mobile |

## 11. Como Continuar o Desenvolvimento

1. Fazer `git pull` para pegar a versao mais recente
2. `npm install` para garantir dependencias
3. `npm run dev` para rodar localmente
4. Testar no navegador em `localhost:3000`
5. Para limpar dados mockados e re-seed: abrir DevTools > Application > Local Storage > limpar tudo e recarregar
6. Sempre testar responsivo (mobile) antes de aprovar
7. Angelo aprova localmente antes de subir para Vercel
8. Deploy: `npx vercel --prod --yes --scope studiocode1020-3488s-projects`
