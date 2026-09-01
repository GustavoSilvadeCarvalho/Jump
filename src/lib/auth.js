// A sessão vive num cookie HttpOnly, que o navegador manda sozinho. Aqui fica só
// o nome de quem entrou, pra saber o estado sem depender de internet.

const USER_KEY = 'jump.user'

export function cachedUser() {
  try {
    return JSON.parse(localStorage.getItem(USER_KEY) || 'null')
  } catch {
    return null
  }
}

function cache(user) {
  try {
    if (user) localStorage.setItem(USER_KEY, JSON.stringify(user))
    else localStorage.removeItem(USER_KEY)
  } catch {
    // Sem storage: vale só até recarregar.
  }
}

async function post(body) {
  const res = await fetch('/api/auth', {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  })
  let dados = {}
  try {
    dados = await res.json()
  } catch {
    // Resposta sem JSON: fica só o status.
  }
  if (!res.ok) {
    const err = new Error(dados.error ?? 'erro ' + res.status)
    err.status = res.status
    throw err
  }
  return dados
}

/** Quem está logado segundo o servidor. Erro de rede não desloga ninguém. */
export async function me() {
  const { user } = await post({ action: 'me' })
  cache(user)
  return user
}

export async function login(username, password) {
  const { user } = await post({ action: 'login', username, password })
  cache(user)
  return user
}

export async function signup(username, password, invite) {
  const { user } = await post({ action: 'signup', username, password, invite })
  cache(user)
  return user
}

export async function logout() {
  try {
    await post({ action: 'logout' })
  } finally {
    cache(null)
  }
}

/** Sessão recusada: esquece quem estava logado aqui. */
export function forgetUser() {
  cache(null)
}
