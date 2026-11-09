# Firmware do Portal — ESP32-S3

O aparelho que fica na porta da adega. Lê o módulo RFID pela serial, junta as
leituras de cada etiqueta numa *passagem* e manda para o app por WiFi. Quem
decide se a garrafa entrou ou saiu é o servidor; quem confirma é o dono, no
sininho. A lógica completa está em `docs/PORTAL-RFID.md`.

```
FM-50X ──5 fios── ESP32-S3 ──WiFi/HTTPS── adega-control.vercel.app ── sininho do app
```

## A placa

| | |
|---|---|
| Chip | ESP32-S3 (QFN56) rev v0.2, 16 MB flash, 8 MB PSRAM (desligada no build) |
| MAC | `44:1B:F6:8C:6B:A8` |
| Gravação | pela porta **`USB`** (nativa) — é como o `poc-gateway` grava, e como está ligada hoje |

A placa tem duas entradas USB-C:

- **`USB`**: a USB nativa do ESP32-S3. No Mac aparece como
  `/dev/cu.usbmodem101` ("USB JTAG_serial debug unit"). Grava sem segurar
  botão. O build abaixo (`CDCOnBoot=cdc`) manda o `Serial` por ela.
- **`COM`**: passa por um conversor CH343. Também grava, mas aí o `Serial` do
  build abaixo **não** sai por ela. Para usar a `COM`, troque para
  `USBMode=default,CDCOnBoot=default`.

**A PSRAM está desligada de propósito** (`PSRAM=disabled`): escolher o tipo
errado é causa clássica de placa que não dá boot, e nada aqui precisa dela.

## Ligação com o FM-50X

Validada em 09/11/2026 (repositórios `axcosta/poc-rfid` e `axcosta/poc-gateway`).

| FM-50X (J1) | ESP32-S3 | cor do cabo do kit |
|---|---|---|
| VCC | **3V3** | 🔴 vermelho |
| GND | **GND** | 🔵 **azul** |
| TX | **GPIO16** | ⚫ **preto** |
| RX | **GPIO17** | 🟡 amarelo |
| EN | **3V3** | 🟢 verde |

- **O preto NÃO é terra.** No cabo do kit, preto é TX e azul é GND. É a
  armadilha que se repete a cada religação.
- **TX cruza com RX.** Ligar TX no TX não dá erro, só não chega resposta.
- **No pino `5V` o leitor ficou mudo** (setembro/2026): o sintoma foi as três
  linhas de dados presas em nível baixo, que é a assinatura de módulo sem
  energia. No **3V3** ele funciona.
- **Ressalva sobre o 3V3:** o leitor puxa ~300 mA e o pico do WiFi vem por
  cima. Funcionou na bancada; se aparecer **reset aleatório**, é a primeira
  suspeita — aí a saída é alimentar o leitor por uma fonte 3,3 V própria (GND
  comum com o ESP).
- **EN no 3V3** deixa o rádio sempre ligado. Para a versão a bateria, ligue o
  EN num GPIO livre (ex.: GPIO4) e mude `PINO_EN_LEITOR` no `.ino`. **Não** use
  o pino serigrafado `EN` da placa: aquele é o reset do ESP32.
- No ESP32-S3-N16R8 evite os GPIO 26–37 (flash/PSRAM), 19–20 (USB nativa),
  43–44 (UART da `COM`) e 0, 3, 45, 46 (boot).

## Credenciais

`secrets.h` está no `.gitignore` e **nunca** deve ser commitado (o repo é público).

```bash
cp firmware/portal-adega/secrets.h.exemplo firmware/portal-adega/secrets.h
```

| | |
|---|---|
| `WIFI_SSID` / `WIFI_SENHA` | rede de **2,4 GHz** (o ESP32 não enxerga 5 GHz) |
| `PORTAL_CHAVE` | gerada no app: Menu → Portal RFID → *Gerar chave do aparelho*. Aparece uma vez só |
| `PORTAL_URL` | opcional. Padrão: produção. Para testar com `npm run dev`, `http://<ip-do-mac>:3000/api/portal/leituras` |

Sem `PORTAL_CHAVE` o aparelho lê e mostra as passagens, mas não envia.

## Gravar e acompanhar

```bash
export PATH="$HOME/.local/bin:$PATH"
FQBN="esp32:esp32:esp32s3:FlashSize=16M,PartitionScheme=app3M_fat9M_16MB,USBMode=hwcdc,CDCOnBoot=cdc,PSRAM=disabled"

arduino-cli compile --fqbn "$FQBN" firmware/portal-adega
arduino-cli upload -p /dev/cu.usbmodem101 --fqbn "$FQBN" firmware/portal-adega
python3 firmware/monitor.py --port /dev/cu.usbmodem101 --reset --seconds 40
```

Boot bom:

```
CONECTADO  IP 192.168.68.57  sinal -41 dBm  MAC 44:1B:F6:8C:6B:A8
LEITOR RESPONDEU
  Firmware ..... C3CB,00016F7D,B1,1
  Reader ID .... 00016F7D
  Regiao ....... US 902-928 MHz (faixa da Anatel)  (codigo 01)
```

Garrafa passando:

```
[passagem] E280689400004031C5812D90 entrou no alcance
[passagem] E280689400004031C5812D90  1.8 s, 11 leituras -> fila (1)
[envio] 1 passagem(ns) entregue(s) ao app: {"ok":true,...,"eventos":[{"epc":"E28...","tipo":"saida"}]}
```

Comandos no monitor (digite e Enter):

| tecla | efeito |
|---|---|
| `i` | interroga o leitor (versão, ID, potência, região) |
| `f` | mostra a fila de envio |
| `e` | envia agora, sem esperar |
| `z` | zera os contadores da medição de alcance |
| `1` / `0` | retoma / pausa a leitura |
| `>CMD` | comando cru para o leitor, ex. `>N0,00` |

O `[rf] ... leituras/s LE BEM` continua saindo enquanto há etiqueta no campo:
é a medição de alcance (`docs/PORTAL-RFID.md` §6) rodando na própria placa.

## Como o envio se comporta

- **Rede caiu:** a leitura continua; as passagens esperam na fila (até 64) e
  saem quando o WiFi volta. Passou de 64, descarta a mais antiga e conta em `f`.
- **Reenvio não duplica:** cada passagem tem id `<boot>-<seq>`, e o servidor
  ignora o id que já recebeu.
- **Sinal de vida a cada 5 min**, mesmo sem garrafa: a tela Portal RFID mostra
  "Ligado" pelo último contato.
- **HTTPS verificado** contra as raízes em `certificados.h`. Se um dia falhar
  com erro de TLS, a Vercel trocou de autoridade: o arquivo explica como
  acrescentar a nova.
- **401** = o app recusou a chave (errada, ou o aparelho foi apagado na tela
  Portal RFID). O aparelho espera 1 min e tenta de novo.
- O envio roda numa tarefa no núcleo 0. O HTTPS leva 1–2 s por envio, e no loop
  principal isso pararia a leitura justo quando a garrafa está passando.

## Ferramentas

`arduino-cli` em `~/.local/bin` (não há Homebrew nesta máquina). Core
`esp32:esp32` 3.3.11.

> **O download do core esp32 falha nesta rede** (`connection reset by peer` no
> CDN do GitHub, sempre). O script que resolve isso (`scripts/baixar-toolchain.sh`,
> retoma com `curl -C -` e confere o SHA-256) ficou no branch `portal-rfid`:
> `git show portal-rfid:scripts/baixar-toolchain.sh > /tmp/baixar-toolchain.sh`.

> **Sem Rosetta desde 13/10/2026:** o `ctags` x86_64 do arduino-cli foi
> trocado por um shim. Efeito: **nenhum protótipo automático** — toda função
> do `.ino` precisa estar escrita antes de ser usada.

Para voltar ao firmware de teste do pai (`poc-gateway`, API HTTP local na
porta 8080), grave aquele repositório pelo PlatformIO.

## Estado

| marco | o que prova | situação |
|---|---|---|
| 1 | compila, grava e roda | ✅ |
| 2 | conecta no WiFi | ✅ `192.168.68.57`, −41 dBm |
| 3 | conversa com o FM-50X | ✅ 09/11/2026: Reader ID `00016F7D`, região US, inventário `U` |
| 4 | manda passagem para o app | firmware pronto e gravado; falta a chave do aparelho (depende da migration 0004) |
| 5 | alcance com garrafa cheia | **falta medir** — decide o formato (portal ou ponto de leitura) |
