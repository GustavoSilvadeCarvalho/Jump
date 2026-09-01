import { useMemo, useState } from 'react'
import { CATEGORIES, CATEGORY_KEYS, LIBRARY } from '../lib/data'
import { longDate, today } from '../lib/dates'
import { sortByDate, totalMinutes } from '../lib/stats'
import { uid } from '../lib/storage'
import {
  Badge,
  Button,
  Card,
  EmptyState,
  Field,
  Input,
  Modal,
  Select,
  Textarea,
} from './ui'

const emptyItem = () => ({ key: uid(), name: '', sets: '', reps: '', load: '' })

function WorkoutForm({ initial, onSubmit, onClose }) {
  const [date, setDate] = useState(initial?.date ?? today())
  const [type, setType] = useState(initial?.type ?? 'pliometria')
  const [duration, setDuration] = useState(initial?.duration ?? '')
  const [rpe, setRpe] = useState(initial?.rpe ?? 7)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState(
    initial?.items?.length
      ? // Do storage os campos voltam como number|null; o input controlado precisa de string.
        initial.items.map((i) => ({
          key: uid(),
          name: i.name ?? '',
          sets: i.sets ?? '',
          reps: i.reps ?? '',
          load: i.load ?? '',
        }))
      : [emptyItem()],
  )

  // Alongamento e mobilidade se medem em segundos, não em repetições.
  const isHold = type === 'alongamento' || type === 'mobilidade'

  const setItem = (key, patch) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  const addFromLibrary = (name) => {
    if (!name) return
    setItems((list) => {
      const blank = list.find((i) => !i.name.trim())
      if (blank) return list.map((i) => (i.key === blank.key ? { ...i, name } : i))
      return [...list, { ...emptyItem(), name }]
    })
  }

  const filled = items.filter((i) => i.name.trim())
  const valid = filled.length > 0

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      date,
      type,
      duration: duration === '' ? null : Number(duration),
      rpe: Number(rpe),
      notes: notes.trim(),
      items: filled.map(({ name, sets, reps, load }) => ({
        name: name.trim(),
        sets: sets === '' ? null : Number(sets),
        reps: reps === '' ? null : Number(reps),
        load: load === '' ? null : Number(load),
      })),
    })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Field label="Data" className="col-span-2 sm:col-span-1">
          <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Tipo" className="col-span-2">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORIES[k].label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Duração (min)">
          <Input
            type="number"
            min="1"
            placeholder="45"
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </Field>
      </div>

      <div>
        <div className="mb-2 flex items-center justify-between gap-3">
          <span className="text-xs font-medium text-ink-2">Exercícios</span>
          <Select
            className="w-auto max-w-56 py-1.5 text-xs"
            value=""
            onChange={(e) => addFromLibrary(e.target.value)}
          >
            <option value="">+ Da biblioteca…</option>
            {LIBRARY[type].map((ex) => (
              <option key={ex.name} value={ex.name}>
                {ex.name}
              </option>
            ))}
          </Select>
        </div>

        <div className="space-y-2">
          {items.map((item) => (
            <div key={item.key} className="flex gap-2">
              <Input
                className="flex-1"
                placeholder="Nome do exercício"
                value={item.name}
                onChange={(e) => setItem(item.key, { name: e.target.value })}
              />
              <Input
                className="w-14 px-2 text-center"
                type="number"
                min="1"
                placeholder="3"
                aria-label="Séries"
                value={item.sets}
                onChange={(e) => setItem(item.key, { sets: e.target.value })}
              />
              <Input
                className="w-16 px-2 text-center"
                type="number"
                min="1"
                placeholder={isHold ? '30s' : '8'}
                aria-label={isHold ? 'Segundos' : 'Repetições'}
                value={item.reps}
                onChange={(e) => setItem(item.key, { reps: e.target.value })}
              />
              {!isHold && (
                <Input
                  className="w-16 px-2 text-center"
                  type="number"
                  min="0"
                  step="0.5"
                  placeholder="kg"
                  aria-label="Carga em quilos"
                  value={item.load}
                  onChange={(e) => setItem(item.key, { load: e.target.value })}
                />
              )}
              <button
                type="button"
                onClick={() => setItems((l) => (l.length === 1 ? [emptyItem()] : l.filter((i) => i.key !== item.key)))}
                aria-label="Remover exercício"
                className="shrink-0 rounded-lg px-2 text-ink-3 transition hover:text-[#e66767]"
              >
                <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                  <path d="M5 10h10" strokeLinecap="round" />
                </svg>
              </button>
            </div>
          ))}
        </div>

        <div className="mt-2 flex items-center justify-between">
          <Button type="button" variant="quiet" className="px-0" onClick={() => setItems((l) => [...l, emptyItem()])}>
            + Adicionar linha
          </Button>
          <span className="text-xs text-ink-3">
            séries · {isHold ? 'segundos' : 'reps · carga'}
          </span>
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
        <Button type="button" variant="quiet" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid}>
          {initial ? 'Salvar alterações' : 'Salvar treino'}
        </Button>
      </div>
    </form>
  )
}

function WorkoutRow({ workout, onEdit, onDelete }) {
  const cat = CATEGORIES[workout.type]
  const [expanded, setExpanded] = useState(false)

  return (
    <div className="px-5 py-4">
      <div className="flex items-start gap-4">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <Badge color={cat.color}>{cat.label}</Badge>
            <span className="text-sm text-ink-2">{longDate(workout.date)}</span>
            {workout.duration ? (
              <span className="tnum text-xs text-ink-3">{workout.duration} min</span>
            ) : null}
            {workout.rpe ? <span className="tnum text-xs text-ink-3">RPE {workout.rpe}</span> : null}
          </div>

          <button
            onClick={() => setExpanded((v) => !v)}
            className="mt-2 block text-left text-sm text-ink transition hover:text-accent"
          >
            {workout.items.length} exercício{workout.items.length > 1 ? 's' : ''}
            <span className="ml-1.5 text-ink-3">
              · {workout.items.map((i) => i.name).join(', ')}
            </span>
          </button>

          {expanded && (
            <ul className="mt-3 space-y-1.5 border-l-2 border-line pl-4">
              {workout.items.map((item, idx) => (
                <li key={idx} className="flex flex-wrap items-baseline gap-x-2 text-sm">
                  <span className="text-ink">{item.name}</span>
                  <span className="tnum text-xs text-ink-3">
                    {[
                      item.sets ? item.sets + '×' : null,
                      item.reps ? item.reps : null,
                      item.load ? item.load + ' kg' : null,
                    ]
                      .filter(Boolean)
                      .join(' ')}
                  </span>
                </li>
              ))}
              {workout.notes && <li className="pt-1 text-xs text-ink-2">{workout.notes}</li>}
            </ul>
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

export default function Workouts({ store }) {
  const { workouts, addWorkout, updateWorkout, removeWorkout } = store
  const [filter, setFilter] = useState('todos')
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const list = useMemo(() => {
    const filtered = filter === 'todos' ? workouts : workouts.filter((w) => w.type === filter)
    return sortByDate(filtered).reverse()
  }, [workouts, filter])

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
        <Button onClick={() => setOpen(true)}>Novo treino</Button>
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
            workouts.length === 0 ? <Button onClick={() => setOpen(true)}>Registrar o primeiro</Button> : null
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
          onSubmit={(data) => (editing ? updateWorkout(editing.id, data) : addWorkout(data))}
          onClose={close}
        />
      </Modal>
    </div>
  )
}
