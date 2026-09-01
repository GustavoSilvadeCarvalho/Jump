// POST /api/sync — troca de mudanças entre um aparelho e o banco, por conta.
//
// Dois carimbos, de propósito: updated_at é do relógio do aparelho e decide quem
// editou por último; synced_at é do relógio do banco e marca o que já foi baixado.
// Apagar marca deleted_at — sumir com a linha faria o registro voltar no sync seguinte.

import { currentUser } from './_auth.js'
import { db, fail } from './_db.js'

const EPOCH = '1970-01-01T00:00:00.000Z'

const str = (v) => (typeof v === 'string' ? v : v == null ? '' : String(v))
const num = (v) => (v === null || v === undefined || v === '' || Number.isNaN(Number(v)) ? null : Number(v))
const iso = (v) => {
  const d = new Date(v ?? 0)
  return Number.isNaN(d.getTime()) ? EPOCH : d.toISOString()
}
const isDate = (v) => typeof v === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v)
const list = (v) => (Array.isArray(v) ? v : [])

/** Os exercícios de uma ficha ou treino são sempre trocados em bloco. */
async function replaceItems(client, table, column, ownerId, items) {
  await client.query(`delete from ${table} where ${column} = $1`, [ownerId])
  const rows = list(items).filter((i) => str(i.name).trim())
  if (!rows.length) return

  const values = []
  const params = [ownerId]
  rows.forEach((item, position) => {
    const base = params.length
    values.push(`($1, $${base + 1}, $${base + 2}, $${base + 3}, $${base + 4}, $${base + 5}, $${base + 6}, $${base + 7})`)
    params.push(
      position,
      str(item.name).trim(),
      num(item.sets),
      num(item.reps),
      num(item.load),
      num(item.rest),
      item.unit === 'seg' ? 'seg' : 'reps',
    )
  })

  await client.query(
    `insert into ${table} (${column}, position, name, sets, reps, load, rest, unit) values ${values.join(', ')}`,
    params,
  )
}

async function pushPlans(client, userId, plans) {
  for (const plan of plans) {
    if (!str(plan.id)) continue
    const { rowCount } = await client.query(
      `insert into plans (id, user_id, name, type, days, notes, updated_at, synced_at, deleted_at)
       values ($1, $7, $2, $3, $4, $5, least($6::timestamptz, now()), now(), null)
       on conflict (id) do update set
         name = excluded.name,
         type = excluded.type,
         days = excluded.days,
         notes = excluded.notes,
         updated_at = excluded.updated_at,
         synced_at = now(),
         deleted_at = null
       where plans.updated_at < excluded.updated_at and plans.user_id = $7`,
      [
        str(plan.id),
        str(plan.name),
        str(plan.type),
        list(plan.days).map(Number).filter((d) => d >= 0 && d <= 6),
        str(plan.notes),
        iso(plan.updatedAt),
        userId,
      ],
    )
    // rowCount 0 = o banco tinha versão mais nova; não mexe nos exercícios.
    if (rowCount) await replaceItems(client, 'plan_items', 'plan_id', str(plan.id), plan.items)
  }
}

async function pushWorkouts(client, userId, workouts) {
  for (const w of workouts) {
    if (!str(w.id) || !isDate(w.date)) continue
    const { rowCount } = await client.query(
      // Ficha ainda não conhecida aqui: entra sem vínculo em vez de derrubar o sync.
      `insert into workouts (id, user_id, date, type, plan_id, duration, rpe, notes, updated_at, synced_at, deleted_at)
       values ($1, $9, $2, $3, (select id from plans where id = $4 and user_id = $9), $5, $6, $7,
               least($8::timestamptz, now()), now(), null)
       on conflict (id) do update set
         date = excluded.date,
         type = excluded.type,
         plan_id = excluded.plan_id,
         duration = excluded.duration,
         rpe = excluded.rpe,
         notes = excluded.notes,
         updated_at = excluded.updated_at,
         synced_at = now(),
         deleted_at = null
       where workouts.updated_at < excluded.updated_at and workouts.user_id = $9`,
      [
        str(w.id),
        w.date,
        str(w.type),
        w.planId ? str(w.planId) : null,
        num(w.duration),
        num(w.rpe),
        str(w.notes),
        iso(w.updatedAt),
        userId,
      ],
    )
    if (rowCount) await replaceItems(client, 'workout_items', 'workout_id', str(w.id), w.items)
  }
}

async function pushJumps(client, userId, jumps) {
  for (const j of jumps) {
    if (!str(j.id) || !isDate(j.date) || !num(j.height)) continue
    await client.query(
      `insert into jumps (id, user_id, date, kind, height, notes, updated_at, synced_at, deleted_at)
       values ($1, $7, $2, $3, $4, $5, least($6::timestamptz, now()), now(), null)
       on conflict (id) do update set
         date = excluded.date,
         kind = excluded.kind,
         height = excluded.height,
         notes = excluded.notes,
         updated_at = excluded.updated_at,
         synced_at = now(),
         deleted_at = null
       where jumps.updated_at < excluded.updated_at and jumps.user_id = $7`,
      [str(j.id), j.date, str(j.kind), num(j.height), str(j.notes), iso(j.updatedAt), userId],
    )
  }
}

/** Só apaga se o banco não tiver algo mais novo. */
async function pushDeletions(client, userId, table, tombstones) {
  for (const t of tombstones) {
    if (!str(t.id)) continue
    await client.query(
      `update ${table}
         set deleted_at = least($2::timestamptz, now()),
             updated_at = least($2::timestamptz, now()),
             synced_at = now()
       where id = $1 and user_id = $3 and updated_at < $2::timestamptz`,
      [str(t.id), iso(t.updatedAt), userId],
    )
  }
}

async function pull(client, userId, since) {
  // Uma consulta por vez: a mesma conexão não executa duas em paralelo.
  const plans = await client.query(
    `select id, name, type, days, notes, updated_at, deleted_at
       from plans where user_id = $2 and synced_at > $1`,
    [since, userId],
  )
  const planItems = await client.query(
    `select i.* from plan_items i join plans p on p.id = i.plan_id
      where p.user_id = $2 and p.synced_at > $1 and p.deleted_at is null order by i.position`,
    [since, userId],
  )
  const workouts = await client.query(
    `select id, date, type, plan_id, duration, rpe, notes, updated_at, deleted_at
       from workouts where user_id = $2 and synced_at > $1`,
    [since, userId],
  )
  const workoutItems = await client.query(
    `select i.* from workout_items i join workouts w on w.id = i.workout_id
      where w.user_id = $2 and w.synced_at > $1 and w.deleted_at is null order by i.position`,
    [since, userId],
  )
  const jumps = await client.query(
    `select id, date, kind, height, notes, updated_at, deleted_at
       from jumps where user_id = $2 and synced_at > $1`,
    [since, userId],
  )
  const settings = await client.query(
    `select reach, updated_at from user_settings where user_id = $2 and synced_at > $1`,
    [since, userId],
  )

  const itemsBy = (rows, key) => {
    const map = new Map()
    for (const r of rows) {
      const item = { name: r.name, sets: r.sets, reps: r.reps, load: r.load, rest: r.rest, unit: r.unit }
      const bucket = map.get(r[key])
      if (bucket) bucket.push(item)
      else map.set(r[key], [item])
    }
    return map
  }

  const planItemsBy = itemsBy(planItems.rows, 'plan_id')
  const workoutItemsBy = itemsBy(workoutItems.rows, 'workout_id')
  const deleted = { plans: [], workouts: [], jumps: [] }

  const out = { plans: [], workouts: [], jumps: [], deleted, reach: undefined, reachUpdatedAt: null }

  for (const p of plans.rows) {
    if (p.deleted_at) {
      deleted.plans.push(p.id)
      continue
    }
    out.plans.push({
      id: p.id,
      name: p.name,
      type: p.type,
      days: p.days ?? [],
      notes: p.notes,
      items: planItemsBy.get(p.id) ?? [],
      updatedAt: p.updated_at.toISOString(),
    })
  }

  for (const w of workouts.rows) {
    if (w.deleted_at) {
      deleted.workouts.push(w.id)
      continue
    }
    out.workouts.push({
      id: w.id,
      date: w.date,
      type: w.type,
      planId: w.plan_id,
      duration: w.duration,
      rpe: w.rpe,
      notes: w.notes,
      items: workoutItemsBy.get(w.id) ?? [],
      updatedAt: w.updated_at.toISOString(),
    })
  }

  for (const j of jumps.rows) {
    if (j.deleted_at) {
      deleted.jumps.push(j.id)
      continue
    }
    out.jumps.push({
      id: j.id,
      date: j.date,
      kind: j.kind,
      height: j.height,
      notes: j.notes,
      updatedAt: j.updated_at.toISOString(),
    })
  }

  if (settings.rows.length) {
    out.reach = settings.rows[0].reach
    out.reachUpdatedAt = settings.rows[0].updated_at.toISOString()
  }

  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Use POST.')

  const client = await db().connect()
  try {
    const user = await currentUser(client, req)
    if (!user) return fail(res, 401, 'Entre na sua conta pra sincronizar.')

    const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
    const since = body.since ? iso(body.since) : EPOCH
    const push = body.push ?? {}

    await client.query('begin')

    // Fichas antes dos treinos: o treino aponta pra ficha.
    await pushPlans(client, user.id, list(push.plans))
    await pushWorkouts(client, user.id, list(push.workouts))
    await pushJumps(client, user.id, list(push.jumps))

    await pushDeletions(client, user.id, 'workouts', list(push.deleted?.workouts))
    await pushDeletions(client, user.id, 'plans', list(push.deleted?.plans))
    await pushDeletions(client, user.id, 'jumps', list(push.deleted?.jumps))

    if (push.reachUpdatedAt) {
      await client.query(
        `insert into user_settings (user_id, reach, updated_at, synced_at)
         values ($3, $1, least($2::timestamptz, now()), now())
         on conflict (user_id) do update set
           reach = excluded.reach,
           updated_at = excluded.updated_at,
           synced_at = now()
         where user_settings.updated_at < excluded.updated_at`,
        [num(push.reach), iso(push.reachUpdatedAt), user.id],
      )
    }

    const pulled = await pull(client, user.id, since)
    const { rows } = await client.query('select now() as now')

    await client.query('commit')
    res.status(200).json({ now: rows[0].now.toISOString(), pull: pulled, user: user.username })
  } catch (err) {
    await client.query('rollback').catch(() => {})
    console.error('sync falhou:', err)
    fail(res, 500, 'Sync falhou: ' + err.message)
  } finally {
    client.release()
  }
}
