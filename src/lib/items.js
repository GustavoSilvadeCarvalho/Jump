import { uid } from './storage'

/**
 * Um item é uma linha de exercício — vale tanto pra ficha (o plano) quanto pro
 * treino registrado: nome, séries, repetições ou segundos, carga e descanso.
 */

export const emptyItem = (unit = 'reps') => ({
  key: uid(),
  name: '',
  sets: '',
  reps: '',
  load: '',
  rest: '',
  unit,
})

/** Alongamento e mobilidade se medem em segundos — é o padrão da categoria. */
export function isHoldType(type) {
  return type === 'alongamento' || type === 'mobilidade'
}

/**
 * A unidade é por exercício: dá pra pedir 30s de pogo jumps num treino de
 * pliometria contado em repetições. Item antigo (sem `unit`) cai no padrão da categoria.
 */
export function unitOf(item, type) {
  if (item?.unit === 'seg' || item?.unit === 'reps') return item.unit
  return isHoldType(type) ? 'seg' : 'reps'
}

/** Storage → formulário: os campos voltam como number|null e o input controlado precisa de string. */
export function toFormItems(items, type) {
  if (!items?.length) return [emptyItem(isHoldType(type) ? 'seg' : 'reps')]
  return items.map((i) => ({
    key: uid(),
    name: i.name ?? '',
    sets: i.sets ?? '',
    reps: i.reps ?? '',
    load: i.load ?? '',
    rest: i.rest ?? '',
    unit: unitOf(i, type),
  }))
}

/** Formulário → storage: descarta linha sem nome e converte vazio em null. */
export function toStoredItems(items) {
  const num = (v) => (v === '' || v === null ? null : Number(v))
  return items
    .filter((i) => i.name.trim())
    .map((i) => ({
      name: i.name.trim(),
      sets: num(i.sets),
      reps: num(i.reps),
      load: num(i.load),
      rest: num(i.rest),
      unit: i.unit === 'seg' ? 'seg' : 'reps',
    }))
}

/** Descanso em segundos → '90s' ou '2min'. */
export function restLabel(sec) {
  const n = Number(sec)
  if (!n) return null
  // Até 2 min a academia conta em segundos ('90s'), acima disso em minutos.
  if (n < 120) return n + 's'
  const min = Math.floor(n / 60)
  const rest = n % 60
  return rest ? `${min}min${rest}` : `${min}min`
}

/** '3× 8 · 40 kg · 90s desc' ou '3× 30s · 60s desc' — só o que estiver preenchido. */
export function itemSummary(item, type) {
  const seg = unitOf(item, type) === 'seg'
  const volume = [item.sets ? item.sets + '×' : null, item.reps ? (seg ? item.reps + 's' : item.reps) : null]
    .filter(Boolean)
    .join(' ')
  const rest = restLabel(item.rest)
  return [volume || null, item.load ? item.load + ' kg' : null, rest ? rest + ' desc' : null]
    .filter(Boolean)
    .join(' · ')
}
