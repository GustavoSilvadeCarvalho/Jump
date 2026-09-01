import { useCallback, useEffect, useRef, useState } from 'react'
import { countPending, getToken, runSync, setToken } from '../lib/sync'
import { Button, Field, Input, Modal } from './ui'

function agoLabel(iso) {
  if (!iso) return null
  const min = Math.floor((Date.now() - new Date(iso).getTime()) / 60000)
  if (min < 1) return 'agora'
  if (min < 60) return 'há ' + min + ' min'
  const h = Math.floor(min / 60)
  if (h < 24) return 'há ' + h + (h === 1 ? ' hora' : ' horas')
  const d = Math.floor(h / 24)
  return 'há ' + d + (d === 1 ? ' dia' : ' dias')
}

function friendlyError(err) {
  if (err?.status === 401) return 'Código de sincronização recusado.'
  if (err?.status === 404) return 'Sync indisponível aqui — ele só existe no site publicado.'
  if (err?.message === 'Failed to fetch') return 'Sem conexão — as mudanças ficam guardadas.'
  return err?.message ?? 'Falhou.'
}

export default function SyncPanel({ store }) {
  const [token, setTokenState] = useState(getToken)
  const [status, setStatus] = useState('idle')
  const [error, setError] = useState(null)
  const [open, setOpen] = useState(false)
  const [draft, setDraft] = useState('')

  const running = useRef(false)
  const bootedFor = useRef(null)
  // O sync sempre lê o estado mais recente, não o do render em que foi agendado.
  const storeRef = useRef(store)
  useEffect(() => {
    storeRef.current = store
  })

  const pending = countPending(store)

  const sync = useCallback(async () => {
    if (!token || running.current) return
    if (typeof navigator !== 'undefined' && navigator.onLine === false) return
    running.current = true
    setStatus('syncing')
    setError(null)
    try {
      const { result, pushed } = await runSync(storeRef.current, token)
      storeRef.current.applySync(result, pushed)
      setStatus('ok')
    } catch (err) {
      setError(err)
      setStatus('error')
    } finally {
      running.current = false
    }
  }, [token])

  // Ao abrir o app (e ao conectar) sincroniza na hora; depois de uma edição,
  // espera o dedo parar pra não mandar uma requisição por tecla digitada.
  useEffect(() => {
    if (!token) return
    const primeiraVez = bootedFor.current !== token
    if (!primeiraVez && pending === 0) return
    bootedFor.current = token
    const id = setTimeout(sync, primeiraVez ? 0 : 3000)
    return () => clearTimeout(id)
  }, [token, pending, sync])

  // Voltou a internet ou voltou pro app: boa hora pra tentar de novo.
  useEffect(() => {
    if (!token) return
    const onWake = () => document.visibilityState !== 'hidden' && sync()
    window.addEventListener('online', onWake)
    document.addEventListener('visibilitychange', onWake)
    return () => {
      window.removeEventListener('online', onWake)
      document.removeEventListener('visibilitychange', onWake)
    }
  }, [token, sync])

  const connect = () => {
    const value = draft.trim()
    if (!value) return
    setToken(value)
    setTokenState(value)
    setOpen(false)
    setDraft('')
  }

  const disconnect = () => {
    if (!confirm('Parar de sincronizar neste aparelho? Os treinos continuam salvos aqui.')) return
    setToken('')
    setTokenState('')
    setStatus('idle')
    setError(null)
  }

  const dot =
    status === 'error'
      ? '#e66767'
      : status === 'syncing'
        ? 'var(--color-ink-3)'
        : pending > 0
          ? 'var(--color-cat-mob)'
          : token
            ? 'var(--color-accent)'
            : 'var(--color-ink-3)'

  const texto = !token
    ? 'Sincronização desligada — os treinos ficam só neste aparelho.'
    : status === 'syncing'
      ? 'Sincronizando…'
      : status === 'error'
        ? friendlyError(error)
        : pending > 0
          ? pending + (pending === 1 ? ' mudança pendente' : ' mudanças pendentes')
          : store.syncedAt
            ? 'Tudo sincronizado · ' + agoLabel(store.syncedAt)
            : 'Conectado'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="flex items-center gap-2 text-ink-3">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: dot }} aria-hidden="true" />
        {texto}
      </span>

      {token ? (
        <>
          <button
            onClick={sync}
            disabled={status === 'syncing'}
            className="font-medium text-ink-2 hover:text-accent disabled:opacity-50"
          >
            Sincronizar agora
          </button>
          <button onClick={disconnect} className="font-medium text-ink-2 hover:text-[#e66767]">
            Desconectar
          </button>
        </>
      ) : (
        <button onClick={() => setOpen(true)} className="font-medium text-ink-2 hover:text-accent">
          Conectar
        </button>
      )}

      <Modal open={open} onClose={() => setOpen(false)} title="Conectar a sincronização">
        <div className="space-y-5">
          <p className="text-sm text-ink-2">
            Cole o código de sincronização. Ele fica guardado só neste aparelho e é o que
            autoriza este celular a ler e gravar os seus treinos.
          </p>
          <Field
            label="Código"
            hint="É o valor de SYNC_TOKEN que você configurou na Vercel."
          >
            <Input
              type="password"
              value={draft}
              autoComplete="off"
              placeholder="cole aqui"
              onChange={(e) => setDraft(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && connect()}
            />
          </Field>
          <div className="flex justify-end gap-2">
            <Button variant="quiet" onClick={() => setOpen(false)}>
              Cancelar
            </Button>
            <Button onClick={connect} disabled={!draft.trim()}>
              Conectar
            </Button>
          </div>
        </div>
      </Modal>
    </div>
  )
}
