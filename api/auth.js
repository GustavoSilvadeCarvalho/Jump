// POST /api/auth — criar conta, entrar, sair e saber quem está logado.

import {
  checkPassword,
  closeSession,
  currentUser,
  hashPassword,
  inviteOk,
  openSession,
  sessionToken,
} from './_auth.js'
import { db, fail } from './_db.js'

const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36)

const limpo = (v) => String(v ?? '').trim()

function validar(username, password) {
  if (username.length < 3) return 'O usuário precisa de pelo menos 3 letras.'
  if (username.length > 32) return 'Usuário muito longo.'
  if (!/^[a-z0-9._-]+$/i.test(username)) return 'Use só letras, números, ponto, hífen ou _.'
  if (password.length < 8) return 'A senha precisa de pelo menos 8 caracteres.'
  if (password.length > 200) return 'Senha muito longa.'
  return null
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'Use POST.')

  const body = typeof req.body === 'string' ? JSON.parse(req.body || '{}') : (req.body ?? {})
  const action = limpo(body.action)
  const username = limpo(body.username).toLowerCase()
  const password = String(body.password ?? '')

  const client = await db().connect()
  try {
    if (action === 'me') {
      const user = await currentUser(client, req)
      return res.status(200).json({ user })
    }

    if (action === 'logout') {
      const cookie = await closeSession(client, sessionToken(req))
      res.setHeader('Set-Cookie', cookie)
      return res.status(200).json({ user: null })
    }

    if (action === 'signup') {
      if (!inviteOk(body.invite)) return fail(res, 403, 'Código de convite inválido.')
      const erro = validar(username, password)
      if (erro) return fail(res, 400, erro)

      const existe = await client.query('select 1 from users where username = $1', [username])
      if (existe.rowCount) return fail(res, 409, 'Esse usuário já existe. Tente entrar.')

      const id = uid()
      await client.query('begin')
      await client.query('insert into users (id, username, password_hash) values ($1, $2, $3)', [
        id,
        username,
        await hashPassword(password),
      ])
      await client.query('insert into user_settings (user_id) values ($1) on conflict do nothing', [id])

      // A primeira conta adota o que já estava no banco sem dono.
      const { rows } = await client.query('select count(*)::int as n from users')
      if (rows[0].n === 1) {
        for (const t of ['plans', 'workouts', 'jumps']) {
          await client.query(`update ${t} set user_id = $1 where user_id is null`, [id])
        }
      }
      await client.query('commit')

      const cookie = await openSession(client, id, req.headers['user-agent'])
      res.setHeader('Set-Cookie', cookie)
      return res.status(200).json({ user: { id, username } })
    }

    if (action === 'login') {
      const { rows } = await client.query(
        'select id, username, password_hash from users where username = $1',
        [username],
      )
      const user = rows[0]
      // Gasta o tempo do scrypt mesmo sem o usuário: responder rápido entregaria quem existe.
      const ok = await checkPassword(password, user?.password_hash ?? 'scrypt$16384$aaaa$aaaa')
      if (!user || !ok) return fail(res, 401, 'Usuário ou senha não conferem.')

      const cookie = await openSession(client, user.id, req.headers['user-agent'])
      res.setHeader('Set-Cookie', cookie)
      return res.status(200).json({ user: { id: user.id, username: user.username } })
    }

    return fail(res, 400, 'Ação desconhecida.')
  } catch (err) {
    await client.query('rollback').catch(() => {})
    console.error('auth falhou:', err)
    return fail(res, 500, 'Falhou aqui do lado: ' + err.message)
  } finally {
    client.release()
  }
}
