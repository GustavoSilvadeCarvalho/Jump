// Conexão com o Neon. O prefixo _ faz a Vercel tratar o arquivo como código, não rota.

import pg from 'pg'

// date volta como 'YYYY-MM-DD' (o padrão seria um Date em UTC, que troca o dia
// dependendo do fuso) e numeric volta como número.
pg.types.setTypeParser(1082, (v) => v)
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)))

let pool

/** Um pool por instância: a Vercel reaproveita entre invocações. */
export function db() {
  if (!pool) {
    const connectionString = process.env.DATABASE_URL
    if (!connectionString) throw new Error('DATABASE_URL não configurada')
    pool = new pg.Pool({
      connectionString,
      ssl: { rejectUnauthorized: true },
      max: 3,
      idleTimeoutMillis: 10_000,
    })
  }
  return pool
}

export function fail(res, status, message) {
  res.status(status).json({ error: message })
}
