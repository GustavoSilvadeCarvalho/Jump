import { useState } from 'react'
import { CATEGORIES, CATEGORY_KEYS, JUMP_KINDS } from '../lib/data'
import { WEEKDAYS, dayMonth, longDate, relative, today, weekday } from '../lib/dates'
import { nextSession, planToDraft, totalSets, weekSummary } from '../lib/schedule'
import {
  inLastDays,
  personalRecord,
  progress,
  sortByDate,
  streak,
  totalMinutes,
  volumeByCategory,
} from '../lib/stats'
import ExerciseList from './ExerciseList'
import JumpChart from './JumpChart'
import WorkoutForm from './WorkoutForm'
import { Badge, Button, Card, EmptyState, Modal, SectionTitle, Stat } from './ui'

/** O treino de hoje, pronto pra registrar. */
function TodayCard({ plan, onLog }) {
  const cat = CATEGORIES[plan.type]
  return (
    <Card className="p-5" style={{ borderColor: 'color-mix(in oklab, ' + cat.color + ' 30%, transparent)' }}>
      <div className="flex flex-wrap items-center gap-2">
        <Badge color={cat.color}>{cat.label}</Badge>
        <h3 className="font-semibold text-ink">{plan.name}</h3>
      </div>
      <ExerciseList items={plan.items} type={plan.type} max={4} className="mt-4" />
      {plan.notes && <p className="mt-3 text-xs text-ink-2">{plan.notes}</p>}
      <div className="mt-4 flex items-center gap-3 border-t border-line pt-4">
        <span className="tnum shrink-0 text-xs text-ink-3">
          {plan.items.length} ex · {totalSets(plan)} séries
        </span>
        <Button className="ml-auto w-full sm:w-auto" onClick={onLog}>
          Registrar treino
        </Button>
      </div>
    </Card>
  )
}

/** O que já foi feito hoje. */
function DoneCard({ workout }) {
  const cat = CATEGORIES[workout.type]
  return (
    <Card className="p-5">
      <div className="flex flex-wrap items-center gap-2">
        <span className="text-sm font-semibold text-accent">✓ feito</span>
        <Badge color={cat.color}>{cat.label}</Badge>
        {workout.duration ? <span className="tnum text-xs text-ink-3">{workout.duration} min</span> : null}
        {workout.rpe ? <span className="tnum text-xs text-ink-3">RPE {workout.rpe}</span> : null}
      </div>
      <ExerciseList items={workout.items} type={workout.type} max={4} className="mt-4" />
    </Card>
  )
}

/** Domingo a sábado: bolinha cheia no que saiu, vazada no que a ficha marcou. */
function WeekStrip({ week, onPick }) {
  const t = today()
  return (
    <Card className="p-4">
      <div className="flex items-baseline justify-between gap-3 px-1">
        <span className="text-xs font-medium text-ink-2">Esta semana</span>
        <span className="tnum text-xs text-ink-3">
          {week.completed} de {week.planned} previstos
        </span>
      </div>

      {week.planned > 0 && (
        <div className="mx-1 mt-2 h-1.5 overflow-hidden rounded-full bg-surface-2">
          <div
            className="h-full rounded-full bg-accent transition-all"
            style={{ width: Math.round((week.completed / week.planned) * 100) + '%' }}
          />
        </div>
      )}

      <div className="mt-3 grid grid-cols-7 gap-1">
        {week.days.map((day) => {
          const isToday = day.iso === t
          const pending = day.planned.filter((p) => !p.done)
          const marks = [
            ...day.done.map((w) => ({ key: w.id, color: CATEGORIES[w.type].color, filled: true })),
            ...pending.map((p) => ({ key: p.plan.id, color: CATEGORIES[p.plan.type].color, filled: false })),
          ].slice(0, 3)

          return (
            <button
              key={day.iso}
              onClick={() => onPick(day.iso)}
              aria-label={longDate(day.iso)}
              className={
                'flex flex-col items-center gap-1.5 rounded-xl py-2 transition ' +
                (isToday ? 'bg-surface-2' : 'hover:bg-surface-2')
              }
            >
              <span className="text-[10px] font-medium tracking-wide text-ink-3 uppercase">
                {WEEKDAYS[weekday(day.iso)].short}
              </span>
              <span
                className={
                  'tnum grid size-8 place-items-center rounded-full text-sm font-medium ' +
                  (isToday ? 'bg-accent font-bold text-surface-0' : 'text-ink-2')
                }
              >
                {Number(day.iso.slice(8))}
              </span>
              <span className="flex h-1.5 items-center gap-0.5">
                {marks.map((m) => (
                  <span
                    key={m.key}
                    className="size-1.5 rounded-full border"
                    style={{
                      borderColor: m.color,
                      background: m.filled ? m.color : 'transparent',
                      opacity: m.filled || day.iso >= t ? 1 : 0.4,
                    }}
                  />
                ))}
              </span>
            </button>
          )
        })}
      </div>
    </Card>
  )
}

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
  const { workouts, jumps, plans, addWorkout } = store
  const [draft, setDraft] = useState(null)

  const t = today()
  const week = weekSummary(plans, workouts, t)
  const hoje = week.days[weekday(t)]
  const pendingToday = hoje.planned.filter((p) => !p.done)
  const next = nextSession(plans, workouts, t)
  const nextOtherDay = next && next.iso !== t ? next : null

  const pr = personalRecord(jumps)
  const prog = progress(jumps)
  const dias = streak(workouts)
  const last30 = inLastDays(workouts, 30).length
  const recent = sortByDate(workouts).reverse().slice(0, 3)
  const mainKind = prog?.kind ?? 'cmj'

  if (workouts.length === 0 && jumps.length === 0 && plans.length === 0) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-semibold">Bem-vindo ao Jump</h1>
          <p className="mt-1 text-sm text-ink-3">
            Tudo fica salvo neste celular — sem conta, sem servidor.
          </p>
        </div>
        <EmptyState
          title="Comece pela ficha"
          action={
            <div className="flex flex-col gap-2 sm:flex-row sm:justify-center">
              <Button onClick={() => onNavigate('fichas')}>Montar uma ficha</Button>
              <Button variant="ghost" onClick={() => onNavigate('treinos')}>
                Registrar um treino
              </Button>
            </div>
          }
        >
          Monte os exercícios com carga e descanso, marque os dias da semana — e o app passa a te
          dizer o que treinar em cada dia.
        </EmptyState>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <p className="text-xs font-medium tracking-wide text-ink-3 uppercase">
          {WEEKDAYS[weekday(t)].label}, {dayMonth(t)}
        </p>
        <h1 className="mt-1 text-2xl font-semibold">
          {pendingToday.length > 0
            ? 'Hoje tem treino'
            : hoje.done.length > 0
              ? 'Treino do dia feito'
              : 'Dia livre'}
        </h1>
      </div>

      <div className="space-y-3">
        {hoje.done.map((w) => (
          <DoneCard key={w.id} workout={w} />
        ))}

        {pendingToday.map(({ plan }) => (
          <TodayCard key={plan.id} plan={plan} onLog={() => setDraft(planToDraft(plan, t))} />
        ))}

        {pendingToday.length === 0 && hoje.done.length === 0 && (
          <Card className="p-5">
            <p className="text-sm text-ink-2">
              {plans.length === 0
                ? 'Você ainda não tem fichas — monte uma pra saber o que treinar em cada dia.'
                : nextOtherDay
                  ? 'Nenhuma ficha marcada pra hoje. Descanso conta como treino.'
                  : 'Nenhuma ficha marcada pra hoje.'}
            </p>
            {nextOtherDay && (
              <button
                onClick={() => onNavigate('calendario', nextOtherDay.iso)}
                className="mt-4 flex w-full items-center gap-3 rounded-xl border border-line bg-surface-2/50 p-3 text-left transition hover:border-ink-3"
              >
                <span className="shrink-0 text-xs font-medium text-accent">{relative(nextOtherDay.iso)}</span>
                <Badge color={CATEGORIES[nextOtherDay.plan.type].color}>
                  {CATEGORIES[nextOtherDay.plan.type].label}
                </Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">{nextOtherDay.plan.name}</span>
                <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            )}
            <div className="mt-4 flex flex-col gap-2 sm:flex-row">
              {plans.length === 0 ? (
                <Button onClick={() => onNavigate('fichas')}>Criar ficha</Button>
              ) : (
                <Button variant="ghost" onClick={() => setDraft({ date: t })}>
                  Registrar treino avulso
                </Button>
              )}
            </div>
          </Card>
        )}

        {pendingToday.length > 0 && nextOtherDay && (
          <button
            onClick={() => onNavigate('calendario', nextOtherDay.iso)}
            className="flex w-full items-center gap-3 px-1 text-left"
          >
            <span className="text-xs text-ink-3">depois</span>
            <span className="text-xs font-medium text-ink-2">{relative(nextOtherDay.iso)}</span>
            <span className="min-w-0 flex-1 truncate text-xs text-ink-3">{nextOtherDay.plan.name}</span>
            <span className="text-xs font-medium text-accent">ver agenda</span>
          </button>
        )}
      </div>

      <WeekStrip week={week} onPick={(iso) => onNavigate('calendario', iso)} />

      <div className="grid grid-cols-3 gap-3">
        <Stat
          label="Recorde"
          value={pr ? pr.height : '—'}
          unit={pr ? 'cm' : null}
          sub={pr ? relative(pr.date) : 'sem medição'}
          tone="var(--color-accent)"
        />
        <Stat
          label="Ganho"
          value={prog ? (prog.delta > 0 ? '+' : '') + prog.delta : '—'}
          unit={prog ? 'cm' : null}
          sub={prog ? 'em ' + prog.days + ' dias' : '2 medições'}
        />
        <Stat
          label="Sequência"
          value={dias}
          unit={dias === 1 ? 'dia' : 'dias'}
          sub={dias > 0 ? 'seguidos' : 'treine hoje'}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-5 lg:col-span-3">
          <SectionTitle
            action={
              <button
                onClick={() => onNavigate('impulsao')}
                className="text-xs font-medium text-accent hover:underline"
              >
                medir
              </button>
            }
          >
            Evolução — {JUMP_KINDS[mainKind].label} (cm)
          </SectionTitle>
          <JumpChart jumps={jumps} kind={mainKind} />
        </Card>

        <Card className="flex flex-col p-5 lg:col-span-2">
          <SectionTitle>Volume — 30 dias</SectionTitle>
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
          Últimos treinos
        </SectionTitle>
        {recent.length === 0 ? (
          <Card className="px-5 py-8 text-center text-sm text-ink-3">Nenhum treino registrado.</Card>
        ) : (
          <Card className="divide-y divide-line">
            {recent.map((w) => (
              <button
                key={w.id}
                onClick={() => onNavigate('calendario', w.date)}
                className="flex w-full flex-wrap items-center gap-x-3 gap-y-1.5 px-5 py-3.5 text-left transition hover:bg-surface-2/50"
              >
                <Badge color={CATEGORIES[w.type].color}>{CATEGORIES[w.type].label}</Badge>
                <span className="min-w-0 flex-1 truncate text-sm text-ink">
                  {w.items.map((i) => i.name).join(', ')}
                </span>
                <span className="shrink-0 text-xs text-ink-3">{relative(w.date)}</span>
              </button>
            ))}
          </Card>
        )}
      </div>

      <Modal open={!!draft} onClose={() => setDraft(null)} title="Registrar treino" wide>
        {draft && (
          <WorkoutForm initial={draft} plans={plans} onSubmit={addWorkout} onClose={() => setDraft(null)} />
        )}
      </Modal>
    </div>
  )
}
