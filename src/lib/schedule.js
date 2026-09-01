import { WEEKDAYS, addDays, weekday } from './dates'

/**
 * Uma ficha é um plano semanal: ela se repete nos dias da semana marcados
 * (`days`, 0 = domingo). O calendário projeta isso pra frente e pra trás;
 * nada de sessão é gravado até você registrar o treino.
 */

/** Fichas marcadas pro dia da semana dessa data. */
export function plansForDate(plans, iso) {
  const d = weekday(iso)
  return plans.filter((p) => Array.isArray(p.days) && p.days.includes(d))
}

/** Índice 'YYYY-MM-DD' → treinos registrados naquele dia. */
export function workoutsByDate(workouts) {
  const map = new Map()
  for (const w of workouts) {
    const list = map.get(w.date)
    if (list) list.push(w)
    else map.set(w.date, [w])
  }
  return map
}

/**
 * A ficha conta como cumprida se algum treino do dia aponta pra ela — ou,
 * pra quem registrou sem escolher ficha, se bate a categoria.
 */
export function planDone(plan, dayWorkouts = []) {
  return dayWorkouts.some((w) => (w.planId ? w.planId === plan.id : w.type === plan.type))
}

/** O que aconteceu e o que está previsto num dia. */
export function dayAgenda(iso, plans, byDate) {
  const done = byDate.get(iso) ?? []
  const planned = plansForDate(plans, iso).map((plan) => ({ plan, done: planDone(plan, done) }))
  return { iso, done, planned }
}

/** Próximas sessões previstas, a partir de (e incluindo) `fromIso`. */
export function upcoming(plans, workouts, fromIso, days = 7) {
  const byDate = workoutsByDate(workouts)
  const out = []
  for (let i = 0; i < days; i++) {
    const iso = addDays(fromIso, i)
    for (const entry of dayAgenda(iso, plans, byDate).planned) {
      out.push({ iso, ...entry })
    }
  }
  return out
}

/** Séries somadas — leitura rápida do tamanho da ficha. */
export function totalSets(plan) {
  return (plan.items ?? []).reduce((sum, i) => sum + (Number(i.sets) || 0), 0)
}

/** Ficha → rascunho de treino, pra abrir o formulário já preenchido. */
export function planToDraft(plan, date) {
  return {
    date,
    type: plan.type,
    planId: plan.id,
    duration: '',
    rpe: 7,
    notes: '',
    items: (plan.items ?? []).map((i) => ({ ...i })),
  }
}

/** 'Seg · Qui', 'Todo dia' ou aviso de ficha sem agenda. */
export function daysLabel(days) {
  const list = Array.isArray(days) ? [...days].sort((a, b) => a - b) : []
  if (list.length === 0) return 'Sem dia fixo'
  if (list.length === 7) return 'Todo dia'
  return list.map((d) => WEEKDAYS[d].short).join(' · ')
}

export function startOfWeek(iso) {
  return addDays(iso, -weekday(iso))
}

/** Os 7 dias da semana de `iso`, de domingo a sábado. */
export function weekDays(iso) {
  const start = startOfWeek(iso)
  return Array.from({ length: 7 }, (_, i) => addDays(start, i))
}

/** A semana inteira de uma vez: agenda de cada dia + quanto do previsto já saiu. */
export function weekSummary(plans, workouts, iso) {
  const byDate = workoutsByDate(workouts)
  const days = weekDays(iso).map((d) => dayAgenda(d, plans, byDate))
  return {
    days,
    planned: days.reduce((n, d) => n + d.planned.length, 0),
    completed: days.reduce((n, d) => n + d.planned.filter((p) => p.done).length, 0),
    done: days.reduce((n, d) => n + d.done.length, 0),
  }
}

/** A próxima sessão prevista que ainda não foi feita — 'o que eu treino agora'. */
export function nextSession(plans, workouts, fromIso) {
  return upcoming(plans, workouts, fromIso, 14).find((s) => !s.done) ?? null
}
