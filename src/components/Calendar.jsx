import { useMemo, useRef, useState } from 'react'
import { CATEGORIES } from '../lib/data'
import { WEEKDAYS, fromISO, longDate, monthGrid, monthLabel, today } from '../lib/dates'
import { dayAgenda, planToDraft, workoutsByDate } from '../lib/schedule'
import ExerciseList from './ExerciseList'
import WorkoutForm from './WorkoutForm'
import { Badge, Button, Card, Modal } from './ui'

function DayCell({ cell, agenda, isToday, isSelected, onSelect }) {
  const done = agenda.done
  const pending = agenda.planned.filter((p) => !p.done)
  const isPast = cell.iso < today()

  return (
    <button
      type="button"
      onClick={() => onSelect(cell.iso)}
      aria-pressed={isSelected}
      aria-label={longDate(cell.iso) + ' — ' + describe(agenda)}
      className={
        'flex aspect-square flex-col items-center justify-start rounded-xl border p-1.5 transition sm:p-2 ' +
        (isSelected
          ? 'border-accent bg-accent-soft'
          : 'border-transparent hover:border-line hover:bg-surface-2') +
        (cell.inMonth ? '' : ' opacity-35')
      }
    >
      <span
        className={
          'tnum flex size-6 items-center justify-center rounded-full text-xs font-medium ' +
          (isToday ? 'bg-accent font-bold text-surface-0' : isSelected ? 'text-accent' : 'text-ink-2')
        }
      >
        {cell.day}
      </span>

      <span className="mt-1 flex max-w-full flex-wrap justify-center gap-1">
        {done.slice(0, 4).map((w) => (
          <span
            key={w.id}
            className="size-1.5 rounded-full sm:size-2"
            style={{ background: CATEGORIES[w.type].color }}
          />
        ))}
        {pending.slice(0, 4 - Math.min(done.length, 4)).map(({ plan }) => (
          <span
            key={plan.id}
            className="size-1.5 rounded-full border sm:size-2"
            style={{
              borderColor: CATEGORIES[plan.type].color,
              opacity: isPast ? 0.45 : 1,
            }}
          />
        ))}
      </span>
    </button>
  )
}

function describe(agenda) {
  const parts = []
  if (agenda.done.length) parts.push(agenda.done.length + ' treino(s) feito(s)')
  const pending = agenda.planned.filter((p) => !p.done).length
  if (pending) parts.push(pending + ' previsto(s)')
  return parts.length ? parts.join(', ') : 'nada marcado'
}

function DoneCard({ workout, onEdit, onDelete }) {
  const cat = CATEGORIES[workout.type]
  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <Badge color={cat.color}>{cat.label}</Badge>
          {workout.duration ? <span className="tnum text-xs text-ink-3">{workout.duration} min</span> : null}
          {workout.rpe ? <span className="tnum text-xs text-ink-3">RPE {workout.rpe}</span> : null}
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label="Editar treino"
            className="rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M13 4l3 3-8 8H5v-3l8-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            aria-label="Apagar treino"
            className="rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-[#e66767]"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
      <ExerciseList items={workout.items} type={workout.type} className="mt-3" />
      {workout.notes && <p className="mt-3 text-xs text-ink-2">{workout.notes}</p>}
    </div>
  )
}

function PlannedCard({ plan, canLog, hoje, onLog }) {
  const cat = CATEGORIES[plan.type]
  return (
    <div
      className="rounded-xl border border-dashed p-4"
      style={{ borderColor: 'color-mix(in oklab, ' + cat.color + ' 35%, transparent)' }}
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex min-w-0 flex-wrap items-center gap-2">
          <Badge color={cat.color}>{cat.label}</Badge>
          <span className="text-sm font-medium text-ink">{plan.name}</span>
        </div>
        {canLog ? (
          <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={onLog}>
            {hoje ? 'Começar' : 'Registrar'}
          </Button>
        ) : (
          <span className="text-xs text-ink-3">previsto</span>
        )}
      </div>
      <ExerciseList items={plan.items} type={plan.type} className="mt-3" />
      {plan.notes && <p className="mt-3 text-xs text-ink-2">{plan.notes}</p>}
    </div>
  )
}

export default function Calendar({ store, initialDate, onStart }) {
  const { workouts, plans, addWorkout, updateWorkout, removeWorkout } = store
  // A home manda o dia junto ao trocar de aba; sem isso, abre em hoje.
  const start = initialDate ?? today()
  const startDate = fromISO(start)
  const [cursor, setCursor] = useState({ y: startDate.getFullYear(), m: startDate.getMonth() })
  const [selected, setSelected] = useState(start)
  const panelRef = useRef(null)
  const [draft, setDraft] = useState(null)
  const [editing, setEditing] = useState(null)

  const byDate = useMemo(() => workoutsByDate(workouts), [workouts])
  const cells = useMemo(() => monthGrid(cursor.y, cursor.m), [cursor.y, cursor.m])

  const move = (delta) =>
    setCursor(({ y, m }) => {
      const d = new Date(y, m + delta, 1)
      return { y: d.getFullYear(), m: d.getMonth() }
    })

  const goToday = () => {
    const t = new Date()
    setCursor({ y: t.getFullYear(), m: t.getMonth() })
    setSelected(today())
  }

  // No celular o detalhe do dia fica abaixo da grade — traz ele pra tela ao tocar.
  const pick = (iso) => {
    setSelected(iso)
    if (window.matchMedia('(max-width: 639px)').matches) {
      panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }

  const agenda = dayAgenda(selected, plans, byDate)
  const isFuture = selected > today()
  const pendingPlans = agenda.planned.filter((p) => !p.done)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Calendário</h1>
          <p className="mt-1 text-sm text-ink-3">
            O que você já fez e o que as fichas marcam pros próximos dias.
          </p>
        </div>
        <Button
          className="w-full sm:w-auto"
          onClick={() => setDraft({ date: selected > today() ? today() : selected })}
        >
          Registrar treino
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-5">
        <Card className="p-4 sm:p-5 lg:col-span-3">
          <div className="mb-4 flex items-center justify-between gap-2">
            <div className="flex items-center gap-1">
              <button
                onClick={() => move(-1)}
                aria-label="Mês anterior"
                className="rounded-lg p-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
              <button
                onClick={() => move(1)}
                aria-label="Próximo mês"
                className="rounded-lg p-2 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                  <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
              </button>
            </div>
            <h2 className="text-sm font-semibold text-ink capitalize">{monthLabel(cursor.y, cursor.m)}</h2>
            <button onClick={goToday} className="rounded-lg px-2 py-1 text-xs font-medium text-accent hover:underline">
              hoje
            </button>
          </div>

          <div className="grid grid-cols-7 gap-1 text-center">
            {WEEKDAYS.map((d) => (
              <div key={d.key} className="pb-1 text-[10px] font-medium tracking-wide text-ink-3 uppercase">
                {d.short}
              </div>
            ))}
            {cells.map((cell) => (
              <DayCell
                key={cell.iso}
                cell={cell}
                agenda={dayAgenda(cell.iso, plans, byDate)}
                isToday={cell.iso === today()}
                isSelected={cell.iso === selected}
                onSelect={pick}
              />
            ))}
          </div>

          <div className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-t border-line pt-4 text-xs text-ink-3">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full bg-ink-2" />
              feito
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2 rounded-full border border-ink-2" />
              previsto pela ficha
            </span>
            <span className="ml-auto hidden sm:inline">a cor é a categoria do treino</span>
          </div>
        </Card>

        <div ref={panelRef} className="scroll-mt-16 space-y-3 lg:col-span-2">
          <div className="flex items-baseline justify-between gap-3">
            <h2 className="font-semibold text-ink capitalize">
              {selected === today() ? 'Hoje' : longDate(selected)}
            </h2>
            <span className="text-xs text-ink-3">{WEEKDAYS[fromISO(selected).getDay()].label}</span>
          </div>

          {agenda.done.map((w) => (
            <DoneCard
              key={w.id}
              workout={w}
              onEdit={() => setEditing(w)}
              onDelete={() => {
                if (confirm('Apagar esse treino?')) removeWorkout(w.id)
              }}
            />
          ))}

          {pendingPlans.map(({ plan }) => (
            <PlannedCard
              key={plan.id}
              plan={plan}
              canLog={!isFuture}
              hoje={selected === today()}
              onLog={() =>
                selected === today() ? onStart(plan) : setDraft(planToDraft(plan, selected))
              }
            />
          ))}

          {agenda.done.length === 0 && pendingPlans.length === 0 && (
            <div className="rounded-xl border border-dashed border-line px-4 py-8 text-center">
              <p className="text-sm text-ink-3">
                {plans.length === 0
                  ? 'Sem fichas ainda — crie uma pra encher o calendário.'
                  : isFuture
                    ? 'Dia livre.'
                    : 'Nada registrado nesse dia.'}
              </p>
              {!isFuture && (
                <Button
                  variant="ghost"
                  className="mt-4 px-3 py-1.5 text-xs"
                  onClick={() => setDraft({ date: selected })}
                >
                  Registrar treino
                </Button>
              )}
            </div>
          )}
        </div>
      </div>

      <Modal open={!!draft} onClose={() => setDraft(null)} title="Registrar treino" wide>
        {draft && (
          <WorkoutForm initial={draft} plans={plans} onSubmit={addWorkout} onClose={() => setDraft(null)} />
        )}
      </Modal>

      <Modal open={!!editing} onClose={() => setEditing(null)} title="Editar treino" wide>
        {editing && (
          <WorkoutForm
            initial={editing}
            plans={plans}
            onSubmit={(data) => updateWorkout(editing.id, data)}
            onClose={() => setEditing(null)}
          />
        )}
      </Modal>
    </div>
  )
}
