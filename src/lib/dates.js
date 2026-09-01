const MES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']

/** 'YYYY-MM-DD' de hoje, no fuso local (evita o off-by-one do toISOString). */
export function today() {
  const d = new Date()
  return toISO(d)
}

export function toISO(date) {
  const y = date.getFullYear()
  const m = String(date.getMonth() + 1).padStart(2, '0')
  const d = String(date.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/** Interpreta 'YYYY-MM-DD' como data local, não UTC. */
export function fromISO(iso) {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d)
}

export function shortDate(iso) {
  const d = fromISO(iso)
  return `${d.getDate()} ${MES[d.getMonth()]}`
}

export function longDate(iso) {
  const d = fromISO(iso)
  return `${d.getDate()} de ${MES[d.getMonth()]} de ${d.getFullYear()}`
}

export function daysBetween(isoA, isoB) {
  const ms = fromISO(isoB) - fromISO(isoA)
  return Math.round(ms / 86400000)
}

export function daysAgo(n) {
  const d = new Date()
  d.setDate(d.getDate() - n)
  return toISO(d)
}

/** 'hoje', 'amanhã', 'há 4 dias', 'em 3 dias' ou a data curta. */
export function relative(iso) {
  const diff = daysBetween(iso, today())
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  if (diff === -1) return 'amanhã'
  if (diff > 1 && diff < 7) return `há ${diff} dias`
  if (diff < -1 && diff > -7) return `em ${-diff} dias`
  return shortDate(iso)
}

export const WEEKDAYS = [
  { key: 0, label: 'Domingo', short: 'Dom' },
  { key: 1, label: 'Segunda', short: 'Seg' },
  { key: 2, label: 'Terça', short: 'Ter' },
  { key: 3, label: 'Quarta', short: 'Qua' },
  { key: 4, label: 'Quinta', short: 'Qui' },
  { key: 5, label: 'Sexta', short: 'Sex' },
  { key: 6, label: 'Sábado', short: 'Sáb' },
]

const MES_LONGO = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
]

/** 0 (domingo) a 6 (sábado). */
export function weekday(iso) {
  return fromISO(iso).getDay()
}

export function addDays(iso, n) {
  const d = fromISO(iso)
  d.setDate(d.getDate() + n)
  return toISO(d)
}

/** '31 de agosto'. */
export function dayMonth(iso) {
  const d = fromISO(iso)
  return `${d.getDate()} de ${MES_LONGO[d.getMonth()]}`
}

export function monthLabel(year, month) {
  return `${MES_LONGO[month]} de ${year}`
}

/** As 6 semanas do mês, do domingo: 42 células fixas, pra grade não pular de altura. */
export function monthGrid(year, month) {
  const first = new Date(year, month, 1)
  const start = new Date(year, month, 1 - first.getDay())
  const cells = []
  for (let i = 0; i < 42; i++) {
    const d = new Date(start.getFullYear(), start.getMonth(), start.getDate() + i)
    cells.push({ iso: toISO(d), day: d.getDate(), inMonth: d.getMonth() === month })
  }
  return cells
}
