-- Estrutura inicial do Adega Control no Supabase.
--
-- Cada linha pertence a um usuário (owner_id) e o RLS garante que ninguém
-- enxerga a adega de outro. O projeto foi criado com "expose new tables"
-- desligado, então os GRANTs abaixo são o que libera o acesso via API.
--
-- Rodar uma vez no SQL Editor do Supabase.

create table public.wines (
  id           text primary key default gen_random_uuid()::text,
  owner_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null,
  year         text not null default '',
  type         text not null default 'Tinto'
               check (type in ('Tinto','Branco','Rosé','Espumante','Sobremesa','Fortificado')),
  country      text not null default '',
  region       text not null default '',
  producer     text not null default '',
  grape        text not null default '',
  price        numeric(12,2) not null default 0,
  quantity     integer not null default 0 check (quantity >= 0),
  min_stock    integer not null default 0,
  image_url    text,
  image_data   text,
  location     text,
  pairing_food text[] not null default '{}',
  description  text,
  -- Dados crus de origem (ex.: planilha importada) que o app não exibe
  source_note  text,
  created_at   timestamptz not null default now()
);

create table public.movements (
  id             text primary key default gen_random_uuid()::text,
  owner_id       uuid not null default auth.uid() references auth.users on delete cascade,
  wine_id        text not null references public.wines on delete cascade,
  type           text not null check (type in ('entrada','saida')),
  quantity       integer not null check (quantity > 0),
  date           date not null,
  reason         text check (reason in ('venda','consumo','perda','devolucao')),
  supplier       text,
  invoice_number text,
  notes          text,
  created_at     timestamptz not null default now()
);

create table public.cellar_slots (
  owner_id uuid not null default auth.uid() references auth.users on delete cascade,
  "row"    text not null,
  "column" integer not null,
  wine_id  text references public.wines on delete set null,
  primary key (owner_id, "row", "column")
);

create table public.wishlist (
  id              text primary key default gen_random_uuid()::text,
  owner_id        uuid not null default auth.uid() references auth.users on delete cascade,
  name            text not null,
  year            text not null default '',
  type            text not null default 'Tinto',
  country         text not null default '',
  region          text not null default '',
  producer        text not null default '',
  grape           text not null default '',
  estimated_price numeric(12,2) not null default 0,
  notes           text,
  priority        text not null default 'media' check (priority in ('alta','media','baixa')),
  purchased       boolean not null default false,
  created_at      timestamptz not null default now()
);

create index on public.wines (owner_id);
create index on public.movements (owner_id);
create index on public.movements (wine_id);
create index on public.wishlist (owner_id);

-- Acesso: só usuários logados, e só às próprias linhas
do $$
declare t text;
begin
  foreach t in array array['wines','movements','cellar_slots','wishlist'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('grant select, insert, update, delete on public.%I to authenticated', t);
    execute format(
      'create policy "dono acessa" on public.%I for all to authenticated
         using (owner_id = (select auth.uid()))
         with check (owner_id = (select auth.uid()))', t);
  end loop;
end $$;
