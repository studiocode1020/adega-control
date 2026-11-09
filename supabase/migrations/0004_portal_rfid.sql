-- Portal RFID: o leitor na porta da adega dá baixa nas garrafas que saem.
--
-- Como funciona (detalhes em docs/PORTAL-RFID.md):
--
--   1. Cada garrafa etiquetada vira uma linha em `bottles`, com o EPC da
--      etiqueta e onde ela está: 'na_adega' ou 'fora'.
--   2. O ESP32 da porta manda cada passagem de etiqueta para
--      /api/portal/leituras. A passagem fica registrada em `portal_reads`.
--   3. O servidor decide o sentido pelo estado da garrafa (estava na adega =>
--      está saindo) e cria um evento PENDENTE em `portal_events`.
--   4. O dono confirma no sininho do app. Só então o estoque muda, pelas
--      funções portal_* abaixo, tudo ou nada.
--
-- `wines.quantity` continua sendo o estoque. As garrafas etiquetadas são um
-- subconjunto dele: um vinho com 6 garrafas pode ter só 2 etiquetadas.
--
-- Só cria coisas novas (e recria transferir_adega para levar as tabelas novas
-- junto). Nada do que já existe é apagado ou alterado.
--
-- Rodar uma vez no SQL Editor do Supabase.

-- ------------------------------------------------------------ tabelas

create table public.bottles (
  id         text primary key default gen_random_uuid()::text,
  owner_id   uuid not null default auth.uid() references auth.users on delete cascade,
  wine_id    text not null references public.wines on delete cascade,
  epc        text not null check (epc ~ '^[0-9A-F]{8,64}$'),
  status     text not null default 'na_adega' check (status in ('na_adega','fora')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  -- a mesma etiqueta não pode estar em duas garrafas da mesma adega
  unique (owner_id, epc)
);

-- O aparelho da porta. Ele se identifica por uma chave; aqui fica só o hash
-- (SHA-256), como uma senha: a chave aparece uma vez, quando é gerada.
create table public.portal_devices (
  id           text primary key default gen_random_uuid()::text,
  owner_id     uuid not null default auth.uid() references auth.users on delete cascade,
  name         text not null default 'Porta da adega',
  token_hash   text not null unique check (token_hash ~ '^[0-9a-f]{64}$'),
  firmware     text,
  last_seen_at timestamptz,
  created_at   timestamptz not null default now()
);

-- Cada passagem que o aparelho viu, crua, com o que o servidor decidiu dela.
-- O par (device_id, sighting_id) é único: o aparelho reenvia o que não teve
-- confirmação de recebimento, e a repetição não pode virar evento duplicado.
create table public.portal_reads (
  id          text primary key default gen_random_uuid()::text,
  owner_id    uuid not null references auth.users on delete cascade,
  device_id   text not null references public.portal_devices on delete cascade,
  sighting_id text not null,
  epc         text not null,
  started_at  timestamptz not null,
  ended_at    timestamptz not null,
  reads       integer not null default 1,
  direction   text check (direction in ('entrada','saida')),
  decision    text,
  created_at  timestamptz not null default now(),
  unique (device_id, sighting_id)
);

-- O que vai para o sininho. Fica pendente até o dono confirmar ou recusar.
create table public.portal_events (
  id          text primary key default gen_random_uuid()::text,
  owner_id    uuid not null references auth.users on delete cascade,
  device_id   text references public.portal_devices on delete set null,
  read_id     text references public.portal_reads on delete set null,
  epc         text not null,
  bottle_id   text references public.bottles on delete set null,
  wine_id     text references public.wines on delete set null,
  kind        text not null check (kind in ('saida','entrada','etiqueta_nova')),
  confidence  text not null default 'media' check (confidence in ('alta','media','baixa')),
  reason      text not null default '',
  detected_at timestamptz not null default now(),
  status      text not null default 'pending' check (status in ('pending','confirmed','rejected')),
  resolved_at timestamptz,
  movement_id text references public.movements on delete set null,
  created_at  timestamptz not null default now()
);

create index on public.bottles (owner_id);
create index on public.bottles (wine_id);
create index on public.portal_devices (owner_id);
create index on public.portal_reads (owner_id, epc, ended_at desc);
create index on public.portal_events (owner_id, status, detected_at desc);
create index on public.portal_events (owner_id, epc, detected_at desc);

-- ------------------------------------------------------------ acesso
--
-- "expose new tables" está desligado: sem GRANT nada aparece na API.
-- O navegador (authenticated) lê tudo que é dele, mas só escreve direto em
-- garrafas (desvincular etiqueta) e aparelhos (gerar/apagar chave). Leituras e
-- eventos só mudam pela rota do aparelho (service_role) e pelas funções abaixo.

alter table public.bottles        enable row level security;
alter table public.portal_devices enable row level security;
alter table public.portal_reads   enable row level security;
alter table public.portal_events  enable row level security;

grant select, insert, update, delete on public.bottles        to authenticated;
grant select, insert, update, delete on public.portal_devices to authenticated;
grant select                         on public.portal_reads   to authenticated;
grant select                         on public.portal_events  to authenticated;

create policy "dono acessa" on public.bottles for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono acessa" on public.portal_devices for all to authenticated
  using (owner_id = (select auth.uid())) with check (owner_id = (select auth.uid()));
create policy "dono le" on public.portal_reads for select to authenticated
  using (owner_id = (select auth.uid()));
create policy "dono le" on public.portal_events for select to authenticated
  using (owner_id = (select auth.uid()));

-- A rota /api/portal/leituras usa a secret key: acha o aparelho pelo hash da
-- chave e grava em nome do dono dele.
grant select, update                 on public.portal_devices to service_role;
grant select                         on public.bottles        to service_role;
grant select, insert, update         on public.portal_reads   to service_role;
grant select, insert                 on public.portal_events  to service_role;

-- O sininho recebe o evento novo na hora, sem recarregar a página
alter publication supabase_realtime add table public.portal_events;

-- ------------------------------------------------------------ funções do sininho
--
-- security definer + conferência explícita do dono: cada função faz várias
-- escritas que precisam acontecer juntas (evento + garrafa + estoque +
-- movimento) e o navegador não tem permissão de escrever nos eventos.

-- Confirma uma saída ou uma volta.
create or replace function public.portal_confirmar(p_event_id text, p_reason text default 'consumo')
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.portal_events;
  gar public.bottles;
  mov_id text;
  hoje date := (now() at time zone 'America/Sao_Paulo')::date;
begin
  select * into ev from public.portal_events
   where id = p_event_id and owner_id = auth.uid()
   for update;
  if not found then raise exception 'Detecção não encontrada.'; end if;
  if ev.status <> 'pending' then raise exception 'Esta detecção já foi resolvida.'; end if;
  if ev.kind = 'etiqueta_nova' then raise exception 'Etiqueta nova se resolve vinculando a um vinho.'; end if;

  select * into gar from public.bottles where id = ev.bottle_id and owner_id = ev.owner_id for update;
  if not found then
    raise exception 'A etiqueta % foi desvinculada do vinho depois desta detecção.', ev.epc;
  end if;

  if ev.kind = 'saida' then
    if p_reason not in ('venda','consumo','perda','devolucao') then
      raise exception 'Motivo de saída inválido.';
    end if;
    update public.bottles set status = 'fora', updated_at = now() where id = gar.id;
    update public.wines set quantity = greatest(quantity - 1, 0) where id = gar.wine_id;
    insert into public.movements (owner_id, wine_id, type, quantity, date, reason, notes)
    values (ev.owner_id, gar.wine_id, 'saida', 1, hoje, p_reason,
            'Portal RFID · etiqueta ' || ev.epc)
    returning id into mov_id;
  else
    update public.bottles set status = 'na_adega', updated_at = now() where id = gar.id;
    update public.wines set quantity = quantity + 1 where id = gar.wine_id;
    insert into public.movements (owner_id, wine_id, type, quantity, date, reason, notes)
    values (ev.owner_id, gar.wine_id, 'entrada', 1, hoje, null,
            'Voltou para a adega · portal RFID · etiqueta ' || ev.epc)
    returning id into mov_id;
  end if;

  update public.portal_events
     set status = 'confirmed', resolved_at = now(), movement_id = mov_id
   where id = ev.id;
  return mov_id;
end;
$$;

-- "Não saiu" / "Não voltou" / "Ignorar etiqueta". Não mexe no estoque.
create or replace function public.portal_recusar(p_event_id text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.portal_events
     set status = 'rejected', resolved_at = now()
   where id = p_event_id and owner_id = auth.uid() and status = 'pending';
  if not found then raise exception 'Detecção não encontrada ou já resolvida.'; end if;
end;
$$;

-- Liga uma etiqueta nova a um vinho.
--   p_nova = false: a garrafa já estava contada no estoque, só ganhou etiqueta
--   p_nova = true : garrafa recém-chegada, soma 1 ao estoque com movimento
create or replace function public.portal_vincular(p_event_id text, p_wine_id text, p_nova boolean default false)
returns text
language plpgsql
security definer
set search_path = ''
as $$
declare
  ev public.portal_events;
  vinho public.wines;
  etiquetadas integer;
  gar_id text;
  mov_id text;
begin
  select * into ev from public.portal_events
   where id = p_event_id and owner_id = auth.uid()
   for update;
  if not found then raise exception 'Detecção não encontrada.'; end if;
  if ev.status <> 'pending' then raise exception 'Esta detecção já foi resolvida.'; end if;
  if ev.kind <> 'etiqueta_nova' then raise exception 'Só etiqueta nova pode ser vinculada.'; end if;

  select * into vinho from public.wines where id = p_wine_id and owner_id = ev.owner_id for update;
  if not found then raise exception 'Vinho não encontrado.'; end if;

  if exists (select 1 from public.bottles where owner_id = ev.owner_id and epc = ev.epc) then
    raise exception 'Esta etiqueta já está ligada a uma garrafa.';
  end if;

  -- Garrafa que já estava no estoque: não pode haver mais etiquetadas na
  -- adega do que garrafas contadas, senão o estoque fica mentindo.
  if not p_nova then
    select count(*) into etiquetadas from public.bottles
     where wine_id = vinho.id and status = 'na_adega';
    if etiquetadas >= vinho.quantity then
      raise exception 'Todas as % garrafa(s) de % já têm etiqueta. Marque como garrafa nova.',
        vinho.quantity, vinho.name;
    end if;
  end if;

  insert into public.bottles (owner_id, wine_id, epc, status)
  values (ev.owner_id, vinho.id, ev.epc, 'na_adega')
  returning id into gar_id;

  if p_nova then
    update public.wines set quantity = quantity + 1 where id = vinho.id;
    insert into public.movements (owner_id, wine_id, type, quantity, date, notes)
    values (ev.owner_id, vinho.id, 'entrada', 1, (now() at time zone 'America/Sao_Paulo')::date,
            'Garrafa nova etiquetada · portal RFID · etiqueta ' || ev.epc)
    returning id into mov_id;
  end if;

  -- a mesma etiqueta pode ter gerado mais de um aviso antes de ser vinculada
  update public.portal_events
     set status = 'confirmed', resolved_at = now(), bottle_id = gar_id,
         wine_id = vinho.id, movement_id = case when id = ev.id then mov_id end
   where owner_id = ev.owner_id and epc = ev.epc and kind = 'etiqueta_nova' and status = 'pending';
  return gar_id;
end;
$$;

revoke execute on function public.portal_confirmar(text, text)         from public, anon;
revoke execute on function public.portal_recusar(text)                 from public, anon;
revoke execute on function public.portal_vincular(text, text, boolean) from public, anon;
grant execute on function public.portal_confirmar(text, text)         to authenticated;
grant execute on function public.portal_recusar(text)                 to authenticated;
grant execute on function public.portal_vincular(text, text, boolean) to authenticated;

-- ------------------------------------------------------------ transferir_adega
--
-- Mesma função da 0003, agora levando garrafas, aparelho e histórico do
-- portal junto. Sem isso, passar a adega deixaria as etiquetas para trás.

create or replace function public.transferir_adega(de uuid, para uuid)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  n integer;
begin
  if de = para then
    raise exception 'Origem e destino são a mesma conta.';
  end if;
  if not exists (select 1 from auth.users where id = para) then
    raise exception 'A conta de destino não existe.';
  end if;
  if exists (select 1 from public.wines where owner_id = para) then
    raise exception 'A conta de destino já tem vinhos. Nada foi alterado.';
  end if;

  update public.wines     set owner_id = para where owner_id = de;
  get diagnostics n = row_count;
  update public.movements set owner_id = para where owner_id = de;
  update public.wishlist  set owner_id = para where owner_id = de;
  update public.bottles        set owner_id = para where owner_id = de;
  update public.portal_devices set owner_id = para where owner_id = de;
  update public.portal_reads   set owner_id = para where owner_id = de;
  update public.portal_events  set owner_id = para where owner_id = de;
  -- a grade vazia que o destino tiver dá lugar à grade da origem (mesma chave fileira+coluna)
  if exists (select 1 from public.cellar_slots where owner_id = de) then
    delete from public.cellar_slots where owner_id = para;
    update public.cellar_slots set owner_id = para where owner_id = de;
  end if;
  return n;
end;
$$;

revoke execute on function public.transferir_adega(uuid, uuid) from public, anon, authenticated;
grant execute on function public.transferir_adega(uuid, uuid) to service_role;
