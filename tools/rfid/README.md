# Bancada R200 — UHF RFID

Ferramenta de linha de comando pra conversar com o módulo leitor UHF RFID (chip R200,
860–960 MHz) pelo adaptador USB-serial, direto do Mac. **Zero dependências** — não precisa
`npm install` nem driver extra (o macOS já traz o CH34x desde o Big Sur).

Nada aqui entra no build do Next.js; é ferramenta de bancada.

```bash
node tools/rfid/r200.mjs            # ajuda
node --test tools/rfid/protocolo.test.mjs   # testa o protocolo sem hardware
```

## Antes de ligar

- **Apoie o módulo em algo não-metálico** (madeira, papelão, livro). Antena cerâmica em cima
  de mesa de metal desafina e o alcance despenca — não é defeito do módulo.
- A face com o blindado prateado é a que irradia; aponte ela pra tag.
- Alimentação vem da USB (5 V). Acima de ~22 dBm o módulo pode passar dos 500 mA e resetar
  a porta. Se as leituras sumirem do nada, é isso — alimente com 5 V externos.
- Confira os pads **EU / US** na borda esquerda da placa. A gente quer **US (902–928 MHz)**,
  que é a faixa liberada pela Anatel aqui.

## Sequência

```bash
node tools/rfid/r200.mjs ports        # 1. a porta apareceu?
node tools/rfid/r200.mjs info         # 2. o módulo responde? qual região/potência?
node tools/rfid/r200.mjs region us    # 3. se não estiver em US
node tools/rfid/r200.mjs power 22
node tools/rfid/r200.mjs scan         # 4. passe o cartão de teste, veja o EPC aparecer
```

## Quando o módulo não responde

```bash
node tools/rfid/r200.mjs diag       # a linha fala? em qual velocidade?
node tools/rfid/r200.mjs loopback   # TX no RX: o adaptador e o cabo prestam?
```

O `diag` reporta duas colunas separadas de propósito:

- **ocioso** — bytes que chegaram *sem* eu transmitir nada. Se aparecer coisa aqui, o módulo
  está falando sozinho (ou a linha está com ruído).
- **após comando** — bytes que chegaram depois de mandar comando. É aqui que uma resposta real
  aparece.

Zero nas duas colunas em todas as velocidades = a linha está muda. Aí o `loopback` separa
as duas metades do problema: desconecte o módulo, encoste o fio TX no fio RX do adaptador e
rode. Se voltar idêntico, adaptador/cabo/software estão bons e a falha é do lado do módulo
(alimentação, conector ou TX/RX trocados). Se não voltar nada, o problema é antes do módulo.

> Cuidado ao mexer no `diag`: trocar o baud com a porta **aberta** faz o driver do CH343
> cuspir bytes fantasma, periódicos e reproduzíveis, que parecem resposta do módulo. Por isso
> o `diag` reabre a porta a cada velocidade em vez de reconfigurar. Já custou uma sessão de
> diagnóstico atrás de um problema que não existia.

## O teste decisivo: alcance com garrafa cheia

Líquido absorve UHF. Uma tag que lê a 2 m no ar pode não ler a 20 cm colada numa garrafa
cheia — e é isso que decide a fase 2 do projeto:

| resultado com garrafa cheia | caminho |
| --- | --- |
| lê bem a ~1 m ou mais | **portal na porta** — antena painel 8 dBi + sensor IR E18-D80NK pra direção |
| só lê perto (~20–30 cm) | **estação de scan** deliberada — a página `/scan` do app já existe |

Cada medição grava uma linha em `medicoes.csv`:

```bash
node tools/rfid/r200.mjs range "comum|gargalo|cheia|50cm" --seconds 10 --power 22
```

Use o rótulo no formato `tipo-tag|posição|estado|distância` pra planilha sair analisável.

**Matriz mínima** (~24 medições de 10 s, dá uns 15 min):

- **referência**: `cartao|ar|-|100cm` — o melhor caso possível, calibra o resto
- **tipo de tag**: `comum`, `antiliquido`
- **posição**: `gargalo` (acima da linha do líquido), `corpo` (no rótulo)
- **estado**: `vazia`, `cheia` — a mesma garrafa, pra isolar a variável
- **distância**: `25cm`, `50cm`, `100cm`, `200cm` — pare de subir quando zerar

Mantenha a tag **parada** durante os 10 s e a mão longe dela (o corpo humano absorve UHF
quase tanto quanto o vinho).

O `range` classifica em `LE BEM` (≥5 leituras/s), `LE NO LIMITE` (≥1/s), `MARGINAL` e
`NAO LE`. Pra portal na porta o critério é `LE BEM`, porque a garrafa vai passar em
movimento e a janela de leitura é de fração de segundo.
