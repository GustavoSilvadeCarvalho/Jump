import { CATEGORY_KEYS } from './data'
import { daysAgo, daysBetween, today } from './dates'

export function sortByDate(list) {
  return [...list].sort((a, b) => (a.date < b.date ? -1 : a.date > b.date ? 1 : 0))
}

/** Melhor salto registrado, considerando todos os tipos. */
export function personalRecord(jumps) {
  if (!jumps.length) return null
  return jumps.reduce((best, j) => (j.height > best.height ? j : best))
}

/**
 * Progresso do tipo de salto mais registrado: primeiro x último.
 * Comparar tipos diferentes (CMJ x salto com corrida) não diria nada.
 */
export function progress(jumps) {
  if (jumps.length < 2) return null
  const counts = {}
  for (const j of jumps) counts[j.kind] = (counts[j.kind] || 0) + 1
  const kind = Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b))
  const series = sortByDate(jumps.filter((j) => j.kind === kind))
  if (series.length < 2) return null
  const first = series[0]
  const last = series[series.length - 1]
  return {
    kind,
    first,
    last,
    delta: +(last.height - first.height).toFixed(1),
    days: daysBetween(first.date, last.date),
  }
}

/** Dias seguidos treinando, contando de hoje (ou de ontem) pra trás. */
export function streak(workouts) {
  if (!workouts.length) return 0
  const dates = new Set(workouts.map((w) => w.date))
  const t = today()
  // Ainda não treinou hoje não zera a sequência — começa a contar de ontem.
  let cursor = dates.has(t) ? 0 : 1
  if (!dates.has(daysAgo(cursor))) return 0
  let count = 0
  while (dates.has(daysAgo(cursor))) {
    count++
    cursor++
  }
  return count
}

export function inLastDays(list, n) {
  const limit = daysAgo(n)
  return list.filter((item) => item.date >= limit)
}

/** Quantos treinos de cada categoria na janela informada. */
export function volumeByCategory(workouts, days = 30) {
  const recent = inLastDays(workouts, days)
  const out = {}
  for (const key of CATEGORY_KEYS) out[key] = 0
  for (const w of recent) {
    if (out[w.type] !== undefined) out[w.type]++
  }
  return out
}

export function totalMinutes(workouts) {
  return workouts.reduce((sum, w) => sum + (Number(w.duration) || 0), 0)
}

/** Altura de alcance somada ao salto — só faz sentido se o alcance parado estiver salvo. */
export function touchHeight(reach, jumpHeight) {
  if (typeof reach !== 'number' || !reach) return null
  return +(reach + jumpHeight).toFixed(1)
}
