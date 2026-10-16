-- Painel de clientes (/clientes): a rota de admin usa a secret key (papel
-- service_role) para contar os vinhos de cada conta. Como "expose new tables"
-- está desligado, esse papel também precisa de GRANT explícito.
--
-- Rodar uma vez no SQL Editor do Supabase.

grant select on public.wines to service_role;
