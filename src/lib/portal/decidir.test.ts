// npm run test:portal
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { decidir, lerCorpo, type Avistamento, type Contexto } from './decidir.ts';

const T0 = 1_800_000_000_000;

function passagem(extra: Partial<Avistamento> = {}): Avistamento {
  return { id: 'a-1', epc: 'E280689400004031C5812D90', inicio: T0, fim: T0 + 2000, leituras: 8, direcao: null, ...extra };
}

const naAdega: Contexto = {
  garrafa: { id: 'g1', wineId: 'w1', status: 'na_adega' },
  pendente: null,
  passagemAnteriorFim: null,
};

test('garrafa que estava na adega e passou pela porta está saindo', () => {
  const d = decidir(passagem(), naAdega);
  assert.equal(d.acao, 'evento');
  assert.ok(d.acao === 'evento' && d.tipo === 'saida' && d.confianca === 'media');
});

test('garrafa que estava fora e passou pela porta está voltando', () => {
  const d = decidir(passagem(), { ...naAdega, garrafa: { id: 'g1', wineId: 'w1', status: 'fora' } });
  assert.ok(d.acao === 'evento' && d.tipo === 'entrada');
});

test('saída ainda não confirmada + nova passagem = voltou, não "saiu de novo"', () => {
  const d = decidir(passagem(), { ...naAdega, pendente: { tipo: 'saida' } });
  assert.ok(d.acao === 'evento' && d.tipo === 'entrada');
  assert.match(d.motivo, /sem confirmar/);
});

test('etiqueta sem garrafa vira aviso de etiqueta nova', () => {
  const d = decidir(passagem(), { ...naAdega, garrafa: null });
  assert.ok(d.acao === 'evento' && d.tipo === 'etiqueta_nova');
});

test('etiqueta nova já avisada não gera um segundo aviso', () => {
  const d = decidir(passagem(), { garrafa: null, pendente: { tipo: 'etiqueta_nova' }, passagemAnteriorFim: null });
  assert.equal(d.acao, 'ignorar');
});

test('pessoa parada na porta com a garrafa: a segunda leitura é a mesma passagem', () => {
  const d = decidir(passagem({ inicio: T0 + 10_000 }), { ...naAdega, passagemAnteriorFim: T0 });
  assert.equal(d.acao, 'ignorar');
});

test('passagem depois do intervalo de continuação conta de novo', () => {
  const d = decidir(passagem({ inicio: T0 + 31_000 }), { ...naAdega, passagemAnteriorFim: T0 });
  assert.equal(d.acao, 'evento');
});

test('garrafa que ficou muito tempo no alcance vira baixa confiança, com o porquê', () => {
  const d = decidir(passagem({ fim: T0 + 120_000 }), naAdega);
  assert.ok(d.acao === 'evento' && d.confianca === 'baixa');
  assert.match(d.motivo, /perto da porta/);
});

test('sensor de passagem que concorda com o estoque dá confiança alta', () => {
  const d = decidir(passagem({ direcao: 'saida' }), naAdega);
  assert.ok(d.acao === 'evento' && d.tipo === 'saida' && d.confianca === 'alta');
});

test('sensor discorda do estoque: vale o sensor, com confiança baixa e explicação', () => {
  const d = decidir(passagem({ direcao: 'entrada' }), naAdega);
  assert.ok(d.acao === 'evento' && d.tipo === 'entrada' && d.confianca === 'baixa');
  assert.match(d.motivo, /não foi lida/);
});

test('corpo do aparelho: idades viram hora absoluta e a ordem é a do mundo real', () => {
  const agora = T0 + 60_000;
  const r = lerCorpo(
    {
      firmware: 'portal-adega 0.4',
      avistamentos: [
        { id: 'b-2', epc: 'e2000000000000000000aaaa', idade_inicio_ms: 1000, idade_fim_ms: 500, leituras: 3 },
        { id: 'b-1', epc: 'E2000000000000000000BBBB', idade_inicio_ms: 9000, idade_fim_ms: 7000, leituras: 5 },
      ],
    },
    agora,
  );
  assert.ok(!('erro' in r));
  assert.deepEqual(r.avistamentos.map((a) => a.id), ['b-1', 'b-2']);
  assert.equal(r.avistamentos[0].inicio, agora - 9000);
  assert.equal(r.avistamentos[1].epc, 'E2000000000000000000AAAA'); // normaliza para maiúsculas
});

test('corpo do aparelho: item ruim é recusado sem derrubar os bons', () => {
  const r = lerCorpo(
    {
      avistamentos: [
        { id: 'ok-1', epc: 'E2000000000000000000BBBB', idade_inicio_ms: 3000, idade_fim_ms: 1000 },
        { id: 'ruim', epc: 'nao-e-hex', idade_inicio_ms: 3000, idade_fim_ms: 1000 },
        { id: 'invertido', epc: 'E2000000000000000000CCCC', idade_inicio_ms: 1000, idade_fim_ms: 3000 },
      ],
    },
    T0,
  );
  assert.ok(!('erro' in r));
  assert.equal(r.avistamentos.length, 1);
  assert.deepEqual(r.recusados.map((x) => x.indice), [1, 2]);
});

test('corpo do aparelho: sem lista de avistamentos é erro', () => {
  assert.ok('erro' in lerCorpo({}, T0));
  assert.ok('erro' in lerCorpo(null, T0));
});
