import { useCallback, useEffect, useState } from 'react'

const KEY = 'jump.v1'

const EPOCH = '1970-01-01T00:00:00.000Z'

export const EMPTY = {
  workouts: [],
  jumps: [],
  plans: [],
  reach: null,
  reachUpdatedAt: null,
  // Registros apagados aqui, esperando o sync avisar o servidor.
  deleted: { plans: [], workouts: [], jumps: [] },
  // Ids editados aqui e ainda não enviados.
  dirty: { plans: [], workouts: [], jumps: [], reach: false },
  // Hora do servidor no último sync — o marco do "o que mudou desde então".
  syncedAt: null,
}

const now = () => new Date().toISOString()

const ids = (v) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string') : [])

/** Registro que veio de antes do sync existir: carimbo mais antigo possível, pra não vencer nada. */
const stamped = (list) =>
  (Array.isArray(list) ? list : []).map((r) => (r?.updatedAt ? r : { ...r, updatedAt: EPOCH }))

/** Normaliza o que veio do storage ou de um backup — campos novos podem não existir. */
export function normalize(parsed) {
  if (!parsed || typeof parsed !== 'object') return EMPTY
  return {
    workouts: stamped(parsed.workouts),
    jumps: stamped(parsed.jumps),
    plans: stamped(parsed.plans),
    reach: typeof parsed.reach === 'number' ? parsed.reach : null,
    reachUpdatedAt: parsed.reachUpdatedAt ?? null,
    deleted: {
      plans: Array.isArray(parsed.deleted?.plans) ? parsed.deleted.plans : [],
      workouts: Array.isArray(parsed.deleted?.workouts) ? parsed.deleted.workouts : [],
      jumps: Array.isArray(parsed.deleted?.jumps) ? parsed.deleted.jumps : [],
    },
    dirty: {
      plans: ids(parsed.dirty?.plans),
      workouts: ids(parsed.dirty?.workouts),
      jumps: ids(parsed.dirty?.jumps),
      reach: !!parsed.dirty?.reach,
    },
    syncedAt: parsed.syncedAt ?? null,
  }
}

function read() {
  try {
    const raw = localStorage.getItem(KEY)
    if (!raw) return EMPTY
    return normalize(JSON.parse(raw))
  } catch {
    // Storage bloqueado (aba anônima, cookies desligados) ou JSON corrompido:
    // segue com estado vazio em vez de derrubar o app.
    return EMPTY
  }
}

const markDirty = (dirty, key, id) => ({
  ...dirty,
  [key]: dirty[key].includes(id) ? dirty[key] : [...dirty[key], id],
})

const tombstone = (deleted, key, id) => ({
  ...deleted,
  [key]: [...deleted[key].filter((t) => t.id !== id), { id, updatedAt: now() }],
})

/** Apagar: sai da lista, entra na lista de mortos e deixa de estar pendente de envio. */
function removeRecord(state, key, id) {
  return {
    ...state,
    [key]: state[key].filter((r) => r.id !== id),
    deleted: tombstone(state.deleted, key, id),
    dirty: { ...state.dirty, [key]: state.dirty[key].filter((x) => x !== id) },
  }
}

/**
 * Junta o que veio do servidor com o que existe aqui. Por registro vence o
 * carimbo mais novo, então uma edição local ainda não enviada não é atropelada
 * pelo que o banco tinha. Função pura de propósito: é o coração do sync e dá
 * pra testar sem montar a tela.
 */
export function mergeSync(state, result, pushed) {
  // O que foi enviado nesta rodada, com o carimbo que tinha na hora do envio.
  const enviado = (key) => new Map(pushed[key].map((p) => [p.id, p.updatedAt]))

  const merge = (key, incoming) => {
    const sent = enviado(key)
    const byId = new Map(state[key].map((r) => [r.id, r]))
    for (const r of incoming) {
      const local = byId.get(r.id)
      // Registro que acabamos de enviar e não foi tocado desde então: a versão
      // do servidor manda, mesmo com carimbo mais antigo. Ele pode ter ajustado
      // o carimbo (relógio do aparelho adiantado) ou recusado o envio por já ter
      // algo mais novo — nos dois casos o certo é ficar com a dele.
      const intocado = sent.has(r.id) && local?.updatedAt === sent.get(r.id)
      if (!local || intocado || r.updatedAt > local.updatedAt) byId.set(r.id, r)
    }
    for (const id of result.pull.deleted?.[key] ?? []) {
      // Uma edição local ainda não enviada segura o registro: ela é mais nova
      // que o apagar que o servidor conhece, e vai vencer no próximo envio.
      if (byId.has(id) && !state.dirty[key].includes(id)) byId.delete(id)
    }
    return [...byId.values()]
  }

  // Continua pendente o que não foi enviado — e o que mudou depois de enviado.
  const stillDirty = (key) => {
    const sent = enviado(key)
    return state.dirty[key].filter((id) => {
      if (!sent.has(id)) return true
      const local = state[key].find((r) => r.id === id)
      return !!local && local.updatedAt !== sent.get(id)
    })
  }
  const serverReachIsNewer =
    result.pull.reachUpdatedAt &&
    (pushed.reach || !state.reachUpdatedAt || result.pull.reachUpdatedAt > state.reachUpdatedAt)

  return {
    ...state,
    plans: merge('plans', result.pull.plans),
    workouts: merge('workouts', result.pull.workouts),
    jumps: merge('jumps', result.pull.jumps),
    reach: serverReachIsNewer ? result.pull.reach : state.reach,
    reachUpdatedAt: serverReachIsNewer ? result.pull.reachUpdatedAt : state.reachUpdatedAt,
    deleted: {
      plans: state.deleted.plans.filter((t) => !pushed.deleted.plans.includes(t.id)),
      workouts: state.deleted.workouts.filter((t) => !pushed.deleted.workouts.includes(t.id)),
      jumps: state.deleted.jumps.filter((t) => !pushed.deleted.jumps.includes(t.id)),
    },
    dirty: {
      plans: stillDirty('plans'),
      workouts: stillDirty('workouts'),
      jumps: stillDirty('jumps'),
      reach: pushed.reach ? false : state.dirty.reach,
    },
    syncedAt: result.now,
  }
}

export function useStore() {
  const [state, setState] = useState(read)

  useEffect(() => {
    try {
      localStorage.setItem(KEY, JSON.stringify(state))
    } catch {
      // Sem persistência disponível — a sessão atual continua funcionando.
    }
  }, [state])

  const addRecord = useCallback((key, record) => {
    const id = uid()
    setState((s) => ({
      ...s,
      [key]: [...s[key], { ...record, id, updatedAt: now() }],
      dirty: markDirty(s.dirty, key, id),
    }))
  }, [])

  const patchRecord = useCallback((key, id, patch) => {
    setState((s) => ({
      ...s,
      [key]: s[key].map((r) => (r.id === id ? { ...r, ...patch, updatedAt: now() } : r)),
      dirty: markDirty(s.dirty, key, id),
    }))
  }, [])

  const addWorkout = useCallback((w) => addRecord('workouts', w), [addRecord])
  const updateWorkout = useCallback((id, patch) => patchRecord('workouts', id, patch), [patchRecord])
  const removeWorkout = useCallback((id) => setState((s) => removeRecord(s, 'workouts', id)), [])

  const addPlan = useCallback((p) => addRecord('plans', p), [addRecord])
  const updatePlan = useCallback((id, patch) => patchRecord('plans', id, patch), [patchRecord])

  const removePlan = useCallback((id) => {
    setState((s) => {
      const next = removeRecord(s, 'plans', id)
      // O histórico fica: o treino já registrado perde só o vínculo com a ficha.
      const soltos = next.workouts.filter((w) => w.planId === id)
      return {
        ...next,
        workouts: next.workouts.map((w) =>
          w.planId === id ? { ...w, planId: null, updatedAt: now() } : w,
        ),
        dirty: soltos.reduce((d, w) => markDirty(d, 'workouts', w.id), next.dirty),
      }
    })
  }, [])

  const addJump = useCallback((j) => addRecord('jumps', j), [addRecord])
  const removeJump = useCallback((id) => setState((s) => removeRecord(s, 'jumps', id)), [])

  const setReach = useCallback((reach) => {
    setState((s) => ({
      ...s,
      reach,
      reachUpdatedAt: now(),
      dirty: { ...s.dirty, reach: true },
    }))
  }, [])

  /** Backup importado é tratado como edição local: tudo entra na fila de envio. */
  const importAll = useCallback((data) => {
    setState(() => {
      const base = normalize(data)
      return {
        ...base,
        syncedAt: null,
        dirty: {
          plans: base.plans.map((p) => p.id),
          workouts: base.workouts.map((w) => w.id),
          jumps: base.jumps.map((j) => j.id),
          reach: base.reach !== null,
        },
      }
    })
  }, [])

  /** Apagar tudo vira lápide de cada registro, pra sumir também dos outros aparelhos. */
  const clearAll = useCallback(() => {
    setState((s) => ({
      ...EMPTY,
      syncedAt: s.syncedAt,
      deleted: {
        plans: s.plans.map((p) => ({ id: p.id, updatedAt: now() })),
        workouts: s.workouts.map((w) => ({ id: w.id, updatedAt: now() })),
        jumps: s.jumps.map((j) => ({ id: j.id, updatedAt: now() })),
      },
    }))
  }, [])

  const applySync = useCallback((result, pushed) => {
    setState((s) => mergeSync(s, result, pushed))
  }, [])

  return {
    ...state,
    addWorkout,
    updateWorkout,
    removeWorkout,
    addPlan,
    updatePlan,
    removePlan,
    addJump,
    removeJump,
    setReach,
    importAll,
    clearAll,
    applySync,
  }
}

export function uid() {
  return Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
}
