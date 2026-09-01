import { useState } from 'react'
import { login, signup } from '../lib/auth'
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
  if (err?.status === 401) return 'Sua sessão expirou — entre de novo.'
  if (err?.status === 404) return 'Sync indisponível aqui — ele só existe no site publicado.'
  if (err?.message === 'Failed to fetch') return 'Sem conexão — as mudanças ficam guardadas.'
  return err?.message ?? 'Falhou.'
}

/** O aviso que faltava: enquanto não há conta, deixa claro que nada sai daqui. */
export function AccountBanner({ account }) {
  if (account.user) return null
  return (
    <div className="border-b border-line bg-surface-1">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center gap-x-3 gap-y-2 px-4 py-2.5 sm:px-6">
        <span className="size-1.5 shrink-0 rounded-full bg-[var(--color-cat-mob)]" aria-hidden="true" />
        <span className="min-w-0 flex-1 text-xs text-ink-2">
          Seus treinos estão salvos <strong className="font-semibold text-ink">só neste aparelho</strong>.
          Entre na sua conta pra sincronizar.
        </span>
        <Button className="px-3 py-1.5 text-xs" onClick={() => account.setModal(true)}>
          Entrar
        </Button>
      </div>
    </div>
  )
}

export function AccountFooter({ account }) {
  const { user, status, error, pending, syncedAt } = account

  const cor =
    status === 'error'
      ? '#e66767'
      : status === 'syncing'
        ? 'var(--color-ink-3)'
        : pending > 0
          ? 'var(--color-cat-mob)'
          : user
            ? 'var(--color-accent)'
            : 'var(--color-ink-3)'

  const texto = !user
    ? 'Sem conta neste aparelho — nada sai daqui.'
    : status === 'syncing'
      ? 'Sincronizando…'
      : status === 'error'
        ? friendlyError(error)
        : pending > 0
          ? pending + (pending === 1 ? ' mudança pendente' : ' mudanças pendentes')
          : syncedAt
            ? 'Tudo sincronizado · ' + agoLabel(syncedAt)
            : 'Conectado'

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span className="flex items-center gap-2 text-ink-3">
        <span className="size-1.5 shrink-0 rounded-full" style={{ background: cor }} aria-hidden="true" />
        {user && <strong className="font-semibold text-ink-2">{user.username}</strong>}
        {texto}
      </span>

      {user ? (
        <>
          <button
            onClick={account.sync}
            disabled={status === 'syncing'}
            className="font-medium text-ink-2 hover:text-accent disabled:opacity-50"
          >
            Sincronizar agora
          </button>
          <button onClick={account.sair} className="font-medium text-ink-2 hover:text-[#e66767]">
            Sair
          </button>
        </>
      ) : (
        <button onClick={() => account.setModal(true)} className="font-medium text-ink-2 hover:text-accent">
          Entrar
        </button>
      )}
    </div>
  )
}

export function AccountModal({ account }) {
  const [modo, setModo] = useState('entrar')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [invite, setInvite] = useState('')
  const [erro, setErro] = useState(null)
  const [enviando, setEnviando] = useState(false)

  const criar = modo === 'criar'
  const valido = username.trim().length >= 3 && password.length >= 8 && (!criar || invite.trim())

  const enviar = async (e) => {
    e.preventDefault()
    if (!valido || enviando) return
    setEnviando(true)
    setErro(null)
    try {
      const user = criar
        ? await signup(username.trim(), password, invite.trim())
        : await login(username.trim(), password)
      account.setUser(user)
      account.setModal(false)
      setPassword('')
      setInvite('')
    } catch (err) {
      setErro(err.message)
    } finally {
      setEnviando(false)
    }
  }

  return (
    <Modal
      open={account.modal}
      onClose={() => account.setModal(false)}
      title={criar ? 'Criar conta' : 'Entrar'}
    >
      <form onSubmit={enviar} className="space-y-5">
        <div className="flex gap-1 rounded-xl border border-line bg-surface-2 p-1">
          {[
            ['entrar', 'Entrar'],
            ['criar', 'Criar conta'],
          ].map(([id, label]) => (
            <button
              key={id}
              type="button"
              onClick={() => {
                setModo(id)
                setErro(null)
              }}
              className={
                'flex-1 rounded-lg py-2 text-sm font-medium transition ' +
                (modo === id ? 'bg-surface-1 text-ink' : 'text-ink-3 hover:text-ink')
              }
            >
              {label}
            </button>
          ))}
        </div>

        <Field label="Usuário">
          <Input
            value={username}
            autoComplete="username"
            autoCapitalize="none"
            spellCheck="false"
            placeholder="gustavo"
            onChange={(e) => setUsername(e.target.value)}
          />
        </Field>

        <Field label="Senha" hint={criar ? 'Mínimo de 8 caracteres.' : null}>
          <Input
            type="password"
            value={password}
            autoComplete={criar ? 'new-password' : 'current-password'}
            onChange={(e) => setPassword(e.target.value)}
          />
        </Field>

        {criar && (
          <Field label="Convite" hint="É o SYNC_TOKEN que está nas variáveis da Vercel.">
            <Input
              type="password"
              value={invite}
              autoComplete="off"
              placeholder="cole aqui"
              onChange={(e) => setInvite(e.target.value)}
            />
          </Field>
        )}

        {erro && <p className="text-sm text-[#e66767]">{erro}</p>}

        <p className="text-xs text-ink-3">
          Os treinos que já estão neste aparelho sobem pra conta no primeiro sync — nada se perde.
        </p>

        <div className="flex justify-end gap-2">
          <Button type="button" variant="quiet" onClick={() => account.setModal(false)}>
            Cancelar
          </Button>
          <Button type="submit" className="flex-1 sm:flex-none" disabled={!valido || enviando}>
            {enviando ? 'Um instante…' : criar ? 'Criar conta' : 'Entrar'}
          </Button>
        </div>
      </form>
    </Modal>
  )
}
