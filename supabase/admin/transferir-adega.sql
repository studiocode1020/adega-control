-- Passa todos os dados de uma conta para outra (ex.: da conta de teste para a
-- conta definitiva do cliente). A conta de destino precisa existir e estar vazia.
-- Rodar no SQL Editor. Troque os dois e-mails.

begin;

create temp table _de on commit drop as select id from auth.users where email = 'EMAIL@DE.ORIGEM';
create temp table _para on commit drop as select id from auth.users where email = 'EMAIL@DE.DESTINO';

do $$ begin
  if (select count(*) from _de) <> 1 or (select count(*) from _para) <> 1 then
    raise exception 'Algum dos e-mails não existe no Supabase.';
  end if;
  if exists (select 1 from public.wines where owner_id = (select id from _para)) then
    raise exception 'A conta de destino já tem vinhos. Nada foi alterado.';
  end if;
end $$;

update public.wines        set owner_id = (select id from _para) where owner_id = (select id from _de);
update public.movements    set owner_id = (select id from _para) where owner_id = (select id from _de);
update public.cellar_slots set owner_id = (select id from _para) where owner_id = (select id from _de);
update public.wishlist     set owner_id = (select id from _para) where owner_id = (select id from _de);

commit;
