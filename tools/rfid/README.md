# Bancada FM-50X — UHF RFID

Ferramenta de linha de comando para o leitor UHF RFID da adega, via adaptador
USB-serial. **Zero dependências** — não precisa `npm install` nem driver extra
(o macOS já traz o CH34x desde o Big Sur).

Nada aqui entra no build do Next.js; é ferramenta de bancada.

```bash
node tools/rfid/fm50x.mjs                      # ajuda
node --test tools/rfid/protocolo.test.mjs      # testa o protocolo sem hardware
```

## O módulo

**FM-50X Integrated Module** (Shenzhen Fonkan), montado na placa-mãe
serigrafada `RFID_READER`. A lata blindada não traz número de peça — o modelo
só aparece na documentação do fabricante.

| | |
|---|---|
| Frequência | 902–928 MHz (pad `US` selecionado — faixa da Anatel) |
| Protocolo de ar | ISO 18000-6C / EPC Class1 Gen2 |
| Potência | −2 a 25 dBm |
| Alimentação | 3,5–5 V, **280 mA médio / 300 mA de pico** |
| Lógica | TTL 3,3 V |
| Alcance nominal | ~1,5 m, dependendo da tag |

Conector `J1` (5 vias): `GND / EN / RX / TX / VCC`. O cabo que veio no kit
inverte a ordem dos pinos, o que casa corretamente com o adaptador USB-TTL
(`5V / RX / TX / 3.3V / GND`): VCC↔5V, GND↔GND, RX↔TX, TX↔RX, e **EN↔3,3 V**.

`EN` é *enable* ativo em nível alto (`VEN(HI)` = 0,9 V até VIN), então os
3,3 V do adaptador o habilitam. **A fiação do kit está correta como veio** —
não mexa nela.

## ⚠ O protocolo NÃO é o do R200

Este módulo usa **protocolo ASCII a 38400 8N1**, não o protocolo binário
`BB…7E` do R200/M100. Confundir os dois custou uma sessão inteira de
diagnóstico.

```
envio     <comando><CR>                      CR = 0x0D
resposta  <LF><letra do comando><dados><CR><LF>
```

Comando não reconhecido devolve `<LF>X<CR><LF>` — em hexadecimal, `0A 58 0D 0A`.
Se você vir esse padrão se repetindo, **não é ruído de linha**: é o módulo
dizendo que não entendeu, e quase certamente o protocolo ou o baud estão
errados.

Comandos principais:

| comando | efeito |
|---|---|
| `V` | versão do firmware |
| `S` | ID do leitor |
| `Q` | lê uma tag |
| `U` | inventário multi-tag |
| `N0,00` / `N1,<val>` | lê / define potência (`00`–`1B` = −2 a 25 dBm) |
| `N4,00` / `N5,<val>` | lê / define região (`01` = US 902–928) |
| `R<bank>,<addr>,<len>` | lê memória da tag |

Documentação completa em `Command format.pdf` e `Command list.pdf`, na pasta
que a Fonkan enviou.

## Sequência de bancada

- **Apoie o módulo em algo não-metálico** (madeira, papelão, livro). Antena
  cerâmica sobre metal desafina e o alcance despenca — não é defeito.
- A face com o blindado prateado é a que irradia; aponte ela para a tag.

```bash
node tools/rfid/fm50x.mjs ports        # a porta apareceu?
node tools/rfid/fm50x.mjs info         # firmware, ID, potência, região
node tools/rfid/fm50x.mjs region us    # se não estiver em US
node tools/rfid/fm50x.mjs power 25
node tools/rfid/fm50x.mjs scan         # passe o cartão, veja o EPC aparecer
```

Se algo não responder, `raw` manda comando cru e mostra a resposta literal:

```bash
node tools/rfid/fm50x.mjs raw "V"
node tools/rfid/fm50x.mjs monitor      # escuta pura, sem transmitir
```

## O teste decisivo: alcance com garrafa cheia

Líquido absorve UHF. Uma tag que lê a 1,5 m no ar pode não ler a 20 cm colada
numa garrafa cheia — e é isso que decide a fase 2 do projeto:

| resultado com garrafa cheia | caminho |
| --- | --- |
| lê bem a ~1 m ou mais | **portal na porta** — antena painel 8 dBi + sensor IR E18-D80NK para direção |
| só lê perto (~20–30 cm) | **estação de scan** deliberada — a página `/scan` do app já existe |

Cada medição grava uma linha em `medicoes.csv`:

```bash
node tools/rfid/fm50x.mjs range "comum|gargalo|cheia|50cm" --seconds 10
```

Use o rótulo no formato `tipo-tag|posição|estado|distância`.

**Matriz mínima** (~24 medições de 10 s, uns 15 min):

- **referência**: `cartao|ar|-|100cm` — o melhor caso possível, calibra o resto
- **tipo de tag**: `comum`, `antiliquido`
- **posição**: `gargalo` (acima da linha do líquido), `corpo` (no rótulo)
- **estado**: `vazia`, `cheia` — a mesma garrafa, para isolar a variável
- **distância**: `25cm`, `50cm`, `100cm`, `200cm` — pare de subir quando zerar

Mantenha a tag **parada** durante os 10 s e a mão longe dela (o corpo humano
absorve UHF quase tanto quanto o vinho).

O `range` classifica em `LE BEM` (≥5 leituras/s), `LE NO LIMITE` (≥1/s),
`MARGINAL` e `NAO LE`. Para portal na porta o critério é `LE BEM`, porque a
garrafa passa em movimento e a janela de leitura é fração de segundo.

Este protocolo não retorna RSSI, então a métrica é **taxa de leitura** — que
é a mais relevante para a decisão de qualquer forma.
