// Conexão com o Neon e autenticação, compartilhadas pelas funções de api/.
// O prefixo `_` faz a Vercel tratar este arquivo como código interno, não como rota.

import pg from 'pg'

// Colunas `date` voltam como string 'YYYY-MM-DD' (sem isso o pg devolve um Date
// em UTC e o dia muda de lugar dependendo do fuso). `numeric` volta como número.
pg.types.setTypeParser(1082, (v) => v)
pg.types.setTypeParser(1700, (v) => (v === null ? null : Number(v)))

let pool

/** Um pool por instância da função: a Vercel reaproveita entre invocações. */
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
