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

/** 'hoje', 'ontem', 'há 4 dias' ou a data curta. */
export function relative(iso) {
  const diff = daysBetween(iso, today())
  if (diff === 0) return 'hoje'
  if (diff === 1) return 'ontem'
  if (diff > 1 && diff < 7) return `há ${diff} dias`
  return shortDate(iso)
}
