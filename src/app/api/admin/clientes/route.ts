import { adminClient, ehAdmin, exigirAdmin, gerarSenha } from '@/lib/supabase/admin';

export type Cliente = {
  id: string;
  email: string;
  criadoEm: string;
  ultimoLogin: string | null;
  vinhos: number | null;
  garrafas: number | null;
  admin: boolean;
};

export async function GET() {
  const erro = await exigirAdmin();
  if (erro) return erro;

  const supabase = adminClient();
  const { data, error } = await supabase.auth.admin.listUsers({ perPage: 1000 });
  if (error) return Response.json({ erro: error.message }, { status: 500 });

  // Se faltar o GRANT da migration 0002, a lista sai mesmo assim, sem as contagens
  const { data: vinhos, error: erroVinhos } = await supabase.from('wines').select('owner_id, quantity');
  const porDono = new Map<string, { vinhos: number; garrafas: number }>();
  for (const v of vinhos ?? []) {
    const t = porDono.get(v.owner_id) ?? { vinhos: 0, garrafas: 0 };
    t.vinhos += 1;
    t.garrafas += v.quantity;
    porDono.set(v.owner_id, t);
  }

  const clientes: Cliente[] = data.users
    .map((u) => ({
      id: u.id,
      email: u.email ?? '',
      criadoEm: u.created_at,
      ultimoLogin: u.last_sign_in_at ?? null,
      vinhos: erroVinhos ? null : porDono.get(u.id)?.vinhos ?? 0,
      garrafas: erroVinhos ? null : porDono.get(u.id)?.garrafas ?? 0,
      admin: ehAdmin(u.email),
    }))
    .sort((a, b) => a.criadoEm.localeCompare(b.criadoEm));

  return Response.json({ clientes });
}

// Cria a conta de um cliente novo e devolve a senha gerada (mostrada uma vez só)
export async function POST(request: Request) {
  const erro = await exigirAdmin();
  if (erro) return erro;

  const { email } = await request.json().catch(() => ({ email: '' }));
  const limpo = String(email ?? '').trim().toLowerCase();
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(limpo)) {
    return Response.json({ erro: 'E-mail inválido.' }, { status: 400 });
  }

  const senha = gerarSenha();
  const { error } = await adminClient().auth.admin.createUser({
    email: limpo,
    password: senha,
    email_confirm: true,
    user_metadata: { trocar_senha: true }, // no 1º acesso o cliente cria a senha dele
  });
  if (error) {
    const msg = error.code === 'email_exists' ? 'Já existe uma conta com esse e-mail.' : error.message;
    return Response.json({ erro: msg }, { status: 400 });
  }
  return Response.json({ email: limpo, senha });
}
