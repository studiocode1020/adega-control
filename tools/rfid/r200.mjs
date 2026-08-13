#!/usr/bin/env node
/**
 * Bancada R200 — leitor UHF RFID (860-960 MHz) via adaptador USB-serial.
 *
 * Zero dependencias: fala o protocolo binario do R200 direto no /dev/cu.*,
 * usando `stty` pra configurar a porta em 115200 8N1 raw.
 *
 * Uso:
 *   node r200.mjs ports
 *   node r200.mjs info
 *   node r200.mjs region us
 *   node r200.mjs power 22
 *   node r200.mjs scan [--seconds 0] [--power 22]
 *   node r200.mjs range "garrafa cheia @ 50cm" [--seconds 10] [--power 22]
 *
 * Flags globais: --port /dev/cu.xxx
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BAUD = 115200;

// ---------------------------------------------------------------- protocolo

const HEAD = 0xbb;
const TAIL = 0x7e;
const TYPE_CMD = 0x00;
const TYPE_RESP = 0x01;
const TYPE_NOTIFY = 0x02;

const CMD = {
  INFO: 0x03,
  SET_REGION: 0x07,
  GET_REGION: 0x08,
  SINGLE_POLL: 0x22,
  MULTI_POLL: 0x27,
  STOP_POLL: 0x28,
  SET_POWER: 0xb6,
  GET_POWER: 0xb7,
  ERROR: 0xff,
};

const REGIONS = {
  china900: { code: 0x01, faixa: '920,125-924,875 MHz' },
  us: { code: 0x02, faixa: '902,25-927,75 MHz' },
  eu: { code: 0x03, faixa: '865,1-867,9 MHz' },
  china800: { code: 0x04, faixa: '840,125-844,875 MHz' },
  korea: { code: 0x06, faixa: '917,1-923,3 MHz' },
};

const ERROS = {
  0x15: 'inventario sem retorno (nenhuma tag no campo)',
  0x17: 'parametro invalido',
  0x20: 'falha ao acessar a tag',
  0xa0: 'comando desconhecido',
};

/** Monta um frame: BB <type> <cmd> <PL-MSB> <PL-LSB> <params...> <checksum> 7E */
function build(type, cmd, params = []) {
  const corpo = [type, cmd, (params.length >> 8) & 0xff, params.length & 0xff, ...params];
  const cs = corpo.reduce((a, b) => (a + b) & 0xff, 0);
  return Buffer.from([HEAD, ...corpo, cs, TAIL]);
}

/** Acumula bytes da serial e devolve frames completos e validados. */
class Parser {
  constructor() {
    this.buf = Buffer.alloc(0);
  }

  push(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    const frames = [];

    for (;;) {
      const i = this.buf.indexOf(HEAD);
      if (i < 0) {
        this.buf = Buffer.alloc(0);
        break;
      }
      if (i > 0) this.buf = this.buf.subarray(i); // descarta lixo antes do header
      if (this.buf.length < 7) break;

      const pl = (this.buf[3] << 8) | this.buf[4];
      const total = 7 + pl; // head + type + cmd + pl(2) + params + checksum + tail
      if (pl > 512) {
        this.buf = this.buf.subarray(1);
        continue;
      }
      if (this.buf.length < total) break;

      const f = this.buf.subarray(0, total);
      let cs = 0;
      for (let k = 1; k <= total - 3; k++) cs = (cs + f[k]) & 0xff;

      if (f[total - 1] !== TAIL || cs !== f[total - 2]) {
        this.buf = this.buf.subarray(1); // header falso, reenquadra
        continue;
      }

      frames.push({ type: f[1], cmd: f[2], params: Buffer.from(f.subarray(5, 5 + pl)) });
      this.buf = this.buf.subarray(total);
    }

    return frames;
  }
}

/** Notificacao de tag: RSSI(1) PC(2) EPC(n) CRC(2) */
function parseTag(params) {
  if (params.length < 6) return null;
  const bruto = params[0];
  return {
    rssi: bruto > 127 ? bruto - 256 : bruto,
    pc: params.subarray(1, 3).toString('hex').toUpperCase(),
    epc: params.subarray(3, params.length - 2).toString('hex').toUpperCase(),
  };
}

// -------------------------------------------------------------------- porta

const PROVAVEL = /usbserial|wchusbserial|usbmodem|SLAB|UART|CH34/i;

function listarPortas() {
  return fs
    .readdirSync('/dev')
    .filter((n) => n.startsWith('cu.'))
    .map((n) => '/dev/' + n)
    .sort();
}

function autodetectar() {
  const portas = listarPortas().filter((p) => !/Bluetooth|debug-console/i.test(p));
  const provaveis = portas.filter((p) => PROVAVEL.test(p));
  if (provaveis.length === 1) return provaveis[0];
  if (provaveis.length > 1) {
    throw new Error(
      `mais de uma porta USB-serial encontrada, escolha com --port:\n  ${provaveis.join('\n  ')}`,
    );
  }
  if (portas.length === 1) return portas[0];
  throw new Error(
    'nenhuma porta USB-serial encontrada. Plugue o adaptador e rode `node r200.mjs ports`.',
  );
}

/**
 * Loop de leitura por polling. A porta e aberta com O_NONBLOCK de proposito:
 * com fd bloqueante, um fs.read() parado na threadpool trava o process.exit().
 */
function iniciarLeitor(fd, onData) {
  const buf = Buffer.alloc(4096);
  let parado = false;

  const loop = () => {
    if (parado) return;
    fs.read(fd, buf, 0, buf.length, null, (err, n) => {
      if (parado) return;
      if (err) {
        if (err.code === 'EAGAIN' || err.code === 'EINTR') return setTimeout(loop, 5);
        console.error(`\nerro de leitura na serial: ${err.message}`);
        return;
      }
      if (n > 0) onData(Buffer.from(buf.subarray(0, n)));
      n > 0 ? setImmediate(loop) : setTimeout(loop, 20);
    });
  };

  loop();
  return () => {
    parado = true;
  };
}

class Device {
  constructor(portPath, baudRate = BAUD) {
    this.path = portPath;
    this.baudRate = baudRate;
    this.parser = new Parser();
    this.handlers = new Set();
  }

  abrir() {
    try {
      this.fd = fs.openSync(
        this.path,
        fs.constants.O_RDWR | fs.constants.O_NOCTTY | fs.constants.O_NONBLOCK,
      );
    } catch (e) {
      throw new Error(`nao consegui abrir ${this.path}: ${e.message}`);
    }
    // A porta precisa estar aberta antes do stty, senao o macOS reseta pra 9600.
    try {
      execFileSync('stty', [
        '-f', this.path,
        String(this.baudRate),
        'cs8', '-parenb', '-cstopb',
        'raw', '-echo',
        'clocal', '-crtscts',
      ]);
    } catch (e) {
      throw new Error(`falha ao configurar ${this.path} em ${this.baudRate} 8N1: ${e.message}`);
    }

    this.pararLeitor = iniciarLeitor(this.fd, (chunk) => {
      this.onRaw?.(chunk);
      for (const frame of this.parser.push(chunk)) {
        for (const h of [...this.handlers]) h(frame);
      }
    });
  }


  enviar(cmd, params = []) {
    this.escrever(build(TYPE_CMD, cmd, params));
  }

  /** Escreve tudo, tolerando EAGAIN (a porta esta em O_NONBLOCK). */
  escrever(buf) {
    let escrito = 0;
    for (let tentativa = 0; escrito < buf.length && tentativa < 200; tentativa++) {
      try {
        escrito += fs.writeSync(this.fd, buf, escrito, buf.length - escrito);
      } catch (e) {
        if (e.code !== 'EAGAIN') throw e;
      }
    }
    if (escrito < buf.length) throw new Error('nao consegui escrever na serial (buffer cheio)');
  }

  aguardar(pred, ms = 1200) {
    return new Promise((resolve) => {
      const timer = setTimeout(() => {
        this.handlers.delete(h);
        resolve(null);
      }, ms);
      const h = (frame) => {
        if (!pred(frame)) return;
        clearTimeout(timer);
        this.handlers.delete(h);
        resolve(frame);
      };
      this.handlers.add(h);
    });
  }

  async pedir(cmd, params = [], ms = 1200) {
    this.enviar(cmd, params);
    const f = await this.aguardar(
      (fr) => fr.type === TYPE_RESP && (fr.cmd === cmd || fr.cmd === CMD.ERROR),
      ms,
    );
    if (!f) throw new Error(`sem resposta ao comando 0x${cmd.toString(16)} (timeout ${ms}ms)`);
    if (f.cmd === CMD.ERROR) {
      const code = f.params[0];
      throw new Error(`modulo retornou erro 0x${code.toString(16)}: ${ERROS[code] ?? 'desconhecido'}`);
    }
    return f.params;
  }

  ouvirTags(cb) {
    const h = (frame) => {
      if (frame.type !== TYPE_NOTIFY || frame.cmd !== CMD.SINGLE_POLL) return;
      const tag = parseTag(frame.params);
      if (tag) cb(tag);
    };
    this.handlers.add(h);
    return () => this.handlers.delete(h);
  }

  fechar() {
    this.pararLeitor?.();
    try {
      fs.closeSync(this.fd);
    } catch {}
  }
}

// ------------------------------------------------------------------ helpers

const espera = (ms) => new Promise((r) => setTimeout(r, ms));

async function lerPotencia(dev) {
  const p = await dev.pedir(CMD.GET_POWER);
  return ((p[0] << 8) | p[1]) / 100;
}

async function definirPotencia(dev, dbm) {
  const v = Math.round(dbm * 100);
  await dev.pedir(CMD.SET_POWER, [(v >> 8) & 0xff, v & 0xff]);
  return lerPotencia(dev);
}

async function lerRegiao(dev) {
  const p = await dev.pedir(CMD.GET_REGION);
  const nome = Object.keys(REGIONS).find((k) => REGIONS[k].code === p[0]);
  return { code: p[0], nome: nome ?? `desconhecida (0x${p[0].toString(16)})` };
}

async function lerInfo(dev, tipo) {
  const p = await dev.pedir(CMD.INFO, [tipo]);
  return p.subarray(1).toString('ascii').trim();
}

async function iniciarInventario(dev) {
  dev.enviar(CMD.STOP_POLL);
  await espera(40);
  dev.enviar(CMD.MULTI_POLL, [0x22, 0xff, 0xff]);
}

async function pararInventario(dev) {
  dev.enviar(CMD.STOP_POLL);
  await espera(60);
}

/** Agrega leituras por EPC. */
class Coletor {
  constructor() {
    this.tags = new Map();
    this.total = 0;
    this.inicio = Date.now();
  }

  add(tag) {
    this.total++;
    let t = this.tags.get(tag.epc);
    if (!t) {
      t = { epc: tag.epc, pc: tag.pc, n: 0, rssis: [], melhor: -Infinity, ultimo: 0 };
      this.tags.set(tag.epc, t);
    }
    t.n++;
    t.rssis.push(tag.rssi);
    t.melhor = Math.max(t.melhor, tag.rssi);
    t.ultimoRssi = tag.rssi;
    t.ultimo = Date.now();
  }

  get segundos() {
    return (Date.now() - this.inicio) / 1000;
  }

  ordenadas() {
    return [...this.tags.values()].sort((a, b) => b.n - a.n);
  }

  estatisticas() {
    const todos = [...this.tags.values()].flatMap((t) => t.rssis);
    if (!todos.length) return null;
    return {
      min: Math.min(...todos),
      max: Math.max(...todos),
      media: todos.reduce((a, b) => a + b, 0) / todos.length,
    };
  }
}

// --------------------------------------------------------------- subcomandos

async function comandoInfo(dev) {
  const [hw, sw, fab] = [
    await lerInfo(dev, 0x00).catch(() => '?'),
    await lerInfo(dev, 0x01).catch(() => '?'),
    await lerInfo(dev, 0x02).catch(() => '?'),
  ];
  const regiao = await lerRegiao(dev);
  const potencia = await lerPotencia(dev);

  console.log(`
  Porta        ${dev.path} @ ${BAUD} 8N1
  Hardware     ${hw}
  Firmware     ${sw}
  Fabricante   ${fab}
  Regiao       ${regiao.nome}${REGIONS[regiao.nome] ? `  (${REGIONS[regiao.nome].faixa})` : ''}
  Potencia TX  ${potencia.toFixed(2)} dBm
`);
  if (regiao.nome !== 'us') {
    console.log(`  ! Regiao nao esta em US (902-928 MHz, faixa da Anatel).`);
    console.log(`    Ajuste com: node r200.mjs region us\n`);
  }
}

/** Escuta a porta por `ms`, devolvendo bytes crus e frames validos. */
function coletar(dev, ms, aoIniciar) {
  return new Promise((resolve) => {
    const bytes = [];
    const frames = [];
    const h = (f) => frames.push(f);
    dev.onRaw = (c) => bytes.push(c);
    dev.handlers.add(h);
    aoIniciar?.();
    setTimeout(() => {
      dev.onRaw = null;
      dev.handlers.delete(h);
      resolve({ cru: Buffer.concat(bytes), frames });
    }, ms);
  });
}

/**
 * Varre baud rates procurando sinal de vida do modulo.
 *
 * Reabre a porta a cada velocidade de proposito: trocar o baud com a porta
 * aberta faz o driver do CH343 cuspir bytes fantasma que parecem resposta do
 * modulo e mandam voce cacar um problema que nao existe.
 */
async function comandoDiag(portPath, { todos = false } = {}) {
  const bauds = todos
    ? [
        300, 600, 1200, 2400, 4800, 9600, 14400, 19200, 28800, 38400, 57600, 76800, 115200,
        128000, 230400, 250000, 460800, 500000, 921600,
      ]
    : [115200, 9600, 19200, 38400, 57600, 230400];
  console.log(`\n  Porta ${portPath}   ${bauds.length} velocidades`);

  console.log('\n  baud     ocioso   apos comando   frames');
  console.log('  ' + '-'.repeat(46));

  let achou = null;
  let algumByte = false;

  for (const baud of bauds) {
    let dev;
    try {
      dev = new Device(portPath, baud);
      dev.abrir();
    } catch {
      console.log(`  ${String(baud).padStart(6)}   (velocidade nao suportada pelo driver)`);
      continue;
    }
    await espera(250);
    await coletar(dev, 150); // descarta o que sobrou da abertura

    // 1. a linha fala sozinha? (modulo em stream, ou ruido de linha solta)
    const ocioso = await coletar(dev, 400);

    // 2. responde a comando? tres comandos diferentes, caso ignore algum
    const resposta = await coletar(dev, 900, () => {
      for (const [cmd, params] of [
        [CMD.INFO, [0x00]],
        [CMD.GET_REGION, []],
        [CMD.SINGLE_POLL, []],
      ]) {
        try {
          dev.enviar(cmd, params);
        } catch {}
      }
    });
    dev.fechar();

    const marca = resposta.frames.length ? '  <-- RESPONDEU' : '';
    console.log(
      `  ${String(baud).padStart(6)}   ${String(ocioso.cru.length).padStart(6)}   ${String(resposta.cru.length).padStart(12)}   ${String(resposta.frames.length).padStart(6)}${marca}`,
    );
    if (resposta.cru.length) {
      console.log(`           ${resposta.cru.subarray(0, 24).toString('hex').toUpperCase()}`);
    }
    if (ocioso.cru.length || resposta.cru.length) algumByte = true;
    if (resposta.frames.length && !achou) achou = baud;
  }

  console.log();
  if (achou) {
    console.log(`  Modulo responde a ${achou} baud.`);
    if (achou !== BAUD) console.log(`  Ajuste a constante BAUD no r200.mjs para ${achou}.`);
    console.log();
  } else if (algumByte) {
    console.log('  Chegou byte, mas nenhum frame valido. Ou o baud certo nao esta na lista,');
    console.log('  ou a linha esta com ruido/eco. Confira o aterramento (GND comum).\n');
  } else {
    console.log('  Silencio total: o modulo nao transmitiu nada em nenhuma velocidade.');
    console.log('  O adaptador USB funciona (o macOS enumerou a porta), entao e fiacao');
    console.log('  ou alimentacao entre o adaptador e o modulo:\n');
    console.log('   1. Conector JST solto no lado do modulo — na foto ele estava desencaixado.');
    console.log('   2. TX/RX invertidos: o TX do adaptador tem que ir no RX do modulo.');
    console.log('   3. Modulo sem alimentacao — o R200 quer 5 V no VCC (3,3 V nao basta).');
    console.log('   4. Sem GND comum entre adaptador e modulo.');
    console.log('\n  Proximo passo: `node r200.mjs loopback` isola adaptador de modulo.\n');
  }
  process.exit(achou ? 0 : 1);
}

/**
 * Teste de loopback: com TX encostado no RX, tudo que sai tem que voltar igual.
 * Prova (ou descarta) adaptador, cabo, driver e este software de uma vez so.
 */
async function comandoLoopback(portPath) {
  console.log(`
  TESTE DE LOOPBACK — ${portPath}

  Desconecte o modulo e encoste o fio TX no fio RX do adaptador
  (so os dois fios de dados, um no outro). Depois deixe rodar.
`);

  const dev = new Device(portPath);
  dev.abrir();
  await espera(1500); // assenta bem: sem isso o driver ainda esta se ajeitando
  await coletar(dev, 300);

  const padroes = {
    'bits alternados': Buffer.alloc(24, 0x55),
    'tudo zero': Buffer.alloc(24, 0x00),
    'tudo um': Buffer.alloc(24, 0xff),
    'comando INFO real': build(TYPE_CMD, CMD.INFO, [0x00]),
  };

  let acertos = 0;
  for (const [nome, tx] of Object.entries(padroes)) {
    await coletar(dev, 100);
    const { cru } = await coletar(dev, 500, () => dev.escrever(tx));
    const igual = cru.equals(tx);
    if (igual) acertos++;
    console.log(
      `  ${nome.padEnd(20)} enviei ${String(tx.length).padStart(2)}B, voltaram ${String(cru.length).padStart(2)}B   ${
        igual ? 'IDENTICO' : cru.length ? 'DIFERENTE: ' + cru.subarray(0, 16).toString('hex').toUpperCase() : 'nada'
      }`,
    );
  }

  const total = Object.keys(padroes).length;
  console.log();
  if (acertos === total) {
    console.log('  Loopback perfeito. Adaptador, cabo, driver e software estao OK.');
    console.log('  Logo o problema esta do lado do modulo: alimentacao (5 V no VCC),');
    console.log('  o conector JST encaixado, ou TX/RX trocados na ligacao com ele.\n');
  } else if (acertos === 0) {
    console.log('  Nada voltou. Ou os fios nao estao realmente se tocando, ou o');
    console.log('  adaptador nao esta transmitindo. Confirme que voce encostou os');
    console.log('  fios de DADOS (TX e RX), nao o VCC e o GND.\n');
  } else {
    console.log(`  Parcial (${acertos}/${total}): a ligacao esta intermitente — mau contato.\n`);
  }

  dev.fechar();
  process.exit(acertos === total ? 0 : 1);
}

/**
 * Escuta passiva continua, sem transmitir nada. Serve pra flagrar o que o
 * modulo cospe no instante em que e energizado — reencaixe o JST com isso
 * rodando.
 */
async function comandoMonitor(dev, { segundos }) {
  console.log(`\n  Escutando ${dev.path} a ${dev.baudRate} baud, sem transmitir nada.`);
  console.log('  Reencaixe o conector JST no modulo agora — qualquer byte aparece aqui.\n');

  const t0 = Date.now();
  let totalBytes = 0;
  let totalFrames = 0;

  dev.onRaw = (chunk) => {
    totalBytes += chunk.length;
    const ms = String(Date.now() - t0).padStart(6);
    const ascii = [...chunk].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
    console.log(`  +${ms}ms  ${chunk.length}B  ${chunk.subarray(0, 24).toString('hex').toUpperCase()}  ${ascii.slice(0, 24)}`);
  };
  dev.handlers.add((f) => {
    totalFrames++;
    const tag = f.type === TYPE_NOTIFY && f.cmd === CMD.SINGLE_POLL ? parseTag(f.params) : null;
    console.log(
      `           frame valido: tipo 0x${f.type.toString(16)} cmd 0x${f.cmd.toString(16)}${tag ? `  EPC ${tag.epc} (${tag.rssi} dBm)` : ''}`,
    );
  });

  const encerrar = () => {
    console.log(`\n  ${totalBytes} bytes, ${totalFrames} frame(s) validos em ${((Date.now() - t0) / 1000).toFixed(1)}s`);
    if (!totalBytes) console.log('  Nada. O modulo nao transmite nem ao ser energizado.\n');
    dev.fechar();
    process.exit(0);
  };

  process.on('SIGINT', encerrar);
  if (segundos > 0) setTimeout(encerrar, segundos * 1000);
}

/**
 * Mede a "assinatura" de diafonia da linha RX.
 *
 * Com o RX solto, a propria TX acopla capacitivamente e vira lixo previsivel.
 * A quantidade e o formato desse lixo dependem de quem esta pendurado na linha.
 * Rodando isso com o modulo conectado e depois desconectado, a comparacao diz
 * se o modulo esta eletricamente presente no RX do adaptador — sem multimetro.
 */
async function comandoAssinatura(portPath, rotulo) {
  if (!rotulo) throw new Error('use: node r200.mjs assinatura "modulo conectado"');

  const bauds = [19200, 38400];
  const repeticoes = 5;
  const sonda = Buffer.concat([
    build(TYPE_CMD, CMD.INFO, [0x00]),
    build(TYPE_CMD, CMD.GET_REGION, []),
    build(TYPE_CMD, CMD.SINGLE_POLL, []),
  ]);

  console.log(`\n  Medindo assinatura: "${rotulo}"`);
  console.log(`  ${bauds.length} velocidades x ${repeticoes} repeticoes, sonda fixa de ${sonda.length} bytes\n`);

  const medidas = {};
  for (const baud of bauds) {
    const contagens = [];
    const padroes = new Set();
    for (let i = 0; i < repeticoes; i++) {
      const dev = new Device(portPath, baud);
      dev.abrir();
      await espera(250);
      await coletar(dev, 150);
      const ocioso = await coletar(dev, 300);
      const { cru } = await coletar(dev, 700, () => dev.escrever(sonda));
      dev.fechar();
      contagens.push(cru.length);
      if (cru.length) padroes.add(cru.subarray(0, 8).toString('hex').toUpperCase());
      if (ocioso.cru.length) console.log(`  ! ${baud}: ${ocioso.cru.length} bytes SEM transmitir — a linha falou sozinha`);
    }
    const total = contagens.reduce((a, b) => a + b, 0);
    medidas[baud] = { contagens, total, padroes: [...padroes] };
    console.log(
      `  ${String(baud).padStart(6)}   bytes por tentativa: [${contagens.join(', ')}]   total ${total}`,
    );
    if (padroes.size) console.log(`           padroes: ${[...padroes].join('  ')}`);
  }

  const arquivo = path.join(HERE, 'assinaturas.json');
  const anteriores = fs.existsSync(arquivo) ? JSON.parse(fs.readFileSync(arquivo, 'utf8')) : [];
  const atual = { rotulo, quando: new Date().toISOString(), medidas };

  const previa = [...anteriores].reverse().find((a) => a.rotulo !== rotulo);
  if (previa) {
    console.log(`\n  Comparando com "${previa.rotulo}":\n`);
    let mudou = false;
    for (const baud of bauds) {
      const a = previa.medidas[baud]?.total ?? 0;
      const b = medidas[baud].total;
      const pa = (previa.medidas[baud]?.padroes ?? []).join(' ');
      const pb = medidas[baud].padroes.join(' ');
      const diferente = a !== b || pa !== pb;
      if (diferente) mudou = true;
      console.log(`  ${String(baud).padStart(6)}   ${String(a).padStart(4)} -> ${String(b).padStart(4)} bytes   ${diferente ? 'MUDOU' : 'igual'}`);
    }
    console.log();
    if (mudou) {
      console.log('  A assinatura mudou: sem o modulo, a linha emudece por completo.');
      console.log('  Entao esses bytes vem DELE — nao sao ruido nem diafonia da propria TX');
      console.log('  (linha aberta captaria igual ou mais ruido, e captou zero).');
      console.log('\n  O modulo esta vivo e respondendo. O que falha e a leitura: os bytes');
      console.log('  chegam corrompidos ou desenquadrados. Suspeitos, nessa ordem:');
      console.log('   1. Mau contato no JST — encaixe ate clicar e repita.');
      console.log('   2. Baud diferente do esperado, ou sinal degradado no cabo.');
      console.log('   3. Descasamento de nivel logico entre modulo e adaptador.\n');
    } else {
      console.log('  A assinatura nao mudou nada: conectar ou nao o modulo e indiferente');
      console.log('  para a linha RX. Ele nunca esteve ligado nesse pino — o TXD dele nao');
      console.log('  chega ao RX do adaptador. E problema de cabo/pinagem, nao do modulo.\n');
    }
  } else {
    console.log('\n  Baseline gravado. Agora desconecte o JST do modulo e rode de novo');
    console.log('  com outro rotulo, ex: node r200.mjs assinatura "modulo desconectado"\n');
  }

  fs.writeFileSync(arquivo, JSON.stringify([...anteriores, atual], null, 2));
  process.exit(0);
}

async function comandoRegiao(dev, alvo) {
  const r = REGIONS[alvo];
  if (!r) throw new Error(`regiao invalida "${alvo}". Opcoes: ${Object.keys(REGIONS).join(', ')}`);
  await dev.pedir(CMD.SET_REGION, [r.code]);
  const agora = await lerRegiao(dev);
  console.log(`Regiao definida: ${agora.nome} (${r.faixa})`);
}

async function comandoPotencia(dev, dbm) {
  if (!Number.isFinite(dbm) || dbm < 15 || dbm > 26) {
    throw new Error('potencia deve estar entre 15 e 26 dBm');
  }
  if (dbm > 22) {
    console.log('! Acima de 22 dBm o modulo pode passar dos 500 mA da USB e resetar.');
    console.log('  Se as leituras sumirem ou a porta cair, alimente o modulo com 5 V externos.\n');
  }
  const agora = await definirPotencia(dev, dbm);
  console.log(`Potencia TX: ${agora.toFixed(2)} dBm`);
}

async function comandoScan(dev, { segundos, potencia }) {
  if (potencia != null) await definirPotencia(dev, potencia);
  const txPower = await lerPotencia(dev);
  const regiao = await lerRegiao(dev);

  const col = new Coletor();
  const parar = dev.ouvirTags((t) => col.add(t));
  await iniciarInventario(dev);

  // Re-arma o inventario periodicamente (o contador do multi-poll acaba).
  const rearmar = setInterval(() => iniciarInventario(dev), 5000);

  const render = () => {
    const linhas = col.ordenadas();
    const taxa = col.total / Math.max(col.segundos, 0.001);
    process.stdout.write('\x1b[H\x1b[2J');
    console.log(`  R200 @ ${dev.path}   ${txPower.toFixed(1)} dBm   regiao ${regiao.nome}`);
    console.log(
      `  ${col.segundos.toFixed(1)}s   ${col.total} leituras   ${taxa.toFixed(1)}/s   ${linhas.length} tag(s) unica(s)\n`,
    );
    if (!linhas.length) {
      console.log('  aguardando tags...  (aproxime uma tag ou o cartao de teste)');
    } else {
      console.log('  EPC                                        leituras   RSSI    melhor');
      console.log('  ' + '-'.repeat(70));
      for (const t of linhas) {
        const viva = Date.now() - t.ultimo < 1500 ? ' ' : '.';
        console.log(
          `${viva} ${t.epc.padEnd(42)} ${String(t.n).padStart(8)}   ${String(t.ultimoRssi).padStart(4)}   ${String(t.melhor).padStart(5)} dBm`,
        );
      }
    }
    console.log('\n  Ctrl+C para encerrar');
  };

  const pintar = setInterval(render, 400);
  render();

  const encerrar = async () => {
    clearInterval(pintar);
    clearInterval(rearmar);
    parar();
    await pararInventario(dev);
    render();
    dev.fechar();
    process.exit(0);
  };

  process.on('SIGINT', encerrar);
  if (segundos > 0) setTimeout(encerrar, segundos * 1000);
}

async function comandoRange(dev, rotulo, { segundos, potencia }) {
  if (!rotulo) {
    throw new Error(
      'informe um rotulo pra medicao, ex: node r200.mjs range "garrafa cheia @ 50cm"',
    );
  }
  if (potencia != null) await definirPotencia(dev, potencia);
  const txPower = await lerPotencia(dev);
  const regiao = await lerRegiao(dev);

  console.log(`\n  Medindo "${rotulo}" por ${segundos}s a ${txPower.toFixed(1)} dBm (${regiao.nome})`);
  console.log('  Deixe a tag parada na posicao antes de comecar.\n');

  const col = new Coletor();
  const parar = dev.ouvirTags((t) => col.add(t));
  await iniciarInventario(dev);
  const rearmar = setInterval(() => iniciarInventario(dev), 5000);

  const barra = setInterval(() => {
    const s = col.segundos;
    process.stdout.write(
      `\r  ${s.toFixed(1)}s / ${segundos}s   ${col.total} leituras   ${col.tags.size} tag(s)   `,
    );
  }, 200);

  await espera(segundos * 1000);

  clearInterval(barra);
  clearInterval(rearmar);
  parar();
  await pararInventario(dev);

  const dur = col.segundos;
  const taxa = col.total / dur;
  const stats = col.estatisticas();
  const epcs = col.ordenadas().map((t) => t.epc);

  process.stdout.write('\r' + ' '.repeat(70) + '\r');
  console.log(`\n  ${rotulo}`);
  console.log('  ' + '-'.repeat(50));
  console.log(`  leituras       ${col.total} em ${dur.toFixed(1)}s  (${taxa.toFixed(1)}/s)`);
  console.log(`  tags unicas    ${epcs.length}${epcs.length ? '  ' + epcs.join(', ') : ''}`);
  if (stats) {
    console.log(
      `  RSSI           min ${stats.min}  media ${stats.media.toFixed(1)}  max ${stats.max} dBm`,
    );
  } else {
    console.log('  RSSI           -- nenhuma leitura --');
  }
  console.log(
    `  veredito       ${taxa >= 5 ? 'LE BEM' : taxa >= 1 ? 'LE NO LIMITE' : taxa > 0 ? 'MARGINAL' : 'NAO LE'}\n`,
  );

  const csv = path.join(HERE, 'medicoes.csv');
  const cabecalho =
    'timestamp,rotulo,segundos,potencia_dbm,regiao,tags_unicas,leituras,leituras_por_s,rssi_min,rssi_media,rssi_max,epcs\n';
  if (!fs.existsSync(csv)) fs.writeFileSync(csv, cabecalho);
  fs.appendFileSync(
    csv,
    [
      new Date().toISOString(),
      JSON.stringify(rotulo),
      dur.toFixed(1),
      txPower.toFixed(2),
      regiao.nome,
      epcs.length,
      col.total,
      taxa.toFixed(2),
      stats?.min ?? '',
      stats ? stats.media.toFixed(1) : '',
      stats?.max ?? '',
      JSON.stringify(epcs.join(' ')),
    ].join(',') + '\n',
  );
  console.log(`  registrado em ${path.relative(process.cwd(), csv)}\n`);

  dev.fechar();
  process.exit(0);
}

// -------------------------------------------------------------------- entrada

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a.startsWith('--')) flags[a.slice(2)] = argv[++i];
    else pos.push(a);
  }
  return { flags, pos };
}

const AJUDA = `
  Bancada R200 — leitor UHF RFID via USB-serial

    node r200.mjs ports                      lista as portas seriais
    node r200.mjs info                       versao, regiao e potencia do modulo
    node r200.mjs diag                       varre baud rates quando nada responde
    node r200.mjs loopback                   TX no RX: prova adaptador, cabo e software
    node r200.mjs monitor [--seconds N]      escuta pura, sem transmitir (pega o boot)
    node r200.mjs region <us|eu|korea|...>   define a regiao (use "us" pra Anatel)
    node r200.mjs power <15..26>             define a potencia TX em dBm
    node r200.mjs scan [--seconds N]         inventario continuo, tabela ao vivo
    node r200.mjs range "<rotulo>"           mede alcance e grava em medicoes.csv

  Flags: --port /dev/cu.xxx   --seconds N   --power <dBm>   --baud N
`;

async function main() {
  const { flags, pos } = parseArgs(process.argv.slice(2));
  const [cmd, ...resto] = pos;

  if (!cmd || cmd === 'help' || cmd === '--help') return console.log(AJUDA);

  if (cmd === 'ports') {
    const portas = listarPortas();
    if (!portas.length) return console.log('nenhuma porta serial encontrada.');
    console.log('\n  portas seriais disponiveis:');
    for (const p of portas) {
      const provavel = PROVAVEL.test(p);
      console.log(
        `   ${provavel ? '->' : '  '} ${p}${provavel ? '   (provavel adaptador USB-serial)' : ''}`,
      );
    }
    if (!portas.some((p) => PROVAVEL.test(p))) {
      console.log('\n  nenhuma parece adaptador USB-serial — plugue o modulo e rode de novo.');
    }
    console.log();
    return;
  }

  const portPath = flags.port ?? autodetectar();

  // Estes gerenciam a porta por conta propria (reabrem, trocam baud).
  if (cmd === 'diag') return comandoDiag(portPath, { todos: 'all' in flags });
  if (cmd === 'loopback') return comandoLoopback(portPath);
  if (cmd === 'assinatura') return comandoAssinatura(portPath, resto.join(' '));

  const dev = new Device(portPath, flags.baud ? Number(flags.baud) : BAUD);
  dev.abrir();
  await espera(150);

  const segundos = Number(flags.seconds ?? (cmd === 'range' ? 10 : 0));
  const potencia = flags.power != null ? Number(flags.power) : null;

  // O monitor tem que ser 100% passivo — nao pode transmitir nada.
  if (cmd === 'monitor') return comandoMonitor(dev, { segundos });

  dev.enviar(CMD.STOP_POLL); // garante que nao ficou inventariando de uma rodada anterior
  await espera(100);
  dev.parser.buf = Buffer.alloc(0);

  switch (cmd) {
    case 'info':
      await comandoInfo(dev);
      break;
    case 'region':
      await comandoRegiao(dev, resto[0]);
      break;
    case 'power':
      await comandoPotencia(dev, Number(resto[0]));
      break;
    case 'scan':
      return comandoScan(dev, { segundos, potencia }); // fica rodando
    case 'range':
      return comandoRange(dev, resto.join(' '), { segundos, potencia }); // fica rodando
    default:
      console.log(AJUDA);
  }

  dev.fechar();
  process.exit(0);
}

// Exportado pra permitir testar a camada de protocolo sem hardware (ver protocolo.test.mjs).
export { build, Parser, parseTag, CMD, REGIONS };

const rodandoDireto =
  process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (rodandoDireto) {
  main().catch((e) => {
    console.error(`\n  erro: ${e.message}\n`);
    process.exit(1);
  });
}
