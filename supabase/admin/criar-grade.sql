-- Cria (ou aumenta) a grade da adega de um usuário. Rodar no SQL Editor.
-- Troque o e-mail, as letras das fileiras e o número de colunas.
-- Pode rodar de novo com uma grade maior: os lugares que já existem são mantidos.

insert into public.cellar_slots (owner_id, "row", "column")
select u.id, r, c
from auth.users u,
     unnest(array['A','B','C','D','E','F','G','H']) r,   -- fileiras
     generate_series(1, 12) c                            -- colunas
where u.email = 'EMAIL@DO.USUARIO'
on conflict do nothing;
