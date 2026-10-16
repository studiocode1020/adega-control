-- Botão "Passar vinhos" do painel /clientes: move a adega inteira (vinhos,
-- movimentações, posições e lista de desejos) de uma conta para outra, tudo
-- ou nada. Só a rota de admin (secret key, papel service_role) pode chamar.
--
-- Rodar uma vez no SQL Editor do Supabase.

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
