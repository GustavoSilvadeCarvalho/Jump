// Conversa com /api/sync. O localStorage é a fonte da verdade; sem sinal ou sem
// conta, o que mudou fica pendente e vai na próxima.

/** O que ainda não foi enviado. */
function pendingChanges(state) {
  const dirtyOnes = (key) => state[key].filter((r) => state.dirty[key].includes(r.id))
  return {
    plans: dirtyOnes('plans'),
    workouts: dirtyOnes('workouts'),
    jumps: dirtyOnes('jumps'),
    deleted: state.deleted,
    reach: state.dirty.reach ? state.reach : undefined,
    reachUpdatedAt: state.dirty.reach ? state.reachUpdatedAt : undefined,
  }
}

export function countPending(state) {
  return (
    state.dirty.plans.length +
    state.dirty.workouts.length +
    state.dirty.jumps.length +
    state.deleted.plans.length +
    state.deleted.workouts.length +
    state.deleted.jumps.length +
    (state.dirty.reach ? 1 : 0)
  )
}

/** O pacote de saída e a lista do que ele leva — o que mudar durante a
 *  requisição fica de fora e vai na próxima. */
export function buildPush(state) {
  const push = pendingChanges(state)
  return {
    push,
    pushed: {
      // O carimbo do envio denuncia edição feita durante a requisição.
      plans: push.plans.map((p) => ({ id: p.id, updatedAt: p.updatedAt })),
      workouts: push.workouts.map((w) => ({ id: w.id, updatedAt: w.updatedAt })),
      jumps: push.jumps.map((j) => ({ id: j.id, updatedAt: j.updatedAt })),
      deleted: {
        plans: push.deleted.plans.map((t) => t.id),
        workouts: push.deleted.workouts.map((t) => t.id),
        jumps: push.deleted.jumps.map((t) => t.id),
      },
      reach: push.reachUpdatedAt !== undefined,
    },
  }
}

/** Envia e recebe. Quem autentica é o cookie de sessão, mandado pelo navegador. */
export async function runSync(state) {
  const { push, pushed } = buildPush(state)

  const res = await fetch('/api/sync', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify({ since: state.syncedAt, push }),
  })

  if (!res.ok) {
    let detalhe = 'erro ' + res.status
    try {
      detalhe = (await res.json()).error ?? detalhe
    } catch {
      // Resposta sem JSON: fica o status mesmo.
    }
    const err = new Error(detalhe)
    err.status = res.status
    throw err
  }

  return { result: await res.json(), pushed }
}
