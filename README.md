# Jump

App web pra registrar treinos de impulsão e acompanhar a evolução do salto vertical.

Você monta as **fichas** (o plano de cada treino: exercícios, séries, repetições **ou
segundos**, carga e descanso), marca em que dias da semana fazer cada uma, e o **calendário** mostra o que já
foi feito e o que vem pela frente. As medições de salto viram um gráfico de progresso ao
longo do tempo.

Tudo separado por categoria — **pliometria**, **força**, **alongamento**, **mobilidade** e
**jogo**.

## O que dá pra fazer

- **Hoje** — a tela inicial responde "o que eu treino agora": a ficha do dia pronta pra
  registrar, a semana em bolinhas (feito x previsto), recorde, ganho, sequência e os
  últimos treinos.
- **Constância** — mapa de calor na tela inicial, um mês por vez: cada dia é um quadrado,
  mais claro quanto mais você treinou nele. Setas pra andar pelos meses.
- **Calendário** — mês inteiro com bolinha cheia no que foi feito e vazada no que a ficha
  marcou; clique no dia pra ver os exercícios e registrar o treino já preenchido.
- **Fichas** — o plano de cada sessão: exercícios com séries, carga e descanso, e cada um
  medido em repetições **ou** em segundos (30s de pogo jumps no meio de um treino contado
  em reps), mais os dias da semana em que ela se repete. Um clique registra o treino do dia.
- **Modo treino** — o jeito de registrar enquanto você treina, não depois. Abre a ficha do
  dia, você vai marcando série por série, e o descanso começa a contar sozinho quando você
  marca. Nos exercícios contados em segundos o botão vira um cronômetro da própria série,
  que ao zerar já marca a série e emenda o descanso. No fim salva o que aconteceu de
  verdade: as séries que saíram, a carga que você acabou usando e o tempo total. Dá pra
  minimizar e voltar depois — a barra "em andamento" fica esperando.
- **Jogo** — dia em que você trocou o treino por uma partida entra como categoria
  própria, sem exercícios: um toque em "Joguei hoje" e a sequência de dias não zera.
  No calendário dá pra marcar um dia que já passou, tocando nele.
- **Treinos** — histórico das sessões feitas, com duração e esforço percebido (RPE);
  filtrar por categoria, editar e apagar.
- **Impulsão** — registrar saltos por tipo (CMJ, squat jump, com corrida, unilateral),
  ver a curva de evolução de cada tipo e calcular a que altura você toca a partir do
  seu alcance parado.
- **Biblioteca** — catálogo de exercícios por categoria, disponível na hora de montar
  um treino.

## No celular

O app é feito pra ser usado no telefone: navegação por abas na base da tela, campos de
16px (o iOS não dá zoom ao focar), botão de salvar fixo no rodapé dos formulários e
respeito às áreas seguras do notch.

No modo treino a tela fica acesa enquanto dá, e o cronômetro guarda a hora de término em
vez dos segundos restantes — bloquear a tela ou sair pro WhatsApp não atrasa a contagem.
O fim do descanso apita e vibra (vibração não existe no iOS).

Dá pra instalar como app: abra no navegador e use **Adicionar à tela de início** — ele
abre em tela cheia, sem barra do navegador. (O ícone é um SVG; no Android sai certinho,
no iOS pode aparecer genérico até você gerar um PNG.)

## Onde os dados ficam

Tudo é salvo no `localStorage` do aparelho, na hora — o app funciona inteiro sem internet.
Se você [entrar na sua conta](#conta-e-sincronização-entre-aparelhos), essas mudanças também
sobem pro banco e descem nos outros aparelhos. O rodapé tem **Exportar backup** (gera um
`.json`) e **Importar**, que funcionam de qualquer jeito.

## Banco de dados (Neon)

Um Postgres no Neon guarda os treinos pra você abrir no celular e no computador com os
mesmos dados. Ele não substitui o `localStorage`: o app escreve sempre local primeiro e
sincroniza por cima.

O `.env` (fora do git) tem duas variáveis: `DATABASE_URL`, a connection string do
Neon, e `SYNC_TOKEN`, o convite pra criar conta.

```bash
npm run db:migrate   # aplica os db/migrations/*.sql que ainda não rodaram
npm run db:inspect   # lista tabelas, colunas e quantas linhas tem cada uma
```

Cada migration roda uma vez só, dentro de uma transação, e fica registrada na tabela
`schema_migrations`. Pra mudar o esquema, crie `db/migrations/002_….sql` — nunca edite uma
migration já aplicada.

As tabelas seguem o modelo que o app já usa: `plans` + `plan_items` (as fichas), `workouts`
+ `workout_items` (o que foi feito), `jumps` (as medições) e `settings` (o alcance parado).
Os ids continuam sendo gerados no cliente, então o app segue funcionando offline. A view
`exercise_history` cruza treino e exercício pra responder o que o `localStorage` não
respondia: a carga de cada exercício ao longo do tempo.

### Conta e sincronização entre aparelhos

O navegador **não pode** falar direto com o Neon: a connection string daria acesso total ao
banco pra qualquer um que abrisse o DevTools. Nunca coloque a URL numa variável `VITE_*` —
o Vite embute essas no bundle que vai pro navegador.

Quem fala com o banco são as funções serverless em `api/`, que rodam na Vercel. E como elas
estão numa URL pública, precisam saber quem é você: por isso existe conta. Você entra uma
vez em cada aparelho e a sessão dura 180 dias.

- A senha é guardada com **scrypt** (derivação lenta, sal por usuário). Vazou o banco, não
  vazaram as senhas.
- A sessão é um token aleatório num cookie **HttpOnly** — o JavaScript não lê nem escreve,
  e o banco guarda só o hash dele. Sair encerra a sessão no servidor, não só no aparelho.
- Cada registro tem dono (`user_id`) e toda consulta do sync filtra por ele.
- **Criar conta pede um convite**: o valor de `SIGNUP_CODE` (ou, se não existir, o
  `SYNC_TOKEN`) nas variáveis da Vercel. Sem isso qualquer um abriria conta no seu banco.
  Entrar depois é só usuário e senha.

**Sem conta o app continua inteiro** — tudo é salvo no `localStorage` na hora. Só que aí
fica mesmo só naquele aparelho, e o app avisa isso numa faixa no topo. Ao entrar, o que já
estava ali sobe pra conta no primeiro sync.

**Como a junção funciona.** Cada registro carrega dois carimbos: `updated_at`, do relógio
do aparelho que editou, que decide quem mexeu por último; e `synced_at`, do relógio do
banco, que é o marco do "o que eu ainda não baixei". Misturar os dois quebra em silêncio —
com o relógio do celular fora de hora, a edição feita nele entra com carimbo anterior ao
marco do outro aparelho e nunca desce. A junção é por registro, não pelo conjunto: registrar
um treino no celular e editar uma ficha no computador não faz um apagar o outro.

Apagar não remove a linha do banco, marca `deleted_at`. Sem isso o registro apagado num
aparelho voltaria do banco no sync seguinte.

### Publicando

1. Importe o repositório na [Vercel](https://vercel.com/new) — ela detecta o Vite sozinha
   (build `npm run build`, saída `dist`) e publica `api/` como função serverless.
2. Em **Settings → Environment Variables**, crie `DATABASE_URL` e `SYNC_TOKEN`. Marque as
   três caixas — **Production, Preview e Development**. Só em Production e a branch de
   desenvolvimento sobe sem as variáveis: a API responde 401 e nada sincroniza.
3. Deploy. No site, **Entrar → Criar conta**, com o `SYNC_TOKEN` no campo de convite.
   Nos outros aparelhos é só usuário e senha.

O GitHub Pages não serve pra isso: ele só entrega arquivo estático e nunca vai rodar as
funções de `api/`. O app até abre, mas fica sem conta e sem sincronização.

Pra conferir tudo de ponta a ponta contra o banco de verdade:

```bash
npm run db:test
```

Ele simula duas contas em três aparelhos (login, sessão expirada, criar, editar dos dois
lados, apagar, editar offline, e uma conta tentando enxergar a outra), usa ids `test-*` e
limpa tudo no fim — conferindo, inclusive, que não encostou em nenhum dado de verdade.

## Rodando localmente

```bash
npm install
npm run dev
```

O Vite sobe em `http://localhost:5173`.

| Comando | O que faz |
| --- | --- |
| `npm run dev` | Servidor de desenvolvimento com hot reload |
| `npm run build` | Build de produção em `dist/` |
| `npm run preview` | Serve o build pra conferir antes de publicar |
| `npm run lint` | Roda o oxlint |
| `npm run db:migrate` | Aplica as migrations pendentes no Neon |
| `npm run db:inspect` | Mostra o esquema e a contagem de linhas |
| `npm run db:test` | Testa contas e sync de ponta a ponta no banco |
| `npm run db:claim -- usuario` | Dá dono aos registros que ficaram sem conta |

## Sem o banco

O app é 100% estático e o `dist/` roda em qualquer hospedagem — só fica sem conta e sem
sincronização.

## Stack

Vite · React 19 · Tailwind CSS 4 · Postgres (Neon) atrás de uma função serverless. Sem
dependência de gráfico — o gráfico de
evolução é SVG escrito à mão, com paleta validada pra contraste e daltonismo em fundo escuro.
