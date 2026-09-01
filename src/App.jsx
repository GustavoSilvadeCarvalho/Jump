import { useRef, useState } from 'react'
import Calendar from './components/Calendar'
import Dashboard from './components/Dashboard'
import Jumps from './components/Jumps'
import Library from './components/Library'
import Plans from './components/Plans'
import Session from './components/Session'
import SyncPanel from './components/SyncPanel'
import Workouts from './components/Workouts'
import { useStore } from './lib/storage'
import { toISO, today } from './lib/dates'
import { countSets, sessionFromPlan } from './lib/session'

const icon = (d) => (
  <svg viewBox="0 0 24 24" className="size-6" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
    {d}
  </svg>
)

const TABS = [
  {
    id: 'visao',
    label: 'Hoje',
    icon: icon(
      <path d="M4 11l8-7 8 7v8a1 1 0 0 1-1 1h-4v-6h-6v6H5a1 1 0 0 1-1-1z" strokeLinejoin="round" />,
    ),
  },
  {
    id: 'calendario',
    label: 'Calendário',
    short: 'Agenda',
    icon: icon(
      <>
        <rect x="3.5" y="5.5" width="17" height="15" rx="2.5" />
        <path d="M3.5 10h17M8.5 3.5v4M15.5 3.5v4" strokeLinecap="round" />
      </>,
    ),
  },
  {
    id: 'fichas',
    label: 'Fichas',
    icon: icon(
      <>
        <path d="M6.5 4.5h11a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-11a1 1 0 0 1-1-1v-14a1 1 0 0 1 1-1z" />
        <path d="M9.5 9h5M9.5 13h5M9.5 17h3" strokeLinecap="round" />
      </>,
    ),
  },
  {
    id: 'treinos',
    label: 'Treinos',
    icon: icon(
      <path
        d="M3 12h2m14 0h2M7 8v8m10-8v8M7 12h10"
        strokeLinecap="round"
      />,
    ),
  },
  {
    id: 'impulsao',
    label: 'Impulsão',
    icon: icon(<path d="M12 20V5m0 0l-6 6m6-6l6 6" strokeLinecap="round" strokeLinejoin="round" />),
  },
  { id: 'biblioteca', label: 'Biblioteca', desktopOnly: true },
]

/** Treino aberto mas minimizado: fica acima das abas, esperando você voltar. */
function ResumeBar({ session, onOpen }) {
  const { done, total } = countSets(session)
  return (
    <button
      onClick={onOpen}
      className="flex w-full items-center gap-3 border-t border-accent/40 bg-accent-soft px-4 py-3 text-left sm:px-6"
    >
      <span className="size-2 shrink-0 animate-pulse rounded-full bg-accent" aria-hidden="true" />
      <span className="min-w-0 flex-1 truncate text-sm font-medium text-ink">
        {session.name} em andamento
      </span>
      <span className="tnum shrink-0 text-xs text-accent">{done}/{total} séries</span>
      <span className="shrink-0 text-xs font-semibold text-accent">retomar</span>
    </button>
  )
}

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <path d="M12 3l6 7h-4v11h-4V10H6l6-7z" fill="var(--color-accent)" />
      </svg>
      <span className="text-lg font-bold tracking-tight">Jump</span>
    </div>
  )
}

function DataTools({ store }) {
  const fileRef = useRef(null)

  const exportJson = () => {
    const blob = new Blob(
      [
        JSON.stringify(
          { workouts: store.workouts, plans: store.plans, jumps: store.jumps, reach: store.reach },
          null,
          2,
        ),
      ],
      { type: 'application/json' },
    )
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'jump-' + toISO(new Date()) + '.json'
    a.click()
    URL.revokeObjectURL(url)
  }

  const importJson = (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    const reader = new FileReader()
    reader.onload = () => {
      try {
        store.importAll(JSON.parse(String(reader.result)))
      } catch {
        alert('Não consegui ler esse arquivo — ele precisa ser um backup exportado pelo Jump.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const clear = () => {
    const aviso =
      'Apagar todos os treinos, fichas e medições? Não dá pra desfazer' +
      (store.syncedAt ? ' — e, como a sincronização está ligada, some dos outros aparelhos também.' : '.')
    if (confirm(aviso)) {
      store.clearAll()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
      <span>Seus dados ficam só neste aparelho.</span>
      <button onClick={exportJson} className="font-medium text-ink-2 hover:text-accent">
        Exportar backup
      </button>
      <button onClick={() => fileRef.current?.click()} className="font-medium text-ink-2 hover:text-accent">
        Importar
      </button>
      <button onClick={clear} className="font-medium text-ink-2 hover:text-[#e66767]">
        Apagar tudo
      </button>
      <input ref={fileRef} type="file" accept="application/json" onChange={importJson} className="hidden" />
    </div>
  )
}

export default function App() {
  const store = useStore()
  const [tab, setTab] = useState('visao')
  const [day, setDay] = useState(today())
  // Aberto = tela cheia do treino. Fechado com treino em andamento = barra de retomar.
  const [training, setTraining] = useState(false)

  const startTraining = (plan) => {
    if (store.session && store.session.planId !== plan.id) {
      if (!confirm('Já tem um treino em andamento. Descartar ele e começar "' + plan.name + '"?')) return
    } else if (store.session) {
      return setTraining(true)
    }
    store.startSession(sessionFromPlan(plan))
    setTraining(true)
  }

  /** Navegar pro calendário já num dia específico (semana da home, treino recente…). */
  const go = (id, iso) => {
    if (iso) setDay(iso)
    setTab(id)
    window.scrollTo({ top: 0 })
  }

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface-0/85 pt-[env(safe-area-inset-top)] backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3 sm:px-6 sm:py-3.5">
          <Logo />
          <nav className="-mx-1 hidden gap-1 sm:flex">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={tab === t.id ? 'page' : undefined}
                className={
                  'shrink-0 rounded-lg px-3 py-1.5 text-sm font-medium transition ' +
                  (tab === t.id ? 'bg-surface-2 text-ink' : 'text-ink-3 hover:text-ink')
                }
              >
                {t.label}
              </button>
            ))}
          </nav>
          <button
            onClick={() => go('biblioteca')}
            aria-label="Biblioteca de exercícios"
            className={
              'rounded-lg p-2 transition sm:hidden ' +
              (tab === 'biblioteca' ? 'bg-surface-2 text-ink' : 'text-ink-3')
            }
          >
            <svg viewBox="0 0 24 24" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path
                d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10v16H5.5A1.5 1.5 0 0 1 4 18.5zM14 4h4.5A1.5 1.5 0 0 1 20 5.5v13a1.5 1.5 0 0 1-1.5 1.5H14z"
                strokeLinejoin="round"
              />
            </svg>
          </button>
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-6 pb-8 sm:px-6 sm:py-10">
        {tab === 'visao' && <Dashboard store={store} onNavigate={go} onStart={startTraining} />}
        {tab === 'calendario' && <Calendar store={store} initialDate={day} onStart={startTraining} />}
        {tab === 'fichas' && <Plans store={store} onNavigate={go} onStart={startTraining} />}
        {tab === 'treinos' && <Workouts store={store} onNavigate={go} />}
        {tab === 'impulsao' && <Jumps store={store} />}
        {tab === 'biblioteca' && <Library />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-8 sm:px-6 sm:pb-10">
        <div className="space-y-3 border-t border-line pt-5">
          <SyncPanel store={store} />
          <DataTools store={store} />
        </div>
      </footer>

      {/* Espaço pra barra fixa não cobrir o fim da página */}
      <div
        className={(store.session && !training ? 'h-36 sm:h-16' : 'h-20 sm:h-0') + ' transition-all'}
        aria-hidden="true"
      />

      <div className="fixed inset-x-0 bottom-0 z-40">
        {store.session && !training && <ResumeBar session={store.session} onOpen={() => setTraining(true)} />}

        <nav className="border-t border-line bg-surface-0/95 pb-[env(safe-area-inset-bottom)] backdrop-blur sm:hidden">
        <div className="flex">
          {TABS.filter((t) => !t.desktopOnly).map((t) => {
            const active = tab === t.id
            return (
              <button
                key={t.id}
                onClick={() => go(t.id)}
                aria-current={active ? 'page' : undefined}
                className={
                  'flex flex-1 flex-col items-center gap-0.5 py-2.5 text-[10px] font-medium transition ' +
                  (active ? 'text-accent' : 'text-ink-3')
                }
              >
                {t.icon}
                {t.short ?? t.label}
              </button>
            )
          })}
        </div>
        </nav>
      </div>

      {store.session && training && <Session store={store} onClose={() => setTraining(false)} />}
    </div>
  )
}
