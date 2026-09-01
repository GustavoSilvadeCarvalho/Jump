import { useEffect, useRef, useState } from 'react'
import { CATEGORIES } from '../lib/data'
import { restLabel } from '../lib/items'
import { clock, countSets, currentIndex, elapsedLabel, elapsedMinutes, sessionToWorkout } from '../lib/session'
import { Badge, Button, Card, Field, Input, Modal, Textarea } from './ui'

// O treino acontecendo. O cronômetro guarda a hora de término, não os segundos
// restantes: bloquear a tela ou trocar de app não atrasa a contagem.

/** Cronômetro que termina daqui a N segundos. */
function timerDe(segundos, kind, itemIndex) {
  const s = Number(segundos)
  if (!s) return null
  return { endsAt: Date.now() + s * 1000, total: s, kind, itemIndex }
}

function ajustado(timer, delta) {
  return {
    ...timer,
    endsAt: Math.max(Date.now(), timer.endsAt + delta * 1000),
    total: Math.max(1, timer.total + delta),
  }
}

/** Apito + vibração no fim da contagem. */
function useAlarm() {
  const ctxRef = useRef(null)

  // Áudio criado fora de um toque seu nasce mudo no iOS — daí o unlock ao marcar.
  const unlock = () => {
    try {
      const Ctx = window.AudioContext || window.webkitAudioContext
      if (!Ctx) return
      if (!ctxRef.current) ctxRef.current = new Ctx()
      if (ctxRef.current.state === 'suspended') ctxRef.current.resume()
    } catch {
      // Sem áudio: a vibração e a tela ainda avisam.
    }
  }

  const fire = () => {
    try {
      navigator.vibrate?.([180, 90, 180])
    } catch {
      // O iOS não vibra.
    }
    const ctx = ctxRef.current
    if (!ctx || ctx.state !== 'running') return
    try {
      const beep = (atraso, freq) => {
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()
        const t = ctx.currentTime + atraso
        osc.type = 'sine'
        osc.frequency.value = freq
        gain.gain.setValueAtTime(0.0001, t)
        gain.gain.exponentialRampToValueAtTime(0.3, t + 0.02)
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.22)
        osc.connect(gain)
        gain.connect(ctx.destination)
        osc.start(t)
        osc.stop(t + 0.24)
      }
      beep(0, 880)
      beep(0.28, 880)
      beep(0.56, 1318)
    } catch {
      // Falhar o apito não pode derrubar o treino.
    }
  }

  return { unlock, fire }
}

/** Mantém a tela acesa, onde o navegador deixa. */
function useKeepAwake() {
  useEffect(() => {
    let lock = null
    let vivo = true
    const pedir = async () => {
      try {
        lock = (await navigator.wakeLock?.request('screen')) ?? null
      } catch {
        // Negado ou sem suporte: a tela só apaga sozinha.
      }
    }
    pedir()
    // O bloqueio cai sozinho quando o app vai pro fundo; refaz na volta.
    const onVisivel = () => {
      if (vivo && document.visibilityState === 'visible') pedir()
    }
    document.addEventListener('visibilitychange', onVisivel)
    return () => {
      vivo = false
      document.removeEventListener('visibilitychange', onVisivel)
      lock?.release?.().catch(() => {})
    }
  }, [])
}

function SetDots({ item, onToggle }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {item.done.map((feito, i) => (
        <button
          key={i}
          onClick={() => onToggle(i)}
          aria-label={'Série ' + (i + 1) + (feito ? ' — feita' : ' — pendente')}
          aria-pressed={feito}
          className={
            'grid size-9 place-items-center rounded-lg border text-xs font-semibold transition ' +
            (feito
              ? 'border-accent bg-accent text-surface-0'
              : 'border-line bg-surface-2 text-ink-3 hover:border-ink-3')
          }
        >
          {i + 1}
        </button>
      ))}
    </div>
  )
}

function ExerciseCard({ item, index, atual, onMarcar, onToggle, onCarga, onMaisSerie, onCronometrar }) {
  const feitas = item.done.filter(Boolean).length
  const completo = feitas === item.done.length
  const seg = item.unit === 'seg'
  const alvo = [item.reps ? (seg ? item.reps + 's' : item.reps + ' reps') : null, item.load ? item.load + ' kg' : null]
    .filter(Boolean)
    .join(' · ')

  return (
    <Card
      className={'p-4 transition ' + (completo ? 'opacity-60' : '')}
      style={atual && !completo ? { borderColor: 'var(--color-accent)' } : undefined}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className={'font-semibold ' + (completo ? 'text-ink-3 line-through' : 'text-ink')}>
            {index + 1}. {item.name}
          </h3>
          <p className="mt-0.5 text-xs text-ink-3">
            {item.done.length} série{item.done.length > 1 ? 's' : ''}
            {alvo ? ' · ' + alvo : ''}
            {item.rest ? ' · ' + restLabel(item.rest) + ' desc' : ''}
          </p>
        </div>
        {completo && <span className="shrink-0 text-xs font-semibold text-accent">✓</span>}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <SetDots item={item} onToggle={onToggle} />
        <button
          onClick={onMaisSerie}
          aria-label="Adicionar série"
          className="grid size-9 place-items-center rounded-lg border border-dashed border-line text-ink-3 transition hover:border-ink-3 hover:text-ink"
        >
          +
        </button>
      </div>

      <div className="mt-3 flex items-center gap-2">
        <label className="flex items-center gap-2 text-xs text-ink-3">
          carga
          <Input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="0"
            className="w-20 px-2 text-center"
            placeholder="kg"
            value={item.load ?? ''}
            onChange={(e) => onCarga(e.target.value === '' ? null : Number(e.target.value))}
          />
        </label>

        {seg && item.reps ? (
          <Button className="ml-auto" onClick={onCronometrar} disabled={completo}>
            Iniciar {item.reps}s
          </Button>
        ) : (
          <Button className="ml-auto" onClick={onMarcar} disabled={completo}>
            Série feita
          </Button>
        )}
      </div>
    </Card>
  )
}

function TimerBar({ timer, restante, onAjustar, onPular }) {
  const serie = timer.kind === 'serie'
  const acabou = restante <= 0
  const cor = acabou ? 'var(--color-accent)' : serie ? 'var(--color-cat-plio)' : 'var(--color-cat-mob)'
  const progresso = Math.min(100, Math.max(0, (1 - restante / timer.total) * 100))

  return (
    <div className="border-t border-line bg-surface-1 pb-[env(safe-area-inset-bottom)]">
      <div className="h-1 bg-surface-2">
        <div className="h-full transition-all" style={{ width: progresso + '%', background: cor }} />
      </div>
      <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
        <div className="min-w-0">
          <div className="text-[10px] font-medium tracking-wide text-ink-3 uppercase">
            {acabou ? (serie ? 'série concluída' : 'descanso acabou') : serie ? 'série' : 'descanso'}
          </div>
          <div className="tnum text-2xl leading-none font-semibold" style={{ color: cor }}>
            {clock(restante)}
          </div>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {!acabou && (
            <>
              <button
                onClick={() => onAjustar(-15)}
                className="rounded-lg border border-line px-2.5 py-2 text-xs font-medium text-ink-2 transition hover:border-ink-3"
              >
                −15s
              </button>
              <button
                onClick={() => onAjustar(15)}
                className="rounded-lg border border-line px-2.5 py-2 text-xs font-medium text-ink-2 transition hover:border-ink-3"
              >
                +15s
              </button>
            </>
          )}
          <Button variant="ghost" className="px-3 py-2 text-xs" onClick={onPular}>
            {acabou ? 'Fechar' : serie ? 'Concluir' : 'Pular'}
          </Button>
        </div>
      </div>
    </div>
  )
}

function FinishSheet({ open, session, onClose, onSave }) {
  const [rpe, setRpe] = useState(7)
  const [notes, setNotes] = useState('')
  const { done, total } = countSets(session)

  return (
    <Modal open={open} onClose={onClose} title="Finalizar treino">
      <div className="space-y-5">
        <div className="grid grid-cols-3 gap-3 text-center">
          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="tnum text-2xl leading-none font-semibold">{done}</div>
            <div className="mt-1 text-xs text-ink-3">de {total} séries</div>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="tnum text-2xl leading-none font-semibold">
              {session.items.filter((i) => i.done.some(Boolean)).length}
            </div>
            <div className="mt-1 text-xs text-ink-3">exercícios</div>
          </div>
          <div className="rounded-xl border border-line bg-surface-2/50 p-3">
            <div className="tnum text-2xl leading-none font-semibold">{elapsedMinutes(session)}</div>
            <div className="mt-1 text-xs text-ink-3">minutos</div>
          </div>
        </div>

        <Field label={'Esforço percebido: ' + rpe + '/10'} hint="1 é leve, 10 é o máximo que você aguenta">
          <input
            type="range"
            min="1"
            max="10"
            value={rpe}
            onChange={(e) => setRpe(e.target.value)}
            className="w-full accent-accent"
          />
        </Field>

        <Field label="Notas">
          <Textarea
            rows={2}
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            placeholder="Joelho incomodou no terceiro set"
          />
        </Field>

        <div className="flex justify-end gap-2">
          <Button variant="quiet" onClick={onClose}>
            Voltar
          </Button>
          <Button className="flex-1 sm:flex-none" onClick={() => onSave({ rpe, notes })} disabled={done === 0}>
            Salvar treino
          </Button>
        </div>
      </div>
    </Modal>
  )
}

export default function Session({ store, onClose }) {
  const { session, toggleSet, patchSession, patchSessionItem, addWorkout, endSession } = store
  const [agora, setAgora] = useState(() => Date.now())
  const [finishing, setFinishing] = useState(false)
  const alarme = useAlarm()
  const disparado = useRef(null)

  useKeepAwake()

  useEffect(() => {
    const id = setInterval(() => setAgora(Date.now()), 500)
    return () => clearInterval(id)
  }, [])

  const timer = session?.rest ?? null
  const restante = timer ? Math.ceil((timer.endsAt - agora) / 1000) : 0

  // Zerou: apita uma vez. Série cronometrada ainda marca a série e emenda o descanso.
  useEffect(() => {
    if (!timer || restante > 0 || disparado.current === timer.endsAt) return
    disparado.current = timer.endsAt
    alarme.fire()
    if (timer.kind === 'serie') {
      const item = session.items[timer.itemIndex]
      const proxima = item?.done.findIndex((d) => !d) ?? -1
      if (proxima !== -1) toggleSet(timer.itemIndex, proxima)
      patchSession({ rest: timerDe(item?.rest, 'descanso', timer.itemIndex) })
    }
  }, [timer, restante, session, alarme, toggleSet, patchSession])

  if (!session) return null

  const { done, total } = countSets(session)
  const atual = currentIndex(session)
  const cat = CATEGORIES[session.type]

  const iniciarDescanso = (segundos, itemIndex) => {
    const t = timerDe(segundos, 'descanso', itemIndex)
    if (t) patchSession({ rest: t })
  }

  const marcarProxima = (i) => {
    alarme.unlock()
    const item = session.items[i]
    const proxima = item.done.findIndex((d) => !d)
    if (proxima === -1) return
    toggleSet(i, proxima)
    if (item.rest) iniciarDescanso(item.rest, i)
  }

  const cronometrarSerie = (i) => {
    alarme.unlock()
    const t = timerDe(session.items[i].reps, 'serie', i)
    if (!t) return marcarProxima(i)
    patchSession({ rest: t })
  }

  const ajustar = (delta) => patchSession({ rest: ajustado(timer, delta) })

  const pular = () => {
    // Concluir a série cronometrada na mão: mesmo caminho de quando ela zera.
    if (timer.kind === 'serie' && restante > 0) {
      disparado.current = timer.endsAt
      const item = session.items[timer.itemIndex]
      const proxima = item?.done.findIndex((d) => !d) ?? -1
      if (proxima !== -1) toggleSet(timer.itemIndex, proxima)
      if (item?.rest) return iniciarDescanso(item.rest, timer.itemIndex)
    }
    patchSession({ rest: null })
  }

  const salvar = ({ rpe, notes }) => {
    addWorkout(sessionToWorkout(session, { rpe, notes }))
    endSession()
    setFinishing(false)
    onClose()
  }

  const cancelar = () => {
    if (done > 0 && !confirm('Descartar este treino? As séries marcadas se perdem.')) return
    endSession()
    onClose()
  }

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-surface-0">
      <header className="border-b border-line bg-surface-0/95 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center gap-3 px-4 py-3 sm:px-6">
          <button
            onClick={onClose}
            aria-label="Minimizar treino"
            className="-ml-2 rounded-lg p-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.8">
              <path d="M5 8l5 5 5-5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <div className="min-w-0 flex-1">
            <h1 className="truncate font-semibold">{session.name}</h1>
            <p className="tnum text-xs text-ink-3">
              {elapsedLabel(session, agora)} · {done}/{total} séries
            </p>
          </div>
          <Badge color={cat.color}>{cat.label}</Badge>
          <button
            onClick={cancelar}
            aria-label="Cancelar treino"
            className="rounded-lg p-2 text-ink-3 transition hover:bg-surface-2 hover:text-[#e66767]"
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="h-1 bg-surface-2">
          <div
            className="h-full bg-accent transition-all"
            style={{ width: (total ? (done / total) * 100 : 0) + '%' }}
          />
        </div>
      </header>

      <div className="flex-1 overflow-y-auto">
        <div className="mx-auto max-w-5xl space-y-3 px-4 py-4 sm:px-6">
          {session.items.map((item, i) => (
            <ExerciseCard
              key={i}
              item={item}
              index={i}
              atual={i === atual}
              onMarcar={() => marcarProxima(i)}
              onToggle={(setIndex) => {
                alarme.unlock()
                toggleSet(i, setIndex)
              }}
              onCarga={(load) => patchSessionItem(i, { load })}
              onMaisSerie={() => patchSessionItem(i, { done: [...item.done, false] })}
              onCronometrar={() => cronometrarSerie(i)}
            />
          ))}

          <Button className="w-full" onClick={() => setFinishing(true)} disabled={done === 0}>
            Finalizar treino
          </Button>
          {done === 0 && (
            <p className="pb-2 text-center text-xs text-ink-3">Marque ao menos uma série pra salvar.</p>
          )}
        </div>
      </div>

      {timer && (
        <TimerBar timer={timer} restante={restante} onAjustar={ajustar} onPular={pular} />
      )}

      <FinishSheet
        open={finishing}
        session={session}
        onClose={() => setFinishing(false)}
        onSave={salvar}
      />
    </div>
  )
}
