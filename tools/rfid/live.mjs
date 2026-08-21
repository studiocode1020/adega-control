#!/usr/bin/env node
/**
 * Painel ao vivo do leitor FM-50X.
 *
 * Le a serial, roda inventario continuo e transmite o estado para o navegador
 * por SSE. Zero dependencias — http nativo do Node e uma pagina embutida.
 *
 *   node tools/rfid/live.mjs [--http 7070] [--port /dev/cu.xxx]
 *
 * A arquitetura (dispositivo -> servidor -> tela) e de proposito a mesma que o
 * ESP32 vai usar depois; so troca a origem dos dados.
 */

import http from 'node:http';
import {
  Device,
  autodetectar,
  iniciarInventario,
  Coletor,
  lerPotencia,
  lerRegiao,
  formatarPotencia,
  parseTag,
  espera,
} from './fm50x.mjs';

const flags = {};
for (let i = 2; i < process.argv.length; i++) {
  if (process.argv[i].startsWith('--')) flags[process.argv[i].slice(2)] = process.argv[++i];
}

const PORTA_HTTP = Number(flags.http ?? 7070);
const JANELA_MS = 3000; // janela da taxa instantanea

// ---------------------------------------------------------------- estado

const estado = {
  conectado: false,
  porta: null,
  potencia: '?',
  regiao: '?',
  erro: null,
};

let col = new Coletor();
let recentes = []; // timestamps das ultimas leituras, para a taxa instantanea

function taxaInstantanea() {
  const agora = Date.now();
  recentes = recentes.filter((t) => agora - t < JANELA_MS);
  return recentes.length / (JANELA_MS / 1000);
}

function snapshot() {
  const agora = Date.now();
  return {
    ...estado,
    segundos: col.segundos,
    total: col.total,
    taxa: taxaInstantanea(),
    taxaMedia: col.total / Math.max(col.segundos, 0.001),
    tags: col.ordenadas().map((t) => ({
      epc: t.epc,
      pc: t.pc,
      n: t.n,
      msAtras: agora - t.ultimo,
    })),
  };
}

// ---------------------------------------------------------------- serial

let dev;

async function iniciarLeitor() {
  const caminho = flags.port ?? autodetectar();
  dev = new Device(caminho);
  dev.abrir();
  await espera(200);

  estado.porta = caminho;
  estado.conectado = true;
  estado.potencia = await lerPotencia(dev).catch(() => '?');
  const r = await lerRegiao(dev).catch(() => null);
  estado.regiao = r ? r.nome.toUpperCase() : '?';

  // O Coletor agrega; este ouvinte alimenta a taxa instantanea.
  dev.ouvir((resposta) => {
    const letra = resposta[0]?.toUpperCase();
    if ((letra === 'U' || letra === 'Q') && parseTag(resposta)) recentes.push(Date.now());
  });

  iniciarInventario(dev, col);
  console.log(`  leitor em ${caminho}, potencia ${formatarPotencia(estado.potencia)}, regiao ${estado.regiao}`);
}

// ------------------------------------------------------------------ http

const clientes = new Set();

const servidor = http.createServer((req, res) => {
  const url = new URL(req.url, 'http://localhost');

  if (url.pathname === '/events') {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
    });
    res.write(`data: ${JSON.stringify(snapshot())}\n\n`);
    clientes.add(res);
    req.on('close', () => clientes.delete(res));
    return;
  }

  if (url.pathname === '/reset') {
    col = new Coletor();
    recentes = [];
    iniciarInventario(dev, col); // religa o ouvinte no coletor novo
    res.writeHead(204).end();
    return;
  }

  res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
  res.end(PAGINA);
});

setInterval(() => {
  const dados = `data: ${JSON.stringify(snapshot())}\n\n`;
  for (const c of clientes) c.write(dados);
}, 200);

// ----------------------------------------------------------------- pagina

const PAGINA = `<!doctype html>
<html lang="pt-BR">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Adega · Leitor RFID ao vivo</title>
<style>
  :root{
    --bg:#0f0a0a; --painel:#1a1010; --linha:#2e1c1e;
    --vinho:#722F37; --vinho-claro:#a24450; --ouro:#C9A84C;
    --texto:#f3e9e0; --fraco:#9a8378; --ok:#4ea36a;
  }
  *{box-sizing:border-box;margin:0;padding:0;}
  body{
    background:var(--bg); color:var(--texto);
    font-family:-apple-system,BlinkMacSystemFont,"Segoe UI",Helvetica,sans-serif;
    padding:28px; min-height:100vh;
  }
  header{display:flex;align-items:center;gap:14px;flex-wrap:wrap;margin-bottom:26px;}
  h1{font-size:19px;font-weight:600;letter-spacing:.3px;}
  .pill{
    font-size:12px;padding:5px 12px;border-radius:999px;
    background:var(--painel);border:1px solid var(--linha);color:var(--fraco);
  }
  .pill b{color:var(--texto);font-weight:600;}
  .status{display:flex;align-items:center;gap:7px;}
  .dot{width:9px;height:9px;border-radius:50%;background:#7a2b2b;}
  .dot.on{background:var(--ok);box-shadow:0 0 0 0 rgba(78,163,106,.6);animation:pulso 2s infinite;}
  @keyframes pulso{
    0%{box-shadow:0 0 0 0 rgba(78,163,106,.5);}
    70%{box-shadow:0 0 0 9px rgba(78,163,106,0);}
    100%{box-shadow:0 0 0 0 rgba(78,163,106,0);}
  }
  .placar{display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:26px;}
  .caixa{
    background:var(--painel);border:1px solid var(--linha);border-radius:14px;padding:18px 20px;
  }
  .caixa .rotulo{font-size:11px;text-transform:uppercase;letter-spacing:1.2px;color:var(--fraco);margin-bottom:8px;}
  .caixa .valor{font-size:34px;font-weight:700;line-height:1;font-variant-numeric:tabular-nums;}
  .caixa .unidade{font-size:14px;color:var(--fraco);font-weight:400;margin-left:4px;}
  .caixa.destaque{border-color:var(--vinho);background:linear-gradient(160deg,#241315,#1a1010);}
  .caixa.destaque .valor{color:var(--ouro);}
  .veredito{font-size:12px;margin-top:9px;font-weight:600;letter-spacing:.4px;}
  h2{font-size:13px;text-transform:uppercase;letter-spacing:1.2px;color:var(--fraco);margin-bottom:12px;font-weight:600;}
  .tag{
    background:var(--painel);border:1px solid var(--linha);border-left:3px solid var(--linha);
    border-radius:12px;padding:15px 18px;margin-bottom:10px;
    display:flex;align-items:center;gap:18px;flex-wrap:wrap;
    transition:border-left-color .35s, background .35s;
  }
  .tag.viva{border-left-color:var(--ouro);background:#201416;}
  .tag .epc{
    font-family:"SF Mono",Menlo,Consolas,monospace;font-size:15px;letter-spacing:.6px;
    flex:1;min-width:250px;word-break:break-all;
  }
  .tag .n{font-size:22px;font-weight:700;font-variant-numeric:tabular-nums;}
  .tag .n span{font-size:11px;color:var(--fraco);font-weight:400;display:block;text-align:right;}
  .tag .quando{font-size:11px;color:var(--fraco);min-width:74px;text-align:right;}
  .vazio{
    border:1px dashed var(--linha);border-radius:14px;padding:44px;text-align:center;color:var(--fraco);font-size:14px;
  }
  button{
    background:transparent;border:1px solid var(--linha);color:var(--fraco);
    padding:7px 15px;border-radius:8px;font-size:12px;cursor:pointer;font-family:inherit;
  }
  button:hover{border-color:var(--vinho-claro);color:var(--texto);}
  footer{margin-top:26px;font-size:11.5px;color:var(--fraco);}
</style>
</head>
<body>
  <header>
    <h1>Leitor RFID · ao vivo</h1>
    <div class="pill status"><span class="dot" id="dot"></span><span id="conexao">conectando…</span></div>
    <div class="pill">porta <b id="porta">—</b></div>
    <div class="pill">potência <b id="potencia">—</b></div>
    <div class="pill">região <b id="regiao">—</b></div>
    <button onclick="fetch('/reset')">zerar contadores</button>
  </header>

  <div class="placar">
    <div class="caixa destaque">
      <div class="rotulo">leituras por segundo</div>
      <div class="valor"><span id="taxa">0,0</span><span class="unidade">/s</span></div>
      <div class="veredito" id="veredito">—</div>
    </div>
    <div class="caixa">
      <div class="rotulo">tags distintas</div>
      <div class="valor" id="distintas">0</div>
    </div>
    <div class="caixa">
      <div class="rotulo">total de leituras</div>
      <div class="valor" id="total">0</div>
    </div>
    <div class="caixa">
      <div class="rotulo">tempo de sessão</div>
      <div class="valor" id="tempo">0<span class="unidade">s</span></div>
    </div>
  </div>

  <h2>Tags no campo</h2>
  <div id="lista"><div class="vazio">Nenhuma tag lida ainda — aproxime uma tag da face prateada do módulo.</div></div>

  <footer>Janela da taxa instantânea: 3 s · atualização a cada 200 ms</footer>

<script>
const n1 = (v) => v.toFixed(1).replace('.', ',');

function vereditoDe(taxa){
  if (taxa >= 5) return ['LÊ BEM', '#4ea36a'];
  if (taxa >= 1) return ['LÊ NO LIMITE', '#C9A84C'];
  if (taxa > 0)  return ['MARGINAL', '#c87f3e'];
  return ['SEM LEITURA', '#9a8378'];
}

const fonte = new EventSource('/events');

fonte.onmessage = (ev) => {
  const d = JSON.parse(ev.data);

  document.getElementById('dot').className = 'dot' + (d.conectado ? ' on' : '');
  document.getElementById('conexao').textContent = d.conectado ? 'conectado' : 'desconectado';
  document.getElementById('porta').textContent = d.porta ? d.porta.replace('/dev/cu.', '') : '—';
  document.getElementById('potencia').textContent = d.potencia;
  document.getElementById('regiao').textContent = d.regiao;

  document.getElementById('taxa').textContent = n1(d.taxa);
  document.getElementById('distintas').textContent = d.tags.length;
  document.getElementById('total').textContent = d.total;
  document.getElementById('tempo').textContent = Math.floor(d.segundos);

  const [txt, cor] = vereditoDe(d.taxa);
  const vd = document.getElementById('veredito');
  vd.textContent = txt;
  vd.style.color = cor;

  const lista = document.getElementById('lista');
  if (!d.tags.length) {
    lista.innerHTML = '<div class="vazio">Nenhuma tag lida ainda — aproxime uma tag da face prateada do módulo.</div>';
    return;
  }

  lista.innerHTML = d.tags.map((t) => {
    const viva = t.msAtras < 1200;
    const quando = viva ? 'agora' : (t.msAtras / 1000).toFixed(1).replace('.', ',') + 's atrás';
    return '<div class="tag' + (viva ? ' viva' : '') + '">'
      + '<div class="epc">' + t.epc + '</div>'
      + '<div class="quando">' + quando + '</div>'
      + '<div class="n">' + t.n + '<span>leituras</span></div>'
      + '</div>';
  }).join('');
};

fonte.onerror = () => {
  document.getElementById('dot').className = 'dot';
  document.getElementById('conexao').textContent = 'servidor offline';
};
</script>
</body>
</html>`;

// ------------------------------------------------------------------ inicio

try {
  await iniciarLeitor();
} catch (e) {
  console.error(`\n  erro: ${e.message}\n`);
  process.exit(1);
}

servidor.listen(PORTA_HTTP, () => {
  console.log(`\n  painel ao vivo em  http://localhost:${PORTA_HTTP}\n  Ctrl+C para encerrar\n`);
});

process.on('SIGINT', () => {
  dev?.fechar();
  process.exit(0);
});
