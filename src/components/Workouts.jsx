import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_KEYS } from '../lib/data'
import { longDate } from '../lib/dates'
import { sortByDate, totalMinutes } from '../lib/stats'
import ExerciseList from './ExerciseList'
import WorkoutForm from './WorkoutForm'
import { Badge, Button, Card, EmptyState, Modal } from './ui'

function WorkoutRow({ workout, planName, onEdit, onDelete }) {
  const cat = CATEGORIES[workout.type]
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={cat.color}>{cat.label}</Badge>
            <span className="text-sm text-ink-2">{longDate(workout.date)}</span>
            {planName && <span className="text-xs text-ink-3">· {planName}</span>}
            {workout.duration ? (
              <span className="tnum text-xs text-ink-3">{workout.duration} min</span>
            ) : null}
            {workout.rpe ? <span className="tnum text-xs text-ink-3">RPE {workout.rpe}</span> : null}
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            aria-expanded={expanded}
            className="mt-2 block text-left text-sm text-ink transition hover:text-accent"
          >
            {workout.items.length} exercício{workout.items.length > 1 ? 's' : ''}
            <span className="ml-1.5 text-ink-3">· {workout.items.map((i) => i.name).join(', ')}</span>
          </button>

          {expanded && (
            <div className="mt-3 border-l-2 border-line pl-4">
              <ExerciseList items={workout.items} type={workout.type} />
              {workout.notes && <p className="mt-2 text-xs text-ink-2">{workout.notes}</p>}
            </div>
          )}
        </div>

        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label="Editar treino"
            className="rounded-lg p-2 text-ink-3 transition hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M13 4l3 3-8 8H5v-3l8-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            aria-label="Apagar treino"
            className="rounded-lg p-2 text-ink-3 transition hover:bg-surface-2 hover:text-[#e66767]"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Workouts({ store, onNavigate }) {
  const { workouts, plans, addWorkout, updateWorkout, removeWorkout } = store
  const [filter, setFilter] = useState('todos')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const list = useMemo(() => {
    const filtered = filter === 'todos' ? workouts : workouts.filter((w) => w.type === filter)
    return sortByDate(filtered).reverse()
  }, [workouts, filter])

  const planName = (id) => plans.find((p) => p.id === id)?.name ?? null

  const close = () => {
    setOpen(false)
    setEditing(null)
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Treinos</h1>
          <p className="mt-1 text-sm text-ink-3">
            {workouts.length} sessões · {totalMinutes(workouts)} minutos no total
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          Novo treino
        </Button>
      </div>

      <div className="flex flex-wrap gap-2">
        {['todos', ...CATEGORY_KEYS].map((key) => {
          const isActive = filter === key
          const label = key === 'todos' ? 'Todos' : CATEGORIES[key].label
          const count = key === 'todos' ? workouts.length : workouts.filter((w) => w.type === key).length
          return (
            <button
              key={key}
              onClick={() => setFilter(key)}
              className={
                'rounded-full border px-3 py-1.5 text-xs font-medium transition ' +
                (isActive
                  ? 'border-ink bg-surface-2 text-ink'
                  : 'border-line text-ink-2 hover:border-ink-3 hover:text-ink')
              }
            >
              {label}
              <span className="tnum ml-1.5 text-ink-3">{count}</span>
            </button>
          )
        })}
      </div>

      {list.length === 0 ? (
        <EmptyState
          title={workouts.length === 0 ? 'Nenhum treino registrado' : 'Nada nesse filtro'}
          action={
            workouts.length === 0 ? (
              <div className="flex flex-wrap justify-center gap-2">
                <Button onClick={() => setOpen(true)}>Registrar o primeiro</Button>
                {plans.length === 0 && onNavigate && (
                  <Button variant="ghost" onClick={() => onNavigate('fichas')}>
                    Montar uma ficha
                  </Button>
                )}
              </div>
            ) : null
          }
        >
          {workouts.length === 0
            ? 'Registre pliometria, força, alongamento e mobilidade num lugar só.'
            : 'Tente outra categoria.'}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line">
          {list.map((w) => (
            <WorkoutRow
              key={w.id}
              workout={w}
              planName={planName(w.planId)}
              onEdit={() => {
                setEditing(w)
                setOpen(true)
              }}
              onDelete={() => removeWorkout(w.id)}
            />
          ))}
        </Card>
      )}

      <Modal open={open} onClose={close} title={editing ? 'Editar treino' : 'Novo treino'} wide>
        <WorkoutForm
          key={editing?.id ?? 'novo'}
          initial={editing}
          plans={plans}
          onSubmit={(data) => (editing ? updateWorkout(editing.id, data) : addWorkout(data))}
          onClose={close}
        />
      </Modal>
    </div>
  )
}
