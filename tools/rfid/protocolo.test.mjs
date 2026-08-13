/**
 * Testes da camada de protocolo do R200 — rodam sem hardware.
 *   node --test tools/rfid/protocolo.test.mjs
 */

import test from 'node:test';
import assert from 'node:assert/strict';
import { build, Parser, parseTag } from './r200.mjs';

const hex = (b) => b.toString('hex').toUpperCase();
const esperado = (s) => s.replace(/ /g, '').toUpperCase();

// Frames de referencia do protocolo R200/M100 — confere header, PL e checksum.
test('monta os frames de comando conhecidos', () => {
  assert.equal(hex(build(0x00, 0x28, [])), esperado('BB 00 28 00 00 28 7E'), 'stop poll');
  assert.equal(hex(build(0x00, 0x22, [])), esperado('BB 00 22 00 00 22 7E'), 'single poll');
  assert.equal(hex(build(0x00, 0xb7, [])), esperado('BB 00 B7 00 00 B7 7E'), 'get power');
  assert.equal(
    hex(build(0x00, 0xb6, [0x07, 0xd0])),
    esperado('BB 00 B6 00 02 07 D0 8F 7E'),
    'set power 20 dBm',
  );
  assert.equal(hex(build(0x00, 0x07, [0x02])), esperado('BB 00 07 00 01 02 0A 7E'), 'regiao US');
  assert.equal(hex(build(0x00, 0x03, [0x00])), esperado('BB 00 03 00 01 00 04 7E'), 'info hardware');
  assert.equal(
    hex(build(0x00, 0x27, [0x22, 0x27, 0x10])),
    esperado('BB 00 27 00 03 22 27 10 83 7E'),
    'multi poll x10000',
  );
});

const EPC = 'E2000017221101441890B1C3';

/** Notificacao de tag: RSSI(1) PC(2) EPC(12) CRC(2) */
function notificacaoDeTag(rssi = 0xc7) {
  return build(0x02, 0x22, [
    rssi,
    ...Buffer.from('3000', 'hex'),
    ...Buffer.from(EPC, 'hex'),
    ...Buffer.from('AB12', 'hex'),
  ]);
}

test('decodifica notificacao de tag', () => {
  const [f] = new Parser().push(notificacaoDeTag());
  assert.equal(f.type, 0x02);
  assert.equal(f.cmd, 0x22);

  const tag = parseTag(f.params);
  assert.equal(tag.epc, EPC);
  assert.equal(tag.pc, '3000');
  assert.equal(tag.rssi, -57, '0xC7 em complemento de dois');
});

test('RSSI positivo nao vira negativo', () => {
  const [f] = new Parser().push(notificacaoDeTag(0x2a));
  assert.equal(parseTag(f.params).rssi, 42);
});

test('reenquadra lixo, fragmentacao e frames colados', () => {
  const parser = new Parser();
  // lixo (incluindo um 0xBB falso) + duas notificacoes, entregues de 3 em 3 bytes
  const fluxo = Buffer.concat([
    Buffer.from([0x00, 0xff, 0xbb, 0x01]),
    notificacaoDeTag(),
    notificacaoDeTag(),
  ]);

  const frames = [];
  for (let i = 0; i < fluxo.length; i += 3) frames.push(...parser.push(fluxo.subarray(i, i + 3)));

  assert.equal(frames.length, 2);
  assert.equal(parseTag(frames[1].params).epc, EPC);
});

test('descarta frame com checksum invalido', () => {
  const ruim = Buffer.from(notificacaoDeTag());
  ruim[ruim.length - 2] ^= 0xff;
  assert.deepEqual(new Parser().push(ruim), []);
});

test('descarta frame sem byte de fim', () => {
  const ruim = Buffer.from(notificacaoDeTag());
  ruim[ruim.length - 1] = 0x00;
  assert.deepEqual(new Parser().push(ruim), []);
});

test('nao trava com PL absurdo', () => {
  // 0xBB seguido de um PL gigante nao pode fazer o parser esperar pra sempre
  const lixo = Buffer.concat([Buffer.from([0xbb, 0x02, 0x22, 0xff, 0xff]), notificacaoDeTag()]);
  const frames = new Parser().push(lixo);
  assert.equal(frames.length, 1);
  assert.equal(parseTag(frames[0].params).epc, EPC);
});
