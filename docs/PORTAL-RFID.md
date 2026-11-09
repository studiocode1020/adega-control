# Portal RFID — como a adega dá baixa sozinha

Um leitor UHF na porta da adega reconhece cada garrafa etiquetada que passa por
ela, e o app pede ao dono um toque para confirmar a baixa.

Este documento registra **a lógica e o porquê** das decisões. A fiação e a
gravação da placa estão em `firmware/README.md`.

## 1. O problema do sentido

O leitor responde **qual** etiqueta passou, nunca **para que lado**. Uma antena
só não tem como saber.

**A solução: o sentido vem do estado da garrafa.** Cada garrafa etiquetada
tem um status, `na_adega` ou `fora`:

| a garrafa constava | e passou pela porta | então |
|---|---|---|
| na adega | → | está **saindo** (baixa) |
| fora | → | está **voltando** (entrada) |
| (etiqueta sem vínculo) | → | é **etiqueta nova**: o app pergunta de qual vinho |

É a lógica da catraca com cartão: o cartão não diz o sentido, o sistema sabe se
você já tinha entrado. Garrafa nova não confunde, porque ela entra pelo vínculo
da etiqueta, não pela porta.

### O ponto fraco, e por que nada muda sem confirmação

Leitura perdida inverte o sentido: se a saída do Malbec não foi lida, a volta
dele parece saída. Por isso **toda passagem vira um evento pendente** no
sininho, e o estoque só muda quando o dono confirma. O erro aparece em vez de
ficar escondido, e se corrige com um toque ("Não saiu").

Detalhe que evita a pior confusão: o sentido é calculado considerando os
eventos ainda pendentes. Saiu (não confirmado) e passou de novo = **voltou**,
não "saiu outra vez".

### Quando quiser mais certeza: sensor de passagem

Dois sensores infravermelhos no batente, ~20 cm um do outro, dão o sentido
físico (qual feixe cortou primeiro). A API já aceita isso (`direcao` em cada
passagem). Quando o sensor e o estado concordam, a confiança é `alta`; quando
discordam, vale o sensor e o aviso explica que uma passagem anterior se perdeu.

## 2. Garrafa parada perto da porta

Garrafa na prateleira ao alcance do leitor é lida o tempo todo. Duas regras
(`src/lib/portal/decidir.ts`):

- **Continuação:** passagem que começa menos de 30 s depois da anterior da
  mesma etiqueta é a mesma (pessoa parada na porta, garrafa na beira do alcance).
- **Permanência longa:** quem atravessa fica segundos no alcance. Mais de 30 s
  vira aviso de confiança `baixa`, com o motivo escrito.

O melhor remédio continua sendo físico: **nenhuma garrafa guardada no alcance
do leitor**.

## 3. O caminho do dado

```
garrafa passa ─▶ FM-50X ─UART─▶ ESP32 ─HTTPS─▶ /api/portal/leituras ─▶ Supabase ─Realtime─▶ sininho
```

1. **ESP32** junta as leituras seguidas da mesma etiqueta numa *passagem*
   (termina quando a etiqueta some por 2,5 s) e manda para a API, com a chave do
   aparelho. Guarda até 64 passagens na memória se o WiFi cair e reenvia
   depois. O envio roda no outro núcleo, então a leitura não para.
2. **API** (`src/app/api/portal/leituras/route.ts`) acha o aparelho pelo hash da
   chave, grava a passagem crua em `portal_reads` e chama `decidir()`. O
   resultado vira um `portal_events` pendente, ou é ignorado com o motivo
   anotado na passagem.
3. **App**: o sininho recebe o evento ao vivo (Realtime). Confirmar chama uma
   função do banco que faz tudo junto, ou nada: garrafa fora/na adega, estoque
   ±1, movimento em Movimentações.

**Reenvio não duplica.** Cada passagem tem um id dado pelo aparelho
(`<boot>-<seq>`), único por aparelho no banco. O mesmo id chegando de novo é
reconhecido e pulado.

**O app nunca chama o aparelho.** O app roda na Vercel, que não enxerga a rede
da casa. Por isso o fluxo é sempre do aparelho para o app.

## 4. O modelo de dados (migration `0004_portal_rfid.sql`)

| tabela | o quê |
|---|---|
| `bottles` | garrafa etiquetada: vinho, EPC, `na_adega`/`fora` |
| `portal_devices` | aparelho da porta: nome, hash da chave, último contato |
| `portal_reads` | toda passagem recebida, crua, e o que foi decidido dela |
| `portal_events` | o que vai para o sininho: pendente, confirmado, recusado |

Funções (chamadas pelo app): `portal_confirmar`, `portal_recusar`,
`portal_vincular`. `transferir_adega` foi recriada para levar as tabelas novas.

**`wines.quantity` continua sendo o estoque.** As garrafas etiquetadas são um
subconjunto dele: um vinho com 6 garrafas pode ter 2 etiquetadas e 4 controladas
pelas telas de Entrada/Saída, como sempre. Isso deixa etiquetar a adega aos
poucos, sem migrar nada. A regra que protege o estoque: não dá para ter mais
garrafas etiquetadas na adega do que `quantity`; ao vincular, o app pergunta se
a garrafa é nova (soma 1) ou se já estava contada.

Limitação conhecida: saída manual (tela Saída) de um vinho que tem garrafas
etiquetadas não sabe qual garrafa saiu, então não muda o status de nenhuma. Se
aquela garrafa depois passar pela porta, o sininho pergunta, e o dono corrige.

## 5. Para colocar no ar

1. Rodar `supabase/migrations/0004_portal_rfid.sql` no SQL Editor.
2. Publicar o app (`npx vercel --prod --yes`).
3. No app, na conta do dono da adega: Menu → **Portal RFID** → *Gerar chave do
   aparelho*. Copiar a chave (aparece uma vez).
4. Colar em `firmware/portal-adega/secrets.h` como `PORTAL_CHAVE`, gravar a placa.
5. Passar uma etiqueta pelo leitor: o sininho mostra "Etiqueta nova". Vincular.
6. Passar de novo: "Saiu pela porta". Confirmar.

Testar sem hardware (com uma chave real):

```bash
curl -X POST https://adega-control.vercel.app/api/portal/leituras \
  -H "Authorization: Bearer adg_..." -H "Content-Type: application/json" \
  -d '{"avistamentos":[{"id":"teste-1","epc":"E280689400004031C5812D90","idade_inicio_ms":4000,"idade_fim_ms":1500,"leituras":6}]}'
```

Testes da lógica: `npm run test:portal`.

## 6. O que ainda decide o hardware

O leitor atual alcançou ~30 cm **sem garrafa** e só com a antena de frente para a
etiqueta (medições do `poc-rfid`). Garrafa cheia na mão de alguém andando lê
menos. A medição que falta — garrafa cheia, etiqueta no gargalo, a 25/50/75/100
cm — decide o formato:

| alcance com garrafa cheia | formato |
|---|---|
| ~1 m ou mais | portal: a garrafa passa pela porta e é lida |
| ~20–50 cm | ponto de leitura ao lado da porta: segura a garrafa ali 1 s ao sair |
| menos que isso | leitor com mais potência/antena maior |

**O software é o mesmo nos três casos.** Muda só onde o leitor fica e quanto
tempo a garrafa passa perto dele.
