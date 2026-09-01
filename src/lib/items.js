// Uma linha de exercício, igual na ficha e no treino registrado.

import { uid } from './storage'

export const emptyItem = (unit = 'reps') => ({
  key: uid(),
  name: '',
  sets: '',
  reps: '',
  load: '',
  rest: '',
  unit,
})

/** Alongamento e mobilidade contam em segundos por padrão. */
export function isHoldType(type) {
  return type === 'alongamento' || type === 'mobilidade'
}

/** A unidade é por exercício; item antigo cai no padrão da categoria. */
export function unitOf(item, type) {
  if (item?.unit === 'seg' || item?.unit === 'reps') return item.unit
  return isHoldType(type) ? 'seg' : 'reps'
}

/** Storage → formulário: o input controlado precisa de string, não de number|null. */
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
  // Até 2 min a academia conta em segundos.
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
