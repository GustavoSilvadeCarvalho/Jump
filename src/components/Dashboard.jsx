import { CATEGORIES, CATEGORY_KEYS, JUMP_KINDS } from '../lib/data'
import { relative } from '../lib/dates'
import {
  inLastDays,
  personalRecord,
  progress,
  sortByDate,
  streak,
  totalMinutes,
  volumeByCategory,
} from '../lib/stats'
import JumpChart from './JumpChart'
import { Badge, Button, Card, EmptyState, SectionTitle, Stat } from './ui'

function VolumeBars({ workouts }) {
  const volume = volumeByCategory(workouts, 30)
  const max = Math.max(...CATEGORY_KEYS.map((k) => volume[k]), 1)
  const total = CATEGORY_KEYS.reduce((sum, k) => sum + volume[k], 0)

  if (total === 0) {
    return <p className="text-sm text-ink-3">Nenhum treino nos últimos 30 dias.</p>
  }

  return (
    <div className="space-y-3">
      {CATEGORY_KEYS.map((key) => {
        const cat = CATEGORIES[key]
        const value = volume[key]
        return (
          <div key={key} className="flex items-center gap-3">
            <span className="w-24 shrink-0 text-xs text-ink-2">{cat.label}</span>
            <div className="h-2.5 flex-1 overflow-hidden rounded-full bg-surface-2">
              <div
                className="h-full rounded-full"
                style={{ width: Math.max((value / max) * 100, value ? 4 : 0) + '%', background: cat.color }}
              />
            </div>
            <span className="tnum w-6 shrink-0 text-right text-xs text-ink-2">{value}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function Dashboard({ store, onNavigate }) {
  const { workouts, jumps } = store
  const pr = personalRecord(jumps)
  const prog = progress(jumps)
  const dias = streak(workouts)
  const last30 = inLastDays(workouts, 30).length
  const recent = sortByDate(workouts).reverse().slice(0, 4)
  const mainKind = prog?.kind ?? 'cmj'

  const isEmpty = workouts.length === 0 && jumps.length === 0

  if (isEmpty) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Bem-vindo ao Jump</h1>
          <p className="mt-1 text-sm text-ink-3">
            Registre seus treinos e meça sua impulsão. Tudo fica salvo neste navegador.
          </p>
        </div>
        <EmptyState
          title="Comece pelo primeiro registro"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => onNavigate('treinos')}>Registrar treino</Button>
              <Button variant="ghost" onClick={() => onNavigate('impulsao')}>
                Medir salto
              </Button>
            </div>
          }
        >
          Anote pliometria, força, alongamento e mobilidade — e acompanhe a curva do seu salto vertical
          ao longo do tempo.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Visão geral</h1>
        <p className="mt-1 text-sm text-ink-3">Onde você está agora.</p>
      </div>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <Stat
          label="Recorde"
          value={pr ? pr.height : '—'}
          unit={pr ? 'cm' : null}
          sub={pr ? JUMP_KINDS[pr.kind]?.label + ' · ' + relative(pr.date) : 'Sem medição'}
          tone="var(--color-accent)"
        />
        <Stat
          label="Ganho"
          value={prog ? (prog.delta > 0 ? '+' : '') + prog.delta : '—'}
          unit={prog ? 'cm' : null}
          sub={prog ? 'em ' + prog.days + ' dias · ' + JUMP_KINDS[prog.kind].label : 'Precisa de 2 medições'}
        />
        <Stat
          label="Sequência"
          value={dias}
          unit={dias === 1 ? 'dia' : 'dias'}
          sub={dias > 0 ? 'treinando seguido' : 'Treine hoje pra começar'}
        />
        <Stat label="Últimos 30 dias" value={last30} unit="treinos" sub="todas as categorias" />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <SectionTitle>Evolução — {JUMP_KINDS[mainKind].label} (cm)</SectionTitle>
          <JumpChart jumps={jumps} kind={mainKind} />
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-2">
          <SectionTitle>Volume por categoria — 30 dias</SectionTitle>
          <VolumeBars workouts={workouts} />
          <div className="mt-auto grid grid-cols-2 gap-4 border-t border-line pt-4">
            <div>
              <div className="tnum text-2xl leading-none font-semibold">{last30}</div>
              <div className="mt-1 text-xs text-ink-3">sessões</div>
            </div>
            <div>
              <div className="tnum text-2xl leading-none font-semibold">
                {totalMinutes(inLastDays(workouts, 30))}
              </div>
              <div className="mt-1 text-xs text-ink-3">minutos treinados</div>
            </div>
          </div>
        </Card>
      </div>

      <div>
        <SectionTitle
          action={
            <button
              onClick={() => onNavigate('treinos')}
              className="text-xs font-medium text-accent hover:underline"
            >
              ver todos
            </button>
          }
        >
          Treinos recentes
        </SectionTitle>
        {recent.length === 0 ? (
          <Card className="px-5 py-8 text-center text-sm text-ink-3">Nenhum treino registrado.</Card>
        ) : (
          <Card className="divide-y divide-line">
            {recent.map((w) => (
              <div key={w.id} className="flex flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5">
                <Badge color={CATEGORIES[w.type].color}>{CATEGORIES[w.type].label}</Badge>
                <span className="text-sm text-ink">
                  {w.items.length} exercício{w.items.length > 1 ? 's' : ''}
                </span>
                <span className="flex-1 truncate text-xs text-ink-3">
                  {w.items.map((i) => i.name).join(', ')}
                </span>
                <span className="text-xs text-ink-3">{relative(w.date)}</span>
              </div>
            ))}
          </Card>
        )}
      </div>
    </div>
  )
}
