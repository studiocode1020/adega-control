// Portal da Adega — firmware do aparelho da porta
//
// Marco 4: o ESP32 le o FM-50X sem parar e manda para o app cada garrafa que
// passa pela porta. Quem decide se ela entrou ou saiu e o servidor (pelo
// estado da garrafa), e quem confirma e o dono, no sininho do app. O aparelho
// so responde "esta etiqueta passou, de tal a tal instante".
//
//   leitor --UART--> ESP32 --WiFi/HTTPS--> /api/portal/leituras --> sininho
//
// Placa: ESP32-S3, 16 MB flash. Fiacao validada em 09/11/2026 (repos
// axcosta/poc-rfid e poc-gateway) — veja firmware/README.md.
//
// IMPORTANTE para quem edita: o ctags desta maquina foi trocado por um shim,
// entao o Arduino NAO gera prototipos. Toda funcao precisa estar escrita
// ANTES de ser usada.

#include <WiFi.h>
#include <HTTPClient.h>
#include <NetworkClientSecure.h>
#include <esp_random.h>
#include "secrets.h"
#include "certificados.h"

#ifndef PORTAL_URL
#define PORTAL_URL "https://adega-control.vercel.app/api/portal/leituras"
#endif
#ifndef PORTAL_CHAVE
#define PORTAL_CHAVE ""
#endif

static const char *VERSAO = "portal-adega 0.4";

// ---------------------------------------------------------------- a fiacao
//
//   FM-50X (J1)        ESP32-S3      observacao
//   -----------        --------      ------------------------------------
//   VCC .............. 3V3           validado assim (no 5V o leitor ficou mudo)
//   GND .............. GND
//   TX  .............. GPIO16        o leitor fala, o ESP ouve
//   RX  .............. GPIO17        o ESP fala, o leitor ouve
//   EN  .............. 3V3           sempre ligado (veja PINO_EN_LEITOR)
//
// TX cruza com RX. Ligar TX no TX nao gera erro: so nao chega resposta.

static const int PINO_RX_DO_ESP = 16;  // vai no TX do leitor
static const int PINO_TX_DO_ESP = 17;  // vai no RX do leitor
// -1 = EN ligado direto no 3V3. Para a versao a bateria, ligue o EN num GPIO
// livre (ex.: 4) e ponha o numero aqui: o firmware passa a desligar o radio.
static const int PINO_EN_LEITOR = -1;

// Protocolo ASCII 38400 8N1 (NAO e o binario BB..7E do R200).
//   envio    <LF><comando><CR>   (o LF na frente e como o poc-rfid fala)
//   resposta <LF><letra do comando><dados><CR><LF>
//   comando desconhecido -> <LF>X<CR><LF>
static const uint32_t LEITOR_BAUD = 38400;
HardwareSerial &leitor = Serial1;

static const uint32_t WIFI_TIMEOUT_MS = 20000;
static const uint32_t INVENTARIO_MS = 60;    // ritmo do comando U, igual a bancada
static const uint32_t RELATORIO_MS = 2000;
static const uint32_t SILENCIO_MS = 5000;

// --- passagens ---
// Etiqueta que some por mais que isso terminou de passar. Curto demais
// quebra uma passagem em varias (o leitor falha leituras); longo demais
// atrasa o aviso no app.
static const uint32_t FIM_DA_PASSAGEM_MS = 2500;
// Garrafa parada no alcance nunca "termina de passar"; de tempos em tempos
// fechamos a passagem mesmo assim, e o servidor a reconhece como parada.
static const uint32_t PASSAGEM_MAXIMA_MS = 10UL * 60 * 1000;

// --- envio ---
static const int ENVIO_LOTE = 20;
static const uint32_t SINAL_DE_VIDA_MS = 5UL * 60 * 1000;  // o app mostra "ligado"
static const uint32_t ESPERA_MAXIMA_MS = 60000;

enum RespostaLeitor { RESP_OK, RESP_TIMEOUT, RESP_NAO_ENTENDEU };

// ------------------------------------------------------------ estado do RF

// Contagem por etiqueta, para a medicao de alcance (z zera).
struct TagVista {
  char epc[41];
  uint32_t leituras;
  uint32_t visto;
};
static const int MAX_TAGS = 16;
static TagVista tags[MAX_TAGS];
static int nTags = 0;

static uint32_t leiturasTotais = 0;
static uint32_t leiturasNaJanela = 0;
static uint32_t ultimoByteDoLeitor = 0;
static bool inventarioAtivo = false;
static bool leitorRespondeu = false;
// Comando de inventario. O U (varias etiquetas) e o da bancada; se o modulo
// responder X a ele, caimos para o Q (uma etiqueta por vez), que o poc-rfid usa.
static const char *comandoInventario = "U";
static int naoEntendeuSeguidos = 0;

// Passagem em andamento: a etiqueta ainda esta sendo lida.
struct PassagemAberta {
  bool ativa;
  char epc[41];
  uint32_t inicio;
  uint32_t fim;
  uint32_t leituras;
};
static const int MAX_ABERTAS = 16;
static PassagemAberta abertas[MAX_ABERTAS];

// Passagem pronta para enviar. `seq` cresce sempre; o envio apaga da fila
// so ate o seq que o servidor confirmou.
struct PassagemFechada {
  uint32_t seq;
  char epc[41];
  uint32_t inicio;
  uint32_t fim;
  uint32_t leituras;
};
static const int MAX_FILA = 64;
static PassagemFechada fila[MAX_FILA];
static int filaInicio = 0;
static int filaTamanho = 0;
static uint32_t proximoSeq = 1;
static uint32_t descartadas = 0;
static SemaphoreHandle_t travaFila;

// Id da passagem = <boot>-<seq>. O boot e sorteado a cada ligada, entao o id
// nunca se repete, e o servidor reconhece um reenvio pelo mesmo id.
static char idDoBoot[9];

// Painel do envio (escrito pela tarefa de envio, lido pelo [vivo])
static volatile int ultimoStatusHttp = 0;
static volatile uint32_t ultimoEnvioOk = 0;
static volatile uint32_t enviadasTotal = 0;
static volatile bool forcarEnvio = false;

// ------------------------------------------------------------- identidade

static void mostrarIdentidade() {
  Serial.println();
  Serial.println("=========================================");
  Serial.printf("  Portal da Adega — %s\n", VERSAO);
  Serial.println("=========================================");
  Serial.printf("Chip .......... %s rev %d\n", ESP.getChipModel(), ESP.getChipRevision());
  Serial.printf("Flash ......... %u MB\n", ESP.getFlashChipSize() / (1024 * 1024));
  Serial.printf("Boot .......... %s\n", idDoBoot);
  Serial.printf("App ........... %s\n", PORTAL_URL);
  Serial.printf("Chave ......... %s\n", strlen(PORTAL_CHAVE) ? "configurada" : "FALTANDO — nada sera enviado");
  Serial.println("-----------------------------------------");
}

// ------------------------------------------------------------------- WiFi

static const char *motivoDaFalha(wl_status_t status) {
  switch (status) {
    case WL_NO_SSID_AVAIL: return "rede nao encontrada (nome errado, ou e uma rede 5 GHz)";
    case WL_CONNECT_FAILED: return "senha recusada";
    case WL_CONNECTION_LOST: return "conexao caiu no meio";
    case WL_DISCONNECTED: return "nao completou o handshake (sinal fraco ou senha errada)";
    default: return "motivo desconhecido";
  }
}

static bool conectarWiFi() {
  Serial.printf("Conectando em \"%s\"", WIFI_SSID);
  WiFi.mode(WIFI_STA);
  WiFi.setHostname("portal-adega");
  WiFi.begin(WIFI_SSID, WIFI_SENHA);

  uint32_t inicio = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - inicio < WIFI_TIMEOUT_MS) {
    delay(400);
    Serial.print(".");
  }
  Serial.println();

  if (WiFi.status() != WL_CONNECTED) {
    Serial.printf("FALHOU: %s (o leitor funciona igual; as passagens esperam na fila)\n",
                  motivoDaFalha(WiFi.status()));
    return false;
  }
  Serial.printf("CONECTADO  IP %s  sinal %d dBm  MAC %s\n", WiFi.localIP().toString().c_str(), WiFi.RSSI(),
                WiFi.macAddress().c_str());
  return true;
}

// Reconecta sem bloquear: a leitura nao pode parar porque o roteador piscou.
static void cuidarDoWiFi() {
  static uint32_t ultimaTentativa = 0;
  if (WiFi.status() == WL_CONNECTED) return;
  if (millis() - ultimaTentativa < 15000) return;
  ultimaTentativa = millis();
  Serial.println("[wifi] fora do ar — tentando reconectar (a leitura continua)");
  WiFi.disconnect();
  WiFi.begin(WIFI_SSID, WIFI_SENHA);
}

// ------------------------------------------------------------------- fila

static void enfileirar(const PassagemAberta &p) {
  xSemaphoreTake(travaFila, portMAX_DELAY);
  if (filaTamanho == MAX_FILA) {
    // Sem rede por muito tempo: perde a mais antiga, que e a que tem mais
    // chance de ja ter sido resolvida a mao no app.
    filaInicio = (filaInicio + 1) % MAX_FILA;
    filaTamanho--;
    descartadas++;
  }
  PassagemFechada &f = fila[(filaInicio + filaTamanho) % MAX_FILA];
  f.seq = proximoSeq++;
  strncpy(f.epc, p.epc, sizeof(f.epc));
  f.inicio = p.inicio;
  f.fim = p.fim;
  f.leituras = p.leituras;
  filaTamanho++;
  xSemaphoreGive(travaFila);
}

static int tamanhoDaFila() {
  xSemaphoreTake(travaFila, portMAX_DELAY);
  int n = filaTamanho;
  xSemaphoreGive(travaFila);
  return n;
}

// ------------------------------------------------------------ passagens

static void abrirOuEstender(const String &epc) {
  uint32_t agora = millis();
  int livre = -1;
  for (int i = 0; i < MAX_ABERTAS; i++) {
    if (abertas[i].ativa && epc.equals(abertas[i].epc)) {
      abertas[i].fim = agora;
      abertas[i].leituras++;
      return;
    }
    if (!abertas[i].ativa && livre < 0) livre = i;
  }
  if (livre < 0) return;  // 16 etiquetas no campo ao mesmo tempo: ignora a 17a
  PassagemAberta &p = abertas[livre];
  p.ativa = true;
  epc.toCharArray(p.epc, sizeof(p.epc));
  p.inicio = agora;
  p.fim = agora;
  p.leituras = 1;
  Serial.printf("[passagem] %s entrou no alcance\n", p.epc);
}

static void fecharPassagens() {
  uint32_t agora = millis();
  for (int i = 0; i < MAX_ABERTAS; i++) {
    PassagemAberta &p = abertas[i];
    if (!p.ativa) continue;
    bool sumiu = agora - p.fim > FIM_DA_PASSAGEM_MS;
    bool longaDemais = p.fim - p.inicio > PASSAGEM_MAXIMA_MS;
    if (!sumiu && !longaDemais) continue;
    enfileirar(p);
    Serial.printf("[passagem] %s  %.1f s, %lu leituras -> fila (%d)%s\n", p.epc,
                  (p.fim - p.inicio) / 1000.0f, (unsigned long)p.leituras, tamanhoDaFila(),
                  longaDemais ? "  [parada no alcance]" : "");
    if (longaDemais && !sumiu) {
      // continua lida: abre outra passagem a partir da ultima leitura (nunca
      // de `agora`: fim < inicio daria conta negativa sem sinal)
      p.inicio = p.fim;
      p.leituras = 0;
    } else {
      p.ativa = false;
    }
  }
}

// ------------------------------------------------------------------ envio
//
// Roda numa tarefa propria, no nucleo 0. O HTTPS leva 1-2 s por envio (o
// aperto de mao TLS e caro no ESP32); se fosse no loop, a leitura pararia
// junto e a garrafa que passasse nesse meio tempo nao seria vista.

static String montarCorpo(PassagemFechada *lote, int n) {
  uint32_t agora = millis();
  String corpo;
  corpo.reserve(120 + n * 130);
  corpo += "{\"firmware\":\"";
  corpo += VERSAO;
  corpo += "\",\"avistamentos\":[";
  for (int i = 0; i < n; i++) {
    if (i) corpo += ',';
    corpo += "{\"id\":\"";
    corpo += idDoBoot;
    corpo += '-';
    corpo += String(lote[i].seq);
    corpo += "\",\"epc\":\"";
    corpo += lote[i].epc;  // so hex: nao precisa escapar
    corpo += "\",\"idade_inicio_ms\":";
    corpo += String(agora - lote[i].inicio);
    corpo += ",\"idade_fim_ms\":";
    corpo += String(agora - lote[i].fim);
    corpo += ",\"leituras\":";
    corpo += String(lote[i].leituras);
    corpo += '}';
  }
  corpo += "]}";
  return corpo;
}

static int postar(const String &corpo, String &resposta) {
  HTTPClient http;
  NetworkClientSecure seguro;
  NetworkClient simples;
  bool https = strncmp(PORTAL_URL, "https://", 8) == 0;

  bool ok;
  if (https) {
    seguro.setCACert(CERTIFICADOS_RAIZ);
    ok = http.begin(seguro, PORTAL_URL);
  } else {
    ok = http.begin(simples, PORTAL_URL);  // so para teste na rede local
  }
  if (!ok) return -1;

  http.setTimeout(10000);
  http.addHeader("Content-Type", "application/json");
  http.addHeader("Authorization", String("Bearer ") + PORTAL_CHAVE);
  int status = http.POST(corpo);
  resposta = status > 0 ? http.getString() : http.errorToString(status);
  http.end();
  return status;
}

static void tarefaEnvio(void *) {
  static PassagemFechada lote[ENVIO_LOTE];
  uint32_t espera = 1000;
  uint32_t ultimaTentativa = 0;
  bool avisouSemChave = false;

  for (;;) {
    vTaskDelay(pdMS_TO_TICKS(250));

    if (!strlen(PORTAL_CHAVE)) {
      if (!avisouSemChave) {
        Serial.println("[envio] sem PORTAL_CHAVE no secrets.h — gere a chave na tela Portal RFID do app");
        avisouSemChave = true;
      }
      continue;
    }
    if (WiFi.status() != WL_CONNECTED) continue;

    bool urgente = forcarEnvio;
    if (!urgente && millis() - ultimaTentativa < espera) continue;

    xSemaphoreTake(travaFila, portMAX_DELAY);
    int n = filaTamanho < ENVIO_LOTE ? filaTamanho : ENVIO_LOTE;
    for (int i = 0; i < n; i++) lote[i] = fila[(filaInicio + i) % MAX_FILA];
    xSemaphoreGive(travaFila);

    bool sinalDeVida = n == 0 && (ultimoEnvioOk == 0 || millis() - ultimoEnvioOk > SINAL_DE_VIDA_MS);
    if (n == 0 && !sinalDeVida && !urgente) continue;
    forcarEnvio = false;
    ultimaTentativa = millis();

    String resposta;
    int status = postar(montarCorpo(lote, n), resposta);
    ultimoStatusHttp = status;

    if (status == 200) {
      // apaga da fila so o que foi enviado (pode ter chegado mais no meio)
      uint32_t ateSeq = n ? lote[n - 1].seq : 0;
      xSemaphoreTake(travaFila, portMAX_DELAY);
      while (filaTamanho && fila[filaInicio].seq <= ateSeq) {
        filaInicio = (filaInicio + 1) % MAX_FILA;
        filaTamanho--;
      }
      xSemaphoreGive(travaFila);
      enviadasTotal += n;
      ultimoEnvioOk = millis();
      espera = 1000;
      if (n) Serial.printf("[envio] %d passagem(ns) entregue(s) ao app: %s\n", n, resposta.substring(0, 200).c_str());
      else Serial.println("[envio] sinal de vida ok");
    } else {
      espera = espera * 2 > ESPERA_MAXIMA_MS ? ESPERA_MAXIMA_MS : espera * 2;
      if (status == 401) {
        Serial.println("[envio] 401: o app recusou a chave. Confira PORTAL_CHAVE (ou o aparelho foi apagado no app).");
        espera = ESPERA_MAXIMA_MS;
      } else {
        Serial.printf("[envio] falhou (%d: %s) — tento de novo em %lu s, nada se perde\n", status,
                      resposta.substring(0, 120).c_str(), (unsigned long)(espera / 1000));
      }
    }
  }
}

// ------------------------------------------------------- protocolo FM-50X

static void enviarComando(const char *cmd) {
  leitor.write('\n');
  leitor.print(cmd);
  leitor.write('\r');
}

// Monta uma resposta por vez a partir do fluxo: qualquer bloco entre CR/LF,
// descartando os vazios — mesma regra do Parser do fm50x.mjs.
static bool proximaResposta(String &saida) {
  static char buf[96];
  static uint8_t n = 0;

  while (leitor.available()) {
    char c = (char)leitor.read();
    ultimoByteDoLeitor = millis();
    if (c == '\r' || c == '\n') {
      if (n == 0) continue;
      buf[n] = '\0';
      saida = buf;
      n = 0;
      return true;
    }
    if (n < sizeof(buf) - 1) buf[n++] = c;
    else n = 0;
  }
  return false;
}

static bool ehHex(const String &s) {
  for (size_t i = 0; i < s.length(); i++) {
    if (!isHexadecimalDigit(s[i])) return false;
  }
  return s.length() > 0;
}

static void registrarTag(const String &epc) {
  leiturasTotais++;
  leiturasNaJanela++;
  abrirOuEstender(epc);

  for (int i = 0; i < nTags; i++) {
    if (epc.equals(tags[i].epc)) {
      tags[i].leituras++;
      tags[i].visto = millis();
      return;
    }
  }
  if (nTags >= MAX_TAGS) return;
  epc.toCharArray(tags[nTags].epc, sizeof(tags[nTags].epc));
  tags[nTags].leituras = 1;
  tags[nTags].visto = millis();
  nTags++;
}

// Resposta de tag (Q e U): letra + PC(4) + EPC(n) + CRC16(4), em hex.
// Sem tag no campo vem so a letra.
static bool processarComoTag(const String &r) {
  char letra = toupper(r[0]);
  if (letra != 'U' && letra != 'Q') return false;

  String corpo = r.substring(1);
  corpo.trim();
  if (corpo.length() < 12 || !ehHex(corpo)) return true;

  String epc = corpo.substring(4, corpo.length() - 4);
  epc.toUpperCase();
  registrarTag(epc);
  return true;
}

static RespostaLeitor pedir(const char *cmd, String &resposta, uint32_t ms) {
  enviarComando(cmd);
  char letra = toupper(cmd[0]);
  uint32_t inicio = millis();
  String r;

  while (millis() - inicio < ms) {
    if (!proximaResposta(r)) {
      delay(2);
      continue;
    }
    r.trim();
    if (r.length() == 0) continue;
    if (r == "X" || r == "x") return RESP_NAO_ENTENDEU;
    if (toupper(r[0]) != letra) {
      processarComoTag(r);
      continue;
    }
    resposta = r.substring(1);
    resposta.trim();
    return RESP_OK;
  }
  return RESP_TIMEOUT;
}

// -------------------------------------------------------- ligar e conhecer

static void esvaziarEntrada() {
  while (leitor.available()) leitor.read();
}

static void explicarLeitorMudo() {
  Serial.println("FALHOU: o leitor nao respondeu.");
  Serial.println("  Confira nesta ordem:");
  Serial.println("   1. TX do leitor no GPIO16 e RX do leitor no GPIO17 (CRUZADOS)");
  Serial.println("   2. VCC do leitor no 3V3 e EN do leitor no 3V3");
  Serial.println("   3. GND comum entre as duas placas");
  Serial.println("   4. Cores do cabo do kit: PRETO e TX, AZUL e GND (o preto NAO e terra)");
}

static void mostrarPotencia(const String &hex) {
  long v = strtol(hex.c_str(), nullptr, 16);
  if (v <= 0x1B) Serial.printf("  Potencia ..... %ld dBm  (registrador %s)\n", v - 2, hex.c_str());
  else Serial.printf("  Potencia ..... registrador %s\n", hex.c_str());
}

static void mostrarRegiao(const String &hex) {
  const char *faixa = "desconhecida";
  if (hex == "01") faixa = "US 902-928 MHz (faixa da Anatel)";
  else if (hex == "05") faixa = "EU 865-868 MHz — NAO le neste modulo";
  Serial.printf("  Regiao ....... %s  (codigo %s)\n", faixa, hex.c_str());
  if (hex != "01") Serial.println("  ! Fora da faixa US. Ajuste com:  >N5,01");
}

static void interrogarLeitor() {
  bool antes = inventarioAtivo;
  inventarioAtivo = false;
  esvaziarEntrada();

  String v;
  RespostaLeitor r = RESP_TIMEOUT;
  for (int i = 0; i < 3 && r != RESP_OK; i++) r = pedir("V", v, 800);

  if (r != RESP_OK) {
    leitorRespondeu = false;
    if (r == RESP_NAO_ENTENDEU) Serial.println("O leitor respondeu \"X\" (nao entendi) — baud ou protocolo errado.");
    else explicarLeitorMudo();
    inventarioAtivo = antes;
    return;
  }

  leitorRespondeu = true;
  Serial.println("LEITOR RESPONDEU");
  Serial.printf("  Firmware ..... %s\n", v.c_str());

  String s;
  if (pedir("S", s, 800) == RESP_OK) Serial.printf("  Reader ID .... %s\n", s.c_str());

  String pot;
  if (pedir("N0,00", pot, 800) == RESP_OK) {
    pot.trim();
    pot.toUpperCase();
    if (pot.length() == 1) pot = "0" + pot;
    mostrarPotencia(pot);
  }

  String reg;
  if (pedir("N4,00", reg, 800) == RESP_OK) {
    reg.trim();
    reg.toUpperCase();
    if (reg.length() == 1) reg = "0" + reg;
    mostrarRegiao(reg);
  }

  inventarioAtivo = antes;
}

static void ligarLeitor() {
  Serial.println("-----------------------------------------");
  if (PINO_EN_LEITOR >= 0) {
    Serial.printf("Ligando o leitor pelo EN (GPIO%d)...\n", PINO_EN_LEITOR);
    digitalWrite(PINO_EN_LEITOR, HIGH);
  } else {
    Serial.println("Leitor com EN no 3V3 (sempre ligado).");
  }
  delay(500);
  esvaziarEntrada();
  interrogarLeitor();
  inventarioAtivo = leitorRespondeu;
}

static void desligarLeitor() {
  if (PINO_EN_LEITOR < 0) {
    Serial.println("EN esta no 3V3: nao da para desligar o radio por software. Pausando a leitura.");
  } else {
    digitalWrite(PINO_EN_LEITOR, LOW);
    leitorRespondeu = false;
  }
  inventarioAtivo = false;
}

// ------------------------------------------------------------- inventario

static void bombearInventario() {
  static uint32_t ultimo = 0;
  if (!inventarioAtivo) return;
  if (millis() - ultimo < INVENTARIO_MS) return;
  ultimo = millis();
  enviarComando(comandoInventario);
}

static void drenarLeitor() {
  String r;
  while (proximaResposta(r)) {
    r.trim();
    if (r.length() == 0) continue;
    if (processarComoTag(r)) {
      naoEntendeuSeguidos = 0;
      continue;
    }
    if (r == "X" || r == "x") {
      if (inventarioAtivo && comandoInventario[0] == 'U' && ++naoEntendeuSeguidos >= 10) {
        comandoInventario = "Q";
        Serial.println("[leitor] o modulo nao entende U; passando a ler com Q (uma etiqueta por vez)");
      }
      continue;
    }
    Serial.printf("[leitor] %s\n", r.c_str());
  }
}

// Mesmo criterio do `range` da bancada: no portal a garrafa passa em
// movimento, entao so LE BEM serve.
static const char *veredito(float taxa) {
  if (taxa >= 5) return "LE BEM";
  if (taxa >= 1) return "LE NO LIMITE";
  if (taxa > 0) return "MARGINAL";
  return "NAO LE";
}

static void zerarContagem() {
  nTags = 0;
  leiturasTotais = 0;
  leiturasNaJanela = 0;
  Serial.println("Contadores zerados.");
}

static void relatorio() {
  static uint32_t ultimo = 0;
  uint32_t agora = millis();
  if (agora - ultimo < RELATORIO_MS) return;
  float janela = (agora - ultimo) / 1000.0f;
  ultimo = agora;
  if (leiturasNaJanela == 0) return;

  float taxa = leiturasNaJanela / janela;
  Serial.printf("[rf] %.1f leituras/s  %s  | %d tag(s), %lu leituras no total\n", taxa, veredito(taxa), nTags,
                (unsigned long)leiturasTotais);
  leiturasNaJanela = 0;
}

static void avisarSeMudo() {
  static uint32_t ultimoAviso = 0;
  if (!inventarioAtivo) return;
  if (millis() - ultimoByteDoLeitor < SILENCIO_MS) return;
  if (millis() - ultimoAviso < SILENCIO_MS) return;
  ultimoAviso = millis();
  Serial.println("[leitor] mudo ha 5 s — nem resposta vazia esta chegando. Confira os fios (i reinterroga).");
}

// ---------------------------------------------------------------- console

static void ajudaConsole() {
  Serial.println("Comandos: i=interrogar  z=zerar  f=fila  e=enviar agora  1=ler  0=pausar  >CMD=comando cru");
}

static void mostrarFila() {
  Serial.printf("Fila: %d passagem(ns) esperando | %lu entregues | %lu descartadas | ultimo HTTP %d\n",
                tamanhoDaFila(), (unsigned long)enviadasTotal, (unsigned long)descartadas, ultimoStatusHttp);
}

static void executarConsole(const char *linha) {
  if (linha[0] == '>') {
    bool antes = inventarioAtivo;
    inventarioAtivo = false;
    delay(100);
    esvaziarEntrada();
    Serial.printf("enviei   %s<CR>\n", linha + 1);
    enviarComando(linha + 1);
    uint32_t inicio = millis();
    String r;
    while (millis() - inicio < 800) {
      if (proximaResposta(r)) {
        r.trim();
        if (r.length()) Serial.printf("resposta \"%s\"\n", r.c_str());
      } else {
        delay(2);
      }
    }
    inventarioAtivo = antes;
    return;
  }

  switch (linha[0]) {
    case 'i': interrogarLeitor(); break;
    case 'z': zerarContagem(); break;
    case 'f': mostrarFila(); break;
    case 'e': forcarEnvio = true; Serial.println("Enviando agora."); break;
    case '1': ligarLeitor(); break;
    case '0': desligarLeitor(); break;
    default: ajudaConsole(); break;
  }
}

static void cuidarDoConsole() {
  static char linha[64];
  static uint8_t n = 0;
  while (Serial.available()) {
    char c = (char)Serial.read();
    if (c == '\r' || c == '\n') {
      if (n == 0) continue;
      linha[n] = '\0';
      executarConsole(linha);
      n = 0;
    } else if (n < sizeof(linha) - 1) {
      linha[n++] = c;
    }
  }
}

// ------------------------------------------------------------------ setup

void setup() {
  Serial.begin(115200);
  delay(1500);

  if (PINO_EN_LEITOR >= 0) {
    pinMode(PINO_EN_LEITOR, OUTPUT);
    digitalWrite(PINO_EN_LEITOR, LOW);  // sobe desligado; liga depois do WiFi
  }
  leitor.begin(LEITOR_BAUD, SERIAL_8N1, PINO_RX_DO_ESP, PINO_TX_DO_ESP);

  snprintf(idDoBoot, sizeof(idDoBoot), "%08lx", (unsigned long)esp_random());
  travaFila = xSemaphoreCreateMutex();

  mostrarIdentidade();
  conectarWiFi();

  // Depois do WiFi: o pico do radio no boot + o leitor juntos derrubam fonte fraca.
  ligarLeitor();

  // Envio no nucleo 0 (o do WiFi); leitura segue no loop, nucleo 1.
  xTaskCreatePinnedToCore(tarefaEnvio, "envio", 12288, nullptr, 1, nullptr, 0);

  Serial.println("-----------------------------------------");
  ajudaConsole();
}

void loop() {
  static uint32_t ultimoAviso = 0;

  cuidarDoWiFi();
  bombearInventario();
  drenarLeitor();
  fecharPassagens();
  relatorio();
  avisarSeMudo();
  cuidarDoConsole();

  if (millis() - ultimoAviso > 10000) {
    ultimoAviso = millis();
    Serial.printf("[vivo] %lu s | wifi %s %d dBm | leitor %s (%s) | fila %d | entregues %lu\n", millis() / 1000,
                  WiFi.status() == WL_CONNECTED ? WiFi.localIP().toString().c_str() : "fora", WiFi.RSSI(),
                  leitorRespondeu ? "ok" : "sem resposta", comandoInventario, tamanhoDaFila(),
                  (unsigned long)enviadasTotal);
  }
}
