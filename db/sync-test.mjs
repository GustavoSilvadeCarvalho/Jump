// Teste do sync: dois aparelhos simulados pelo mesmo caminho que o app usa:
// buildPush (cliente) → handler de /api/sync (servidor, banco de verdade) → mergeSync (cliente).
// Usa ids 'test-*' e apaga tudo no fim — mas roda contra o banco de verdade,
// então não deixe rodando junto com o app aberto sincronizando.
//
//   npm run db:test

import handler from '../api/sync.js'
import { db } from '../api/_db.js'
import { EMPTY, mergeSync } from '../src/lib/storage.js'
import { buildPush } from '../src/lib/sync.js'

const TOKEN = process.env.SYNC_TOKEN
const clone = (v) => JSON.parse(JSON.stringify(v))
const agora = () => new Date().toISOString()

let falhas = 0
const ok = (cond, msg) => {
  console.log((cond ? '  ok   ' : '  FALHA ') + msg)
  if (!cond) falhas++
}

function call(body, token = TOKEN) {
  return new Promise((resolve) => {
    const res = {
      statusCode: 0,
      status(code) {
        this.statusCode = code
        return this
      },
      json(data) {
        resolve({ status: this.statusCode, body: data })
      },
    }
    handler({ method: 'POST', headers: { 'x-sync-token': token }, body }, res)
  })
}

function aparelho(nome) {
  return { nome, state: clone(EMPTY) }
}

async function sincronizar(dev) {
  const { push, pushed } = buildPush(dev.state)
  const res = await call({ since: dev.state.syncedAt, push })
  if (res.status !== 200) throw new Error(dev.nome + ' recebeu ' + res.status + ': ' + res.body.error)
  dev.state = mergeSync(dev.state, res.body, pushed)
  return res.body
}

// Mexer no estado como o app mexe (mesma forma que o hook produz)
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

const A = aparelho('celular')
const B = aparelho('computador')

try {
  console.log('\n1. Sem código de sincronização a API recusa')
  const semToken = await call({ since: null, push: {} }, 'errado')
  ok(semToken.status === 401, 'token errado → 401 (' + semToken.status + ')')

  console.log('\n2. Celular cria ficha, treino e salto; sincroniza')
  criar(A, 'plans', {
    id: 'test-plan',
    name: 'Impulsão A',
    type: 'pliometria',
    days: [1, 4],
    notes: 'teste',
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
    notes: 'joelho ok',
    items: [{ name: 'Box jump', sets: 4, reps: 5, load: null, rest: 120, unit: 'reps' }],
  })
  criar(A, 'jumps', { id: 'test-jump', date: '2026-09-01', kind: 'cmj', height: 58.5, notes: '' })
  await sincronizar(A)
  ok(A.state.dirty.plans.length === 0 && A.state.dirty.workouts.length === 0, 'celular ficou sem pendências')
  ok(!!A.state.syncedAt, 'celular guardou o marco do sync')

  console.log('\n3. Computador (vazio) sincroniza e recebe tudo')
  await sincronizar(B)
  const planB = B.state.plans.find((p) => p.id === 'test-plan')
  const treinoB = B.state.workouts.find((w) => w.id === 'test-workout')
  ok(!!planB, 'recebeu a ficha')
  ok(planB?.items.length === 2, 'recebeu os 2 exercícios: ' + planB?.items.length)
  ok(planB?.items[1].unit === 'seg' && planB?.items[1].reps === 30, 'exercício em segundos preservado')
  ok(String(planB?.days) === '1,4', 'dias da semana preservados: ' + planB?.days)
  ok(treinoB?.date === '2026-09-01', 'data do treino sem escorregar de fuso: ' + treinoB?.date)
  ok(treinoB?.planId === 'test-plan', 'vínculo treino → ficha preservado')
  ok(B.state.jumps.find((j) => j.id === 'test-jump')?.height === 58.5, 'salto com altura decimal')

  console.log('\n4. Computador edita a ficha; celular recebe a mudança')
  editar(B, 'plans', 'test-plan', { name: 'Impulsão A — pesada' })
  await sincronizar(B)
  await sincronizar(A)
  ok(
    A.state.plans.find((p) => p.id === 'test-plan')?.name === 'Impulsão A — pesada',
    'celular vê o nome novo: ' + A.state.plans.find((p) => p.id === 'test-plan')?.name,
  )

  console.log('\n5. Edição simultânea: vence o carimbo mais novo')
  editar(B, 'plans', 'test-plan', { name: 'computador editou' })
  await new Promise((r) => setTimeout(r, 20))
  editar(A, 'plans', 'test-plan', { name: 'celular editou por último' })
  await sincronizar(B)
  await sincronizar(A)
  await sincronizar(B)
  const nomeA = A.state.plans.find((p) => p.id === 'test-plan')?.name
  const nomeB = B.state.plans.find((p) => p.id === 'test-plan')?.name
  ok(nomeA === 'celular editou por último', 'celular manteve a própria edição: ' + nomeA)
  ok(nomeB === nomeA, 'computador convergiu pro mesmo valor: ' + nomeB)

  console.log('\n6. Alcance parado (valor único) sincroniza')
  A.state.reach = 240
  A.state.reachUpdatedAt = agora()
  A.state.dirty.reach = true
  await sincronizar(A)
  await sincronizar(B)
  ok(B.state.reach === 240, 'computador recebeu o alcance: ' + B.state.reach)

  console.log('\n7. Apagar no celular some do computador')
  apagar(A, 'workouts', 'test-workout')
  await sincronizar(A)
  await sincronizar(B)
  ok(!B.state.workouts.find((w) => w.id === 'test-workout'), 'treino sumiu do computador')
  ok(A.state.deleted.workouts.length === 0, 'lápide descartada depois de enviada')

  console.log('\n8. Registro apagado não ressuscita no sync seguinte')
  await sincronizar(A)
  await sincronizar(B)
  ok(!A.state.workouts.find((w) => w.id === 'test-workout'), 'continua apagado no celular')
  ok(!B.state.workouts.find((w) => w.id === 'test-workout'), 'continua apagado no computador')

  console.log('\n9. Editar offline não é atropelado pelo que o servidor já tinha')
  editar(A, 'plans', 'test-plan', { notes: 'anotado sem sinal' })
  const antes = clone(A.state)
  // Sync com o servidor sem mandar a edição (simula a resposta chegando antes do envio)
  const semEnviar = await call({ since: antes.syncedAt, push: {} })
  A.state = mergeSync(A.state, semEnviar.body, {
    plans: [],
    workouts: [],
    jumps: [],
    deleted: { plans: [], workouts: [], jumps: [] },
    reach: false,
  })
  ok(
    A.state.plans.find((p) => p.id === 'test-plan')?.notes === 'anotado sem sinal',
    'edição local sobreviveu ao merge',
  )
  ok(A.state.dirty.plans.includes('test-plan'), 'e continua na fila de envio')

  console.log('\n10. Nada pendente = nada muda')
  await sincronizar(A)
  const marco = A.state.syncedAt
  await sincronizar(A)
  ok(A.state.syncedAt !== marco, 'marco do sync avança')
  ok(A.state.plans.length === 1 && A.state.jumps.length === 1, 'dados intactos')
} catch (err) {
  falhas++
  console.error('\nERRO: ' + err.message)
} finally {
  const pool = db()
  await pool.query("delete from workouts where id like 'test-%'")
  await pool.query("delete from plans where id like 'test-%'")
  await pool.query("delete from jumps where id like 'test-%'")
  await pool.query("update settings set reach = null, updated_at = '1970-01-01' where id = true")
  const { rows } = await pool.query(`
    select (select count(*) from plans) as plans,
           (select count(*) from workouts) as workouts,
           (select count(*) from jumps) as jumps,
           (select count(*) from plan_items) as plan_items,
           (select count(*) from workout_items) as workout_items
  `)
  console.log('\nlimpeza — linhas restantes:', JSON.stringify(rows[0]))
  await pool.end()
  console.log(falhas === 0 ? '\nTUDO OK' : '\n' + falhas + ' falha(s)')
  process.exit(falhas === 0 ? 0 : 1)
}
