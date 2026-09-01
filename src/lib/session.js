import { today } from './dates'
import { unitOf } from './items'
import { uid } from './storage'

/**
 * O treino em andamento: a ficha aberta na academia, com cada série marcada
 * conforme você faz. Só vira um treino salvo no fim.
 *
 * Fica só neste aparelho (não entra no sync): é estado de "agora", não histórico.
 */

/** Ficha → sessão. Cada exercício ganha uma casinha por série. */
export function sessionFromPlan(plan) {
  return {
    id: uid(),
    planId: plan.id ?? null,
    name: plan.name ?? 'Treino',
    type: plan.type,
    date: today(),
    startedAt: Date.now(),
    rest: null,
    items: (plan.items ?? []).map((i) => ({
      name: i.name,
      sets: Number(i.sets) || 1,
      reps: i.reps ?? null,
      load: i.load ?? null,
      rest: i.rest ?? null,
      unit: unitOf(i, plan.type),
      done: Array(Number(i.sets) || 1).fill(false),
    })),
  }
}

export function countSets(session) {
  let total = 0
  let done = 0
  for (const item of session.items) {
    total += item.done.length
    done += item.done.filter(Boolean).length
  }
  return { total, done }
}

/** O exercício da vez: o primeiro que ainda tem série pendente. */
export function currentIndex(session) {
  const i = session.items.findIndex((item) => item.done.some((d) => !d))
  return i === -1 ? session.items.length - 1 : i
}

/** Minutos desde o começo, pelo menos 1. */
export function elapsedMinutes(session) {
  return Math.max(1, Math.round((Date.now() - session.startedAt) / 60000))
}

export function elapsedLabel(session, agora = Date.now()) {
  const s = Math.max(0, Math.floor((agora - session.startedAt) / 1000))
  const m = Math.floor(s / 60)
  return String(m).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

export function clock(segundos) {
  const s = Math.max(0, segundos)
  return String(Math.floor(s / 60)).padStart(2, '0') + ':' + String(s % 60).padStart(2, '0')
}

/**
 * Sessão → treino salvo. Guarda o que você fez de verdade: séries realmente
 * marcadas e a carga que acabou usando, não o que a ficha planejava.
 */
export function sessionToWorkout(session, { rpe, notes }) {
  return {
    date: session.date,
    type: session.type,
    planId: session.planId,
    duration: elapsedMinutes(session),
    rpe: Number(rpe),
    notes: (notes ?? '').trim(),
    items: session.items
      .map((item) => ({ ...item, feitas: item.done.filter(Boolean).length }))
      .filter((item) => item.feitas > 0)
      .map((item) => ({
        name: item.name,
        sets: item.feitas,
        reps: item.reps === '' || item.reps === null ? null : Number(item.reps),
        load: item.load === '' || item.load === null ? null : Number(item.load),
        rest: item.rest === '' || item.rest === null ? null : Number(item.rest),
        unit: item.unit === 'seg' ? 'seg' : 'reps',
      })),
  }
}
