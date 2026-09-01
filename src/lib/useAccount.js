import { useCallback, useEffect, useRef, useState } from 'react'
import { cachedUser, forgetUser, logout, me } from './auth'
import { countPending, runSync } from './sync'

/** Estado da conta e do sync — o aviso no topo e o rodapé leem daqui. */
export function useAccount(store) {
  const [user, setUser] = useState(cachedUser)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [modal, setModal] = useState(false)

  const running = useRef(false)
  const bootedFor = useRef(null)
  const storeRef = useRef(store)
  useEffect(() => {
    storeRef.current = store
  })

  const pending = countPending(store)

  const sync = useCallback(async () => {
    if (!user || running.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    running.current = true
    setStatus('syncing')
    setError(null)
    try {
      const { result, pushed } = await runSync(storeRef.current)
      storeRef.current.applySync(result, pushed)
      setStatus('ok')
    } catch (err) {
      // Sessão recusada: o aviso de "só neste aparelho" volta.
      if (err.status === 401) {
        forgetUser()
        setUser(null)
      }
      setError(err)
      setStatus('error')
    } finally {
      running.current = false
    }
  }, [user])

  // Confere a sessão ao abrir; sem internet não desloga ninguém.
  useEffect(() => {
    if (!cachedUser()) return
    me()
      .then((u) => setUser(u))
      .catch((err) => {
        if (err.status === 401) {
          forgetUser()
          setUser(null)
        }
      })
  }, [])

  // Ao entrar sincroniza na hora; depois de editar, espera o dedo parar.
  useEffect(() => {
    if (!user) return
    const primeiraVez = bootedFor.current !== user.id
    if (!primeiraVez && pending === 0) return
    bootedFor.current = user.id
    const id = setTimeout(sync, primeiraVez ? 0 : 3000)
    return () => clearTimeout(id)
  }, [user, pending, sync])

  // Voltou a internet ou voltou pro app: boa hora pra tentar de novo.
  useEffect(() => {
    if (!user) return
    const onWake = () => document.visibilityState !== 'hidden' && sync()
    window.addEventListener('online', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      window.removeEventListener('online', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [user, sync])

  const sair = async () => {
    if (!confirm('Sair da conta neste aparelho? Os treinos continuam salvos aqui.')) return
    await logout()
    setUser(null)
    setStatus('idle')
    bootedFor.current = null
  }

  return { user, setUser, status, error, pending, sync, sair, modal, setModal, syncedAt: store.syncedAt }
}
