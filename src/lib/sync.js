/**
 * Conversa com /api/sync.
 *
 * O aparelho é a fonte da verdade enquanto você treina: tudo continua sendo
 * salvo no localStorage na hora. O sync só leva o que mudou aqui e traz o que
 * mudou lá — se estiver sem sinal ou sem conta, fica pendente e vai na próxima.
 */

/** O que ainda não foi enviado. */
export function pendingChanges(state) {
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

/**
 * O pacote de saída e a lista do que ele leva. Marcar como sincronizado apenas
 * o que estava nessa lista faz com que o que você editar durante a requisição
 * continue pendente e vá na próxima rodada.
 */
export function buildPush(state) {
  const push = pendingChanges(state)
  return {
    push,
    pushed: {
      // Guarda o carimbo que foi enviado: se o registro for editado de novo
      // durante a requisição, dá pra ver que ele mudou e continuar pendente.
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

/**
 * Envia o que mudou aqui e recebe o que mudou lá. Quem autentica é o cookie de
 * sessão, que o navegador manda sozinho — nada de segredo passando pelo app.
 */
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
      // Resposta sem JSON (proxy, offline, HTML de erro): fica o status mesmo.
    }
    const err = new Error(detalhe)
    err.status = res.status
    throw err
  }

  return { result: await res.json(), pushed }
}
