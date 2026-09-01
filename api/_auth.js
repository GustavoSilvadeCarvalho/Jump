// Contas e sessões. Senha com scrypt; do token de sessão o banco guarda só o hash.

import crypto from 'node:crypto'
import { promisify } from 'node:util'

const scrypt = promisify(crypto.scrypt)

const COOKIE = 'jump_sessao'
const DIAS = 180
const N = 16384 // custo do scrypt: ~16 MB e ~100ms por tentativa

export async function hashPassword(senha) {
  const salt = crypto.randomBytes(16)
  const key = await scrypt(senha.normalize('NFKC'), salt, 64, { N, r: 8, p: 1 })
  return 'scrypt$' + N + '$' + salt.toString('base64url') + '$' + key.toString('base64url')
}

export async function checkPassword(senha, guardado) {
  try {
    const [algo, custo, salt, key] = String(guardado).split('$')
    if (algo !== 'scrypt') return false
    const esperado = Buffer.from(key, 'base64url')
    const calculado = await scrypt(senha.normalize('NFKC'), Buffer.from(salt, 'base64url'), esperado.length, {
      N: Number(custo),
      r: 8,
      p: 1,
    })
    return crypto.timingSafeEqual(esperado, calculado)
  } catch {
    return false
  }
}

const hashToken = (token) => crypto.createHash('sha256').update(token).digest('hex')

function parseCookies(req) {
  const bruto = req.headers?.cookie
  if (!bruto) return {}
  const out = {}
  for (const parte of bruto.split(';')) {
    const i = parte.indexOf('=')
    if (i === -1) continue
    out[parte.slice(0, i).trim()] = decodeURIComponent(parte.slice(i + 1).trim())
  }
  return out
}

/** Cria a sessão e devolve o cabeçalho de cookie. */
export async function openSession(client, userId, userAgent) {
  const token = crypto.randomBytes(32).toString('base64url')
  const expira = new Date(Date.now() + DIAS * 86400_000)
  await client.query(
    'insert into sessions (token_hash, user_id, user_agent, expires_at) values ($1, $2, $3, $4)',
    [hashToken(token), userId, String(userAgent ?? '').slice(0, 200), expira],
  )
  return cookieHeader(token, DIAS * 86400)
}

export async function closeSession(client, token) {
  if (token) await client.query('delete from sessions where token_hash = $1', [hashToken(token)])
  return cookieHeader('', 0)
}

function cookieHeader(valor, maxAge) {
  return [
    COOKIE + '=' + valor,
    'Path=/',
    'HttpOnly',
    // Sem isto o cookie viajaria em requisição feita por outro site.
    'SameSite=Lax',
    'Secure',
    'Max-Age=' + maxAge,
  ].join('; ')
}

export const sessionToken = (req) => parseCookies(req)[COOKIE] ?? null

/** Quem está falando, ou null. */
export async function currentUser(client, req) {
  const token = sessionToken(req)
  if (!token) return null
  const { rows } = await client.query(
    `select u.id, u.username
       from sessions s join users u on u.id = s.user_id
      where s.token_hash = $1 and s.expires_at > now()`,
    [hashToken(token)],
  )
  return rows[0] ?? null
}

/** Criar conta pede convite, senão qualquer um abriria conta no seu banco. */
export function inviteOk(codigo) {
  const esperado = process.env.SIGNUP_CODE || process.env.SYNC_TOKEN
  if (!esperado) return false
  const a = Buffer.from(String(codigo ?? ''))
  const b = Buffer.from(esperado)
  return a.length === b.length && crypto.timingSafeEqual(a, b)
}
