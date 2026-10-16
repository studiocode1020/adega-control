import { randomInt } from 'node:crypto';
import { cookies } from 'next/headers';
import { createClient } from '@supabase/supabase-js';
import { createServerClient } from '@supabase/ssr';

// Só roda no servidor (rotas em src/app/api/admin). A secret key ignora o RLS
// e enxerga todas as contas, por isso nunca pode chegar ao navegador.

export function adminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

// Confere, no servidor do Supabase, se quem chamou está logado com o e-mail de
// administrador (ADMIN_EMAIL). Devolve a resposta de erro, ou null se pode seguir.
export async function exigirAdmin(): Promise<Response | null> {
  const adminEmail = process.env.ADMIN_EMAIL?.trim().toLowerCase();
  if (!adminEmail || !process.env.SUPABASE_SECRET_KEY) {
    return Response.json({ erro: 'Painel de admin não configurado no servidor.' }, { status: 500 });
  }

  const loja = await cookies();
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY!,
    { cookies: { getAll: () => loja.getAll(), setAll: () => {} } },
  );
  const { data } = await supabase.auth.getUser();
  if (!data.user) return Response.json({ erro: 'Entre na sua conta.' }, { status: 401 });
  if (data.user.email?.toLowerCase() !== adminEmail) {
    return Response.json({ erro: 'Acesso só para o administrador.' }, { status: 403 });
  }
  return null;
}

export function ehAdmin(email: string | undefined) {
  return !!email && email.toLowerCase() === process.env.ADMIN_EMAIL?.trim().toLowerCase();
}

// Senha temporária fácil de ditar: sem 0/O, 1/l/I
const LETRAS = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKMNPQRSTUVWXYZ23456789';

export function gerarSenha(tamanho = 10) {
  return Array.from({ length: tamanho }, () => LETRAS[randomInt(LETRAS.length)]).join('');
}
