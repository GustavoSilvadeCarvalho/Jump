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

/** Comparação em tempo constante — não vaza o tamanho do prefixo certo. */
function sameSecret(a, b) {
  if (typeof a !== 'string' || typeof b !== 'string' || a.length !== b.length) return false
  let diff = 0
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i)
  return diff === 0
}

/**
 * Não há login: o que protege a API é um código que você digita uma vez em cada
 * aparelho. Ele fica no localStorage do aparelho e vai no cabeçalho de cada
 * chamada — nunca dentro do bundle, que é público.
 */
export function authorized(req) {
  const expected = process.env.SYNC_TOKEN
  if (!expected) return false
  const sent = req.headers['x-sync-token']
  return sameSecret(Array.isArray(sent) ? sent[0] : sent, expected)
}

export function fail(res, status, message) {
  res.status(status).json({ error: message })
}
