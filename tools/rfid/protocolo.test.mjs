/**
 * Testes do protocolo ASCII do FM-50X — rodam sem hardware.
 *   node --test tools/rfid/protocolo.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { Parser, parseTag, dbmParaValor, valorParaDbm } from './fm50x.mjs';

const bytes = (s) => Buffer.from(s, 'ascii');

test('extrai resposta no formato <LF>payload<CR><LF>', () => {
  const p = new Parser();
  assert.deepEqual(p.push(bytes('\nS01234567\r\n')), ['S01234567']);
});

test('reconhece a resposta de comando desconhecido', () => {
  // 0A 58 0D 0A — foi exatamente isso que o modulo devolveu aos comandos
  // binarios do R200 durante o diagnostico, e que passou por ruido.
  const p = new Parser();
  assert.deepEqual(p.push(Buffer.from('0A580D0A', 'hex')), ['X']);
});

test('junta resposta partida em varios chunks', () => {
  const p = new Parser();
  assert.deepEqual(p.push(bytes('\nV01')), []);
  assert.deepEqual(p.push(bytes('02,FM-50X')), []);
  assert.deepEqual(p.push(bytes('\r\n')), ['V0102,FM-50X']);
});

test('separa respostas coladas', () => {
  const p = new Parser();
  const r = p.push(bytes('\nU3000E28011AABB\r\n\nU3000E28011CCDD\r\n'));
  assert.deepEqual(r, ['U3000E28011AABB', 'U3000E28011CCDD']);
});

test('nao acumula lixo sem terminador', () => {
  const p = new Parser();
  p.push(Buffer.alloc(5000, 0x41)); // 5000 'A' sem CR/LF
  assert.ok(p.buf.length <= 4096);
});

test('decodifica tag em PC + EPC + CRC', () => {
  // U + PC(4) + EPC(24) + CRC(4)
  const tag = parseTag('U3000E2000017221101441890B1C3AB12');
  assert.equal(tag.pc, '3000');
  assert.equal(tag.epc, 'E2000017221101441890B1C3');
  assert.equal(tag.crc, 'AB12');
});

test('sem tag no campo devolve null', () => {
  assert.equal(parseTag('U'), null);
  assert.equal(parseTag('Q'), null);
});

test('resposta nao-hex nao vira tag', () => {
  assert.equal(parseTag('VFM-50X'), null);
});

test('converte potencia entre dBm e o valor do comando N1', () => {
  // faixa documentada: 00..1B equivale a -2..25 dBm
  assert.equal(dbmParaValor(-2), '00');
  assert.equal(dbmParaValor(25), '1B');
  assert.equal(dbmParaValor(20), '16');
  assert.equal(valorParaDbm('00'), -2);
  assert.equal(valorParaDbm('1B'), 25);
  assert.equal(valorParaDbm('16'), 20);
});
