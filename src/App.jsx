import { useRef, useState } from 'react'
import Dashboard from './components/Dashboard'
import Jumps from './components/Jumps'
import Library from './components/Library'
import Workouts from './components/Workouts'
import { useStore } from './lib/storage'
import { toISO } from './lib/dates'

const TABS = [
  { id: 'visao', label: 'Visão geral' },
  { id: 'treinos', label: 'Treinos' },
  { id: 'impulsao', label: 'Impulsão' },
  { id: 'biblioteca', label: 'Biblioteca' },
]

function Logo() {
  return (
    <div className="flex items-center gap-2">
      <svg viewBox="0 0 24 24" className="size-6" aria-hidden="true">
        <path
          d="M12 3l6 7h-4v11h-4V10H6l6-7z"
          fill="var(--color-accent)"
        />
      </svg>
      <span className="text-lg font-bold tracking-tight">Jump</span>
    </div>
  )
}

function DataTools({ store }) {
  const fileRef = useRef(null)

  const exportJson = () => {
    const blob = new Blob([JSON.stringify({ workouts: store.workouts, jumps: store.jumps, reach: store.reach }, null, 2)], {
      type: 'application/json',
    })
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
        const data = JSON.parse(String(reader.result))
        store.importAll({
          workouts: Array.isArray(data.workouts) ? data.workouts : [],
          jumps: Array.isArray(data.jumps) ? data.jumps : [],
          reach: typeof data.reach === 'number' ? data.reach : null,
        })
      } catch {
        alert('Não consegui ler esse arquivo — ele precisa ser um backup exportado pelo Jump.')
      }
    }
    reader.readAsText(file)
    e.target.value = ''
  }

  const clear = () => {
    if (confirm('Apagar todos os treinos e medições deste navegador? Não dá pra desfazer.')) {
      store.clearAll()
    }
  }

  return (
    <div className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs text-ink-3">
      <span>Seus dados ficam só neste navegador.</span>
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

  return (
    <div className="min-h-screen">
      <header className="sticky top-0 z-40 border-b border-line bg-surface-0/85 backdrop-blur">
        <div className="mx-auto flex max-w-5xl items-center justify-between gap-6 px-4 py-3.5 sm:px-6">
          <Logo />
          <nav className="-mx-1 flex gap-1 overflow-x-auto">
            {TABS.map((t) => (
              <button
                key={t.id}
                onClick={() => setTab(t.id)}
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
        </div>
      </header>

      <main className="mx-auto max-w-5xl px-4 py-8 sm:px-6 sm:py-10">
        {tab === 'visao' && <Dashboard store={store} onNavigate={setTab} />}
        {tab === 'treinos' && <Workouts store={store} />}
        {tab === 'impulsao' && <Jumps store={store} />}
        {tab === 'biblioteca' && <Library />}
      </main>

      <footer className="mx-auto max-w-5xl px-4 pb-10 sm:px-6">
        <div className="border-t border-line pt-5">
          <DataTools store={store} />
        </div>
      </footer>
    </div>
  )
}
