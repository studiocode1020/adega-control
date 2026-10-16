import type { NextRequest } from 'next/server';
import { adminClient, exigirAdmin } from '@/lib/supabase/admin';

// Passa a adega inteira da conta [id] para a conta "para" (que precisa estar vazia).
// O trabalho é da função transferir_adega (migration 0003), que faz tudo ou nada.
export async function POST(request: NextRequest, ctx: RouteContext<'/api/admin/clientes/[id]/transferir'>) {
  const erro = await exigirAdmin();
  if (erro) return erro;

  const { id } = await ctx.params;
  const { para } = await request.json().catch(() => ({ para: '' }));
  if (!para) return Response.json({ erro: 'Escolha a conta de destino.' }, { status: 400 });

  const { data, error } = await adminClient().rpc('transferir_adega', { de: id, para });
  if (error) {
    const faltaMigration = error.code === 'PGRST202' || /transferir_adega/.test(error.message);
    const msg = faltaMigration ? 'Rode a migration 0003_transferir_adega.sql no SQL Editor do Supabase.' : error.message;
    return Response.json({ erro: msg }, { status: faltaMigration ? 500 : 400 });
  }
  return Response.json({ vinhos: data as number });
}
