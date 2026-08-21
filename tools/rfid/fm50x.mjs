#!/usr/bin/env node
/**
 * Bancada FM-50X — leitor UHF RFID (902-928 MHz) via adaptador USB-serial.
 *
 * Protocolo ASCII, 38400 8N1 (NAO e o protocolo binario do R200):
 *   envio    <comando><CR>
 *   resposta <LF><primeira letra do comando><dados><CR><LF>
 *   comando desconhecido -> <LF>X<CR><LF>
 *
 * Zero dependencias: fala direto com /dev/cu.*, usando `stty` pra configurar
 * a porta.
 *
 * Uso:
 *   node fm50x.mjs ports
 *   node fm50x.mjs info
 *   node fm50x.mjs power 25
 *   node fm50x.mjs region us
 *   node fm50x.mjs scan [--seconds 0]
 *   node fm50x.mjs range "garrafa cheia @ 50cm" [--seconds 10]
 *   node fm50x.mjs raw "N0,00"
 *
 * Flags: --port /dev/cu.xxx   --seconds N   --baud N
 */

import fs from 'node:fs';
import { execFileSync } from 'node:child_process';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const BAUD = 38400; // padrao de fabrica do FM-50X
const CR = 0x0d;
const LF = 0x0a;

// Regioes aceitas pelo comando N5. O modulo e a variante 902-928 (pad "US").
const REGIOES = {
  us: { code: '01', faixa: '902-928 MHz' },
  tw: { code: '02', faixa: '922-928 MHz' },
  cn: { code: '03', faixa: '920-925 MHz' },
  cn2: { code: '04', faixa: '840-845 MHz' },
  eu: { code: '05', faixa: '865-868 MHz' },
  jp: { code: '06', faixa: '916-921 MHz' },
  kr: { code: '07', faixa: '917-921 MHz' },
  vn: { code: '08', faixa: '918-923 MHz' },
};

const CODIGO_PARA_REGIAO = Object.fromEntries(
  Object.entries(REGIOES).map(([nome, r]) => [r.code, { nome, ...r }]),
);

/**
 * Potencia: o PDF da Fonkan documenta 00..1B como -2..25 dBm, mas o registrador
 * aceita 00..FF e o modulo sai de fabrica em FF. Fora da faixa documentada nao
 * da pra converter em dBm com honestidade, entao mostramos o valor cru.
 */
const POT_MAX_DOC = 0x1b;
const dbmParaValor = (dbm) => (dbm + 2).toString(16).toUpperCase().padStart(2, '0');
const valorParaDbm = (hex) => parseInt(hex, 16) - 2;

function formatarPotencia(hex) {
  const v = parseInt(hex, 16);
  if (Number.isNaN(v)) return `? (${hex})`;
  if (v <= POT_MAX_DOC) return `${valorParaDbm(hex)} dBm  (registrador ${hex})`;
  return `registrador ${hex} — acima de 1B, fora da faixa documentada de dBm`;
}

/**
 * Extrai respostas do fluxo. Cada uma vem como <LF>payload<CR><LF>, mas o
 * modulo nem sempre e rigoroso, entao aceitamos qualquer bloco delimitado por
 * CR/LF e descartamos os vazios.
 */
class Parser {
  constructor() {
    this.buf = Buffer.alloc(0);
  }

  push(chunk) {
    this.buf = Buffer.concat([this.buf, chunk]);
    const respostas = [];
    let inicio = 0;

    for (let i = 0; i < this.buf.length; i++) {
      const b = this.buf[i];
      if (b !== CR && b !== LF) continue;
      const bruto = this.buf.subarray(inicio, i).toString('ascii').trim();
      if (bruto) respostas.push(bruto);
      inicio = i + 1;
    }

    this.buf = this.buf.subarray(inicio);
    // Guarda contra lixo sem terminador que cresceria pra sempre.
    if (this.buf.length > 4096) this.buf = Buffer.alloc(0);
    return respostas;
  }
}

/**
 * Resposta de tag (comandos Q e U): letra + PC(4) + EPC(n) + CRC16(4), em hex.
 * Sem tag no campo, vem so a letra.
 */
function parseTag(resposta) {
  const corpo = resposta.slice(1).trim();
  if (!corpo || !/^[0-9A-Fa-f]+$/.test(corpo) || corpo.length < 12) return null;
  return {
    pc: corpo.slice(0, 4).toUpperCase(),
    epc: corpo.slice(4, -4).toUpperCase(),
    crc: corpo.slice(-4).toUpperCase(),
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
    throw new Error(`mais de uma porta USB-serial, escolha com --port:\n  ${provaveis.join('\n  ')}`);
  }
  if (portas.length === 1) return portas[0];
  throw new Error('nenhuma porta USB-serial encontrada. Plugue o adaptador e rode `node fm50x.mjs ports`.');
}

/** Leitura por polling: a porta e aberta em O_NONBLOCK pra nao travar o exit. */
function iniciarLeitor(fd, onData) {
  const buf = Buffer.alloc(4096);
  let parado = false;

  const loop = () => {
    if (parado) return;
    fs.read(fd, buf, 0, buf.length, null, (err, n) => {
      if (parado) return;
      if (err) {
        if (err.code === 'EAGAIN' || err.code === 'EINTR') return setTimeout(loop, 5);
        console.error(`\nerro de leitura: ${err.message}`);
        return;
      }
      if (n > 0) onData(Buffer.from(buf.subarray(0, n)));
      n > 0 ? setImmediate(loop) : setTimeout(loop, 10);
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
    // O stty precisa vir depois da abertura, senao o macOS reseta pra 9600.
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
      for (const r of this.parser.push(chunk)) {
        for (const h of [...this.handlers]) h(r);
      }
    });
  }

  enviar(cmd) {
    const buf = Buffer.from(cmd + '\r', 'ascii');
    let escrito = 0;
    for (let t = 0; escrito < buf.length && t < 200; t++) {
      try {
        escrito += fs.writeSync(this.fd, buf, escrito, buf.length - escrito);
      } catch (e) {
        if (e.code !== 'EAGAIN') throw e;
      }
    }
    if (escrito < buf.length) throw new Error('nao consegui escrever na serial');
  }

  /** Envia e espera a resposta correspondente (mesma letra inicial). */
  pedir(cmd, ms = 1000) {
    const letra = cmd[0].toUpperCase();
    return new Promise((resolve, reject) => {
      const timer = setTimeout(() => {
        this.handlers.delete(h);
        reject(new Error(`sem resposta a "${cmd}" (timeout ${ms}ms)`));
      }, ms);
      const h = (r) => {
        if (r.toUpperCase() === 'X') {
          clearTimeout(timer);
          this.handlers.delete(h);
          return reject(new Error(`o modulo nao reconheceu o comando "${cmd}"`));
        }
        if (r[0].toUpperCase() !== letra) return;
        clearTimeout(timer);
        this.handlers.delete(h);
        resolve(r.slice(1).trim());
      };
      this.handlers.add(h);
      this.enviar(cmd);
    });
  }

  ouvir(cb) {
    this.handlers.add(cb);
    return () => this.handlers.delete(cb);
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

/** Devolve o valor cru do registrador de potencia, em hex. */
async function lerPotencia(dev) {
  return (await dev.pedir('N0,00')).trim().toUpperCase().padStart(2, '0');
}

async function lerRegiao(dev) {
  const v = (await dev.pedir('N4,00')).padStart(2, '0');
  return CODIGO_PARA_REGIAO[v] ?? { nome: `desconhecida (${v})`, faixa: '?' };
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
      t = { epc: tag.epc, pc: tag.pc, n: 0, ultimo: 0 };
      this.tags.set(tag.epc, t);
    }
    t.n++;
    t.ultimo = Date.now();
  }

  get segundos() {
    return (Date.now() - this.inicio) / 1000;
  }

  ordenadas() {
    return [...this.tags.values()].sort((a, b) => b.n - a.n);
  }
}

/** Inventario continuo: o comando U e pontual, entao repetimos em laco. */
function iniciarInventario(dev, col) {
  const parar = dev.ouvir((r) => {
    const letra = r[0]?.toUpperCase();
    if (letra !== 'U' && letra !== 'Q') return;
    const tag = parseTag(r);
    if (tag) col.add(tag);
  });
  const timer = setInterval(() => {
    try {
      dev.enviar('U');
    } catch {}
  }, 60);
  dev.enviar('U');
  return () => {
    clearInterval(timer);
    parar();
  };
}

// --------------------------------------------------------------- subcomandos

async function comandoInfo(dev) {
  const versao = await dev.pedir('V').catch((e) => `? (${e.message})`);
  const id = await dev.pedir('S').catch(() => '?');
  const potencia = await lerPotencia(dev).catch(() => null);
  const regiao = await lerRegiao(dev).catch(() => null);

  console.log(`
  Porta        ${dev.path} @ ${dev.baudRate} 8N1
  Firmware     ${versao}
  Reader ID    ${id}
  Potencia     ${potencia == null ? '?' : formatarPotencia(potencia)}
  Regiao       ${regiao ? `${regiao.nome.toUpperCase()}  (${regiao.faixa})` : '?'}
`);
  if (regiao && regiao.nome !== 'us') {
    console.log('  ! Regiao nao esta em US (902-928 MHz, faixa da Anatel).');
    console.log('    Ajuste com: node fm50x.mjs region us\n');
  }
}

async function comandoPotencia(dev, dbm) {
  if (!Number.isFinite(dbm) || dbm < -2 || dbm > 25) {
    throw new Error('potencia deve estar entre -2 e 25 dBm');
  }
  await dev.pedir(`N1,${dbmParaValor(dbm)}`);

  // Trocar a potencia de RF deixa o modulo surdo por um instante: ele aplica o
  // valor, mas ignora o proximo comando. Tentamos reler algumas vezes.
  let atual = null;
  for (let i = 0; i < 4 && atual === null; i++) {
    await espera(400);
    atual = await lerPotencia(dev).catch(() => null);
  }

  console.log(
    atual === null
      ? 'Potencia definida, mas o modulo nao confirmou a releitura. Rode `info` para conferir.'
      : `Potencia: ${formatarPotencia(atual)}`,
  );
}

async function comandoRegiao(dev, alvo) {
  const r = REGIOES[alvo?.toLowerCase()];
  if (!r) throw new Error(`regiao invalida "${alvo}". Opcoes: ${Object.keys(REGIOES).join(', ')}`);
  await dev.pedir(`N5,${r.code}`);
  const agora = await lerRegiao(dev);
  console.log(`Regiao: ${agora.nome.toUpperCase()} (${agora.faixa})`);
}

async function comandoRaw(dev, cmd) {
  if (!cmd) throw new Error('use: node fm50x.mjs raw "N0,00"');
  const respostas = [];
  const parar = dev.ouvir((r) => respostas.push(r));
  dev.enviar(cmd);
  await espera(800);
  parar();
  console.log(`\n  enviei   ${cmd}<CR>`);
  if (!respostas.length) console.log('  resposta (nenhuma)\n');
  else for (const r of respostas) console.log(`  resposta ${JSON.stringify(r)}`);
  console.log();
}

async function comandoScan(dev, { segundos }) {
  const potencia = await lerPotencia(dev).catch(() => '?');
  const regiao = await lerRegiao(dev).catch(() => ({ nome: '?' }));

  const col = new Coletor();
  const parar = iniciarInventario(dev, col);

  const render = () => {
    const linhas = col.ordenadas();
    process.stdout.write('\x1b[H\x1b[2J');
    console.log(`  FM-50X @ ${dev.path}   pot ${potencia}   regiao ${String(regiao.nome).toUpperCase()}`);
    console.log(
      `  ${col.segundos.toFixed(1)}s   ${col.total} leituras   ${(col.total / Math.max(col.segundos, 0.001)).toFixed(1)}/s   ${linhas.length} tag(s)\n`,
    );
    if (!linhas.length) {
      console.log('  aguardando tags...  (aproxime o cartao de teste)');
    } else {
      console.log('  EPC                                        leituras');
      console.log('  ' + '-'.repeat(56));
      for (const t of linhas) {
        const viva = Date.now() - t.ultimo < 1500 ? ' ' : '.';
        console.log(`${viva} ${t.epc.padEnd(42)} ${String(t.n).padStart(8)}`);
      }
    }
    console.log('\n  Ctrl+C para encerrar');
  };

  const pintar = setInterval(render, 400);
  render();

  const encerrar = () => {
    clearInterval(pintar);
    parar();
    render();
    dev.fechar();
    process.exit(0);
  };

  process.on('SIGINT', encerrar);
  if (segundos > 0) setTimeout(encerrar, segundos * 1000);
}

async function comandoRange(dev, rotulo, { segundos }) {
  if (!rotulo) throw new Error('informe um rotulo, ex: node fm50x.mjs range "garrafa cheia @ 50cm"');

  const potencia = await lerPotencia(dev).catch(() => '?');
  const regiao = await lerRegiao(dev).catch(() => ({ nome: '?' }));

  console.log(`\n  Medindo "${rotulo}" por ${segundos}s, potencia ${potencia} (${String(regiao.nome).toUpperCase()})`);
  console.log('  Deixe a tag parada na posicao e a mao longe dela.\n');

  const col = new Coletor();
  const parar = iniciarInventario(dev, col);

  const barra = setInterval(() => {
    process.stdout.write(
      `\r  ${col.segundos.toFixed(1)}s / ${segundos}s   ${col.total} leituras   ${col.tags.size} tag(s)   `,
    );
  }, 200);

  await espera(segundos * 1000);
  clearInterval(barra);
  parar();

  const dur = col.segundos;
  const taxa = col.total / dur;
  const epcs = col.ordenadas().map((t) => t.epc);

  process.stdout.write('\r' + ' '.repeat(70) + '\r');
  console.log(`\n  ${rotulo}`);
  console.log('  ' + '-'.repeat(50));
  console.log(`  leituras       ${col.total} em ${dur.toFixed(1)}s  (${taxa.toFixed(1)}/s)`);
  console.log(`  tags unicas    ${epcs.length}${epcs.length ? '  ' + epcs.join(', ') : ''}`);
  console.log(
    `  veredito       ${taxa >= 5 ? 'LE BEM' : taxa >= 1 ? 'LE NO LIMITE' : taxa > 0 ? 'MARGINAL' : 'NAO LE'}\n`,
  );

  const csv = path.join(HERE, 'medicoes.csv');
  if (!fs.existsSync(csv)) {
    fs.writeFileSync(csv, 'timestamp,rotulo,segundos,potencia_dbm,regiao,tags_unicas,leituras,leituras_por_s,epcs\n');
  }
  fs.appendFileSync(
    csv,
    [
      new Date().toISOString(),
      JSON.stringify(rotulo),
      dur.toFixed(1),
      potencia,
      regiao.nome,
      epcs.length,
      col.total,
      taxa.toFixed(2),
      JSON.stringify(epcs.join(' ')),
    ].join(',') + '\n',
  );
  console.log(`  registrado em ${path.relative(process.cwd(), csv)}\n`);

  dev.fechar();
  process.exit(0);
}

async function comandoMonitor(dev, { segundos }) {
  console.log(`\n  Escutando ${dev.path} a ${dev.baudRate} baud, sem transmitir nada.\n`);
  const t0 = Date.now();
  let n = 0;

  dev.onRaw = (chunk) => {
    n += chunk.length;
    const ascii = [...chunk].map((b) => (b >= 0x20 && b < 0x7f ? String.fromCharCode(b) : '.')).join('');
    console.log(`  +${String(Date.now() - t0).padStart(6)}ms  ${chunk.length}B  ${chunk.toString('hex').toUpperCase().slice(0, 40)}  ${ascii.slice(0, 24)}`);
  };

  const encerrar = () => {
    console.log(`\n  ${n} bytes em ${((Date.now() - t0) / 1000).toFixed(1)}s\n`);
    dev.fechar();
    process.exit(0);
  };
  process.on('SIGINT', encerrar);
  if (segundos > 0) setTimeout(encerrar, segundos * 1000);
}

// -------------------------------------------------------------------- entrada

function parseArgs(argv) {
  const flags = {};
  const pos = [];
  for (let i = 0; i < argv.length; i++) {
    if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i];
    else pos.push(argv[i]);
  }
  return { flags, pos };
}

const AJUDA = `
  Bancada FM-50X — leitor UHF RFID (protocolo ASCII, 38400 8N1)

    node fm50x.mjs ports                  lista as portas seriais
    node fm50x.mjs info                   firmware, ID, potencia e regiao
    node fm50x.mjs power <-2..25>         define a potencia em dBm
    node fm50x.mjs region <us|eu|...>     define a regiao (us = faixa da Anatel)
    node fm50x.mjs scan [--seconds N]     inventario continuo, tabela ao vivo
    node fm50x.mjs range "<rotulo>"       mede alcance e grava em medicoes.csv
    node fm50x.mjs raw "<comando>"        envia comando cru, mostra a resposta
    node fm50x.mjs monitor                escuta pura, sem transmitir

  Flags: --port /dev/cu.xxx   --seconds N   --baud N
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
      console.log(`   ${provavel ? '->' : '  '} ${p}${provavel ? '   (provavel adaptador USB-serial)' : ''}`);
    }
    if (!portas.some((p) => PROVAVEL.test(p))) {
      console.log('\n  nenhuma parece adaptador USB-serial — plugue e rode de novo.');
    }
    console.log();
    return;
  }

  const dev = new Device(flags.port ?? autodetectar(), flags.baud ? Number(flags.baud) : BAUD);
  dev.abrir();
  await espera(150);

  const segundos = Number(flags.seconds ?? (cmd === 'range' ? 10 : 0));

  if (cmd === 'monitor') return comandoMonitor(dev, { segundos });

  switch (cmd) {
    case 'info':
      await comandoInfo(dev);
      break;
    case 'power':
      await comandoPotencia(dev, Number(resto[0]));
      break;
    case 'region':
      await comandoRegiao(dev, resto[0]);
      break;
    case 'raw':
      await comandoRaw(dev, resto.join(' '));
      break;
    case 'scan':
      return comandoScan(dev, { segundos });
    case 'range':
      return comandoRange(dev, resto.join(' '), { segundos });
    default:
      console.log(AJUDA);
  }

  dev.fechar();
  process.exit(0);
}

export {
  Parser,
  parseTag,
  dbmParaValor,
  valorParaDbm,
  formatarPotencia,
  REGIOES,
  // usados pelo live.mjs
  Device,
  Coletor,
  autodetectar,
  listarPortas,
  iniciarInventario,
  lerPotencia,
  lerRegiao,
  espera,
  BAUD,
};

const rodandoDireto = process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href;

if (rodandoDireto) {
  main().catch((e) => {
    console.error(`\n  erro: ${e.message}\n`);
    process.exit(1);
  });
}
