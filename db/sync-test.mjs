// Teste de contas + sync: dois aparelhos de duas pessoas diferentes, pelo mesmo
// caminho que o app usa (buildPush no cliente → handler da API → mergeSync).
//
// Roda contra o banco de verdade. Cria usuários 'test-*' e apaga tudo no fim.
//
// CUIDADO DELIBERADO: as contas de teste são criadas direto no SQL, não pelo
// /api/auth. A primeira conta criada pela API adota os registros sem dono, e
// aqui isso faria o teste sequestrar (e depois apagar, no cascade) dados reais
// que estejam esperando o primeiro login. O caminho de adoção é testado à
// parte, numa transação desfeita no fim.
//
//   npm run db:test

import auth from '../api/auth.js'
import { hashPassword } from '../api/_auth.js'
import { db } from '../api/_db.js'
import sync from '../api/sync.js'
import { EMPTY, mergeSync } from '../src/lib/storage.js'
import { buildPush } from '../src/lib/sync.js'

const clone = (v) => JSON.parse(JSON.stringify(v))
const agora = () => new Date().toISOString()
const pool = db()

let falhas = 0
const ok = (cond, msg) => {
  console.log((cond ? '  ok   ' : '  FALHA ') + msg)
  if (!cond) falhas++
}

function call(handler, body, cookie) {
  return new Promise((resolve) => {
    const headers = {}
    const res = {
      setHeader(k, v) {
        headers[k] = v
      },
      status(c) {
        this.c = c
        return this
      },
      json(d) {
        resolve({ status: this.c, body: d, headers })
      },
    }
    handler(
      { method: 'POST', headers: { cookie: cookie ?? '', 'user-agent': 'teste' }, body },
      res,
    )
  })
}

function aparelho(nome, cookie) {
  return { nome, cookie, state: clone(EMPTY) }
}

async function sincronizar(dev) {
  const { push, pushed } = buildPush(dev.state)
  const res = await call(sync, { since: dev.state.syncedAt, push }, dev.cookie)
  if (res.status !== 200) throw new Error(dev.nome + ' recebeu ' + res.status + ': ' + res.body.error)
  dev.state = mergeSync(dev.state, res.body, pushed)
  return res.body
}

const criar = (dev, key, record) => {
  dev.state[key] = [...dev.state[key], { ...record, updatedAt: agora() }]
  dev.state.dirty[key] = [...dev.state.dirty[key], record.id]
}
const editar = (dev, key, id, patch) => {
  dev.state[key] = dev.state[key].map((r) => (r.id === id ? { ...r, ...patch, updatedAt: agora() } : r))
  if (!dev.state.dirty[key].includes(id)) dev.state.dirty[key] = [...dev.state.dirty[key], id]
}
const apagar = (dev, key, id) => {
  dev.state[key] = dev.state[key].filter((r) => r.id !== id)
  dev.state.deleted[key] = [...dev.state.deleted[key], { id, updatedAt: agora() }]
  dev.state.dirty[key] = dev.state.dirty[key].filter((x) => x !== id)
}

/** Conta de teste criada por SQL, pra não disparar a adoção de órfãos. */
async function contaDeTeste(username, senha) {
  const id = 'test-user-' + username
  await pool.query(
    `insert into users (id, username, password_hash) values ($1, $2, $3)
     on conflict (username) do update set password_hash = excluded.password_hash`,
    [id, username, await hashPassword(senha)],
  )
  await pool.query('insert into user_settings (user_id) values ($1) on conflict do nothing', [id])
  return id
}

const orfaos = async () => {
  const { rows } = await pool.query(`
    select (select count(*)::int from plans    where user_id is null) as plans,
           (select count(*)::int from workouts where user_id is null) as workouts,
           (select count(*)::int from jumps    where user_id is null) as jumps
  `)
  return rows[0]
}

const antes = await orfaos()
console.log('registros ainda sem dono (esperando o primeiro login):', JSON.stringify(antes))

try {
  console.log('\n1. Sessão')
  const semSessao = await call(sync, { since: null, push: {} }, '')
  ok(semSessao.status === 401, 'sync sem cookie é recusado: ' + semSessao.status)

  await contaDeTeste('test-ana', 'senha-comprida-1')
  await contaDeTeste('test-bia', 'senha-comprida-2')

  const errada = await call(auth, { action: 'login', username: 'test-ana', password: 'errada' })
  ok(errada.status === 401, 'senha errada não entra: ' + errada.status)

  const inexistente = await call(auth, { action: 'login', username: 'test-ninguem', password: 'seja-la' })
  ok(inexistente.status === 401 && inexistente.body.error === errada.body.error,
    'usuário inexistente responde igual a senha errada (não entrega quem existe)')

  const entrou = await call(auth, { action: 'login', username: 'TEST-ANA', password: 'senha-comprida-1' })
  ok(entrou.status === 200 && entrou.body.user.username === 'test-ana', 'entra ignorando maiúsculas')
  const cookieAna = entrou.headers['Set-Cookie'].split(';')[0]
  ok(/HttpOnly/i.test(entrou.headers['Set-Cookie']) && /Secure/i.test(entrou.headers['Set-Cookie']),
    'cookie é HttpOnly e Secure')
  ok(!entrou.headers['Set-Cookie'].includes('senha'), 'cookie não carrega a senha')

  const quemSou = await call(auth, { action: 'me' }, cookieAna)
  ok(quemSou.body.user?.username === 'test-ana', 'sessão identifica quem é')

  const cookieBia = (await call(auth, { action: 'login', username: 'test-bia', password: 'senha-comprida-2' }))
    .headers['Set-Cookie'].split(';')[0]

  console.log('\n2. Ana cria ficha e treino')
  const A = aparelho('celular da Ana', cookieAna)
  const B = aparelho('computador da Ana', cookieAna)
  const C = aparelho('celular da Bia', cookieBia)

  criar(A, 'plans', {
    id: 'test-plan',
    name: 'Impulsão A',
    type: 'pliometria',
    days: [1, 4],
    notes: '',
    items: [
      { name: 'Box jump', sets: 4, reps: 5, load: null, rest: 120, unit: 'reps' },
      { name: 'Pogo jumps', sets: 3, reps: 30, load: null, rest: 60, unit: 'seg' },
    ],
  })
  criar(A, 'workouts', {
    id: 'test-workout',
    date: '2026-09-01',
    type: 'pliometria',
    planId: 'test-plan',
    duration: 45,
    rpe: 8,
    notes: '',
    items: [{ name: 'Box jump', sets: 4, reps: 5, load: null, rest: 120, unit: 'reps' }],
  })
  criar(A, 'jumps', { id: 'test-jump', date: '2026-09-01', kind: 'cmj', height: 58.5, notes: '' })
  await sincronizar(A)
  ok(A.state.dirty.plans.length === 0, 'celular ficou sem pendências')

  console.log('\n3. Outro aparelho da Ana recebe tudo')
  await sincronizar(B)
  const planB = B.state.plans.find((p) => p.id === 'test-plan')
  ok(!!planB, 'recebeu a ficha')
  ok(planB?.items.length === 2 && planB.items[1].unit === 'seg', 'exercícios e unidade preservados')
  ok(B.state.workouts[0]?.date === '2026-09-01', 'data sem escorregar de fuso')
  ok(B.state.jumps[0]?.height === 58.5, 'salto com decimal')

  console.log('\n4. A conta da Bia é outro mundo')
  await sincronizar(C)
  ok(C.state.plans.length === 0 && C.state.workouts.length === 0 && C.state.jumps.length === 0,
    'Bia não vê nada da Ana: ' + C.state.plans.length + ' fichas')

  // Mesmo id, dono diferente: não pode sobrescrever
  criar(C, 'plans', {
    id: 'test-plan',
    name: 'FICHA DA BIA',
    type: 'forca',
    days: [2],
    notes: '',
    items: [{ name: 'Agacho', sets: 5, reps: 5, load: 100, rest: 180, unit: 'reps' }],
  })
  await sincronizar(C)
  const donoOriginal = await pool.query('select name, user_id from plans where id = $1', ['test-plan'])
  ok(donoOriginal.rows[0].name === 'Impulsão A', 'id repetido de outra conta não sobrescreve: ' + donoOriginal.rows[0].name)
  await sincronizar(B)
  ok(B.state.plans.find((p) => p.id === 'test-plan')?.name === 'Impulsão A', 'e a Ana não vê a ficha da Bia')

  console.log('\n5. Edição dos dois lados da mesma conta')
  editar(B, 'plans', 'test-plan', { name: 'computador editou' })
  await new Promise((r) => setTimeout(r, 20))
  editar(A, 'plans', 'test-plan', { name: 'celular editou por último' })
  await sincronizar(B)
  await sincronizar(A)
  await sincronizar(B)
  ok(A.state.plans.find((p) => p.id === 'test-plan')?.name === 'celular editou por último', 'vence o mais recente')
  ok(B.state.plans.find((p) => p.id === 'test-plan')?.name === 'celular editou por último', 'os dois convergem')

  console.log('\n6. Alcance parado é por conta')
  A.state.reach = 240
  A.state.reachUpdatedAt = agora()
  A.state.dirty.reach = true
  await sincronizar(A)
  await sincronizar(B)
  await sincronizar(C)
  ok(B.state.reach === 240, 'outro aparelho da Ana recebe: ' + B.state.reach)
  ok(C.state.reach === null, 'a Bia não recebe o alcance da Ana: ' + C.state.reach)

  console.log('\n7. Apagar')
  apagar(A, 'workouts', 'test-workout')
  await sincronizar(A)
  await sincronizar(B)
  ok(!B.state.workouts.find((w) => w.id === 'test-workout'), 'treino sumiu do outro aparelho')
  await sincronizar(A)
  await sincronizar(B)
  ok(!B.state.workouts.find((w) => w.id === 'test-workout'), 'e não ressuscita no sync seguinte')

  console.log('\n8. Edição offline não é atropelada')
  editar(A, 'plans', 'test-plan', { notes: 'anotado sem sinal' })
  const semEnviar = await call(sync, { since: A.state.syncedAt, push: {} }, cookieAna)
  A.state = mergeSync(A.state, semEnviar.body, {
    plans: [], workouts: [], jumps: [],
    deleted: { plans: [], workouts: [], jumps: [] },
    reach: false,
  })
  ok(A.state.plans.find((p) => p.id === 'test-plan')?.notes === 'anotado sem sinal', 'edição local sobrevive')
  ok(A.state.dirty.plans.includes('test-plan'), 'e continua na fila')
  await sincronizar(A)

  console.log('\n9. Sessão expirada')
  await pool.query("update sessions set expires_at = now() - interval '1 day' where user_id = 'test-user-test-bia'")
  const velha = await call(sync, { since: null, push: {} }, cookieBia)
  ok(velha.status === 401, 'sessão vencida é recusada: ' + velha.status)

  const saiu = await call(auth, { action: 'logout' }, cookieAna)
  ok(saiu.headers['Set-Cookie'].includes('Max-Age=0'), 'sair limpa o cookie')
  const depoisDeSair = await call(sync, { since: null, push: {} }, cookieAna)
  ok(depoisDeSair.status === 401, 'e a sessão morre no servidor: ' + depoisDeSair.status)

  console.log('\n10. Adoção dos registros sem dono (em transação desfeita)')
  const c = await pool.connect()
  try {
    await c.query('begin')
    await c.query("insert into plans (id, name, type, days, notes) values ('test-orfa', 'Órfã', 'forca', '{}', '')")
    const { rows } = await c.query(
      "update plans set user_id = 'test-user-test-ana' where user_id is null returning id",
    )
    ok(rows.some((r) => r.id === 'test-orfa'), 'ficha sem dono é adotada pela conta')
    await c.query('rollback')
  } finally {
    c.release()
  }
  const semDonoAgora = await orfaos()
  ok(semDonoAgora.plans === antes.plans, 'a transação foi desfeita: órfãos intactos')
} catch (err) {
  falhas++
  console.error('\nERRO: ' + err.message)
} finally {
  await pool.query("delete from users where id like 'test-user-%'")
  await pool.query("delete from plans where id like 'test-%'")
  await pool.query("delete from workouts where id like 'test-%'")
  await pool.query("delete from jumps where id like 'test-%'")
  const depois = await orfaos()
  const intacto = JSON.stringify(antes) === JSON.stringify(depois)
  console.log('\nlimpeza — registros sem dono agora: ' + JSON.stringify(depois) + (intacto ? ' (intactos)' : ' MUDOU!'))
  if (!intacto) falhas++
  await pool.end()
  console.log(falhas === 0 ? '\nTUDO OK' : '\n' + falhas + ' falha(s)')
  process.exit(falhas === 0 ? 0 : 1)
}
