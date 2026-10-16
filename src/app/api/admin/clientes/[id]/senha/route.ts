import type { NextRequest } from 'next/server';
import { adminClient, ehAdmin, exigirAdmin, gerarSenha } from '@/lib/supabase/admin';

// Troca a senha do cliente por uma nova gerada aqui. O Supabase só guarda o
// hash, então a senha antiga não tem como ser mostrada: esta é a única saída.
export async function POST(_req: NextRequest, ctx: RouteContext<'/api/admin/clientes/[id]/senha'>) {
  const erro = await exigirAdmin();
  if (erro) return erro;

  const { id } = await ctx.params;
  const supabase = adminClient();
  const { data, error: erroBusca } = await supabase.auth.admin.getUserById(id);
  if (erroBusca || !data.user) return Response.json({ erro: 'Cliente não encontrado.' }, { status: 404 });
  if (ehAdmin(data.user.email)) {
    return Response.json({ erro: 'A senha do administrador não se troca por aqui.' }, { status: 400 });
  }

  const senha = gerarSenha();
  const { error } = await supabase.auth.admin.updateUserById(id, { password: senha });
  if (error) return Response.json({ erro: error.message }, { status: 500 });
  return Response.json({ email: data.user.email, senha });
}
