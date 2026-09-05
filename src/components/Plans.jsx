import { useState } from 'react'
import { CATEGORIES, PLAN_CATEGORY_KEYS, PLAN_TEMPLATES } from '../lib/data'
import { WEEKDAYS } from '../lib/dates'
import { daysLabel, totalSets } from '../lib/schedule'
import { toFormItems, toStoredItems } from '../lib/items'
import ExerciseRows from './ExerciseRows'
import ExerciseList from './ExerciseList'
import { Badge, Button, Card, EmptyState, Field, FormActions, Input, Modal, Select, Textarea } from './ui'

function WeekdayPicker({ value, onChange }) {
  const toggle = (key) =>
    onChange(value.includes(key) ? value.filter((d) => d !== key) : [...value, key].sort((a, b) => a - b))

  return (
    <div className="flex gap-1.5">
      {WEEKDAYS.map((d) => {
        const on = value.includes(d.key)
        return (
          <button
            key={d.key}
            type="button"
            onClick={() => toggle(d.key)}
            aria-pressed={on}
            title={d.label}
            className={
              'h-10 flex-1 rounded-xl border text-xs font-semibold transition ' +
              (on
                ? 'border-accent bg-accent-soft text-accent'
                : 'border-line bg-surface-2 text-ink-3 hover:border-ink-3 hover:text-ink')
            }
          >
            {d.short}
          </button>
        )
      })}
    </div>
  )
}

function PlanForm({ initial, onSubmit, onClose }) {
  const [name, setName] = useState(initial?.name ?? '')
  const [type, setType] = useState(initial?.type ?? 'pliometria')
  const [days, setDays] = useState(initial?.days ?? [])
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState(() => toFormItems(initial?.items, initial?.type))

  const valid = name.trim() && items.some((i) => i.name.trim())

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      name: name.trim(),
      type,
      days,
      notes: notes.trim(),
      items: toStoredItems(items),
    })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-3 sm:grid-cols-3">
        <Field label="Nome da ficha" className="sm:col-span-2">
          <Input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Impulsão A — explosão"
          />
        </Field>
        <Field label="Categoria">
          <Select value={type} onChange={(e) => setType(e.target.value)}>
            {PLAN_CATEGORY_KEYS.map((k) => (
              <option key={k} value={k}>
                {CATEGORIES[k].label}
              </option>
            ))}
          </Select>
        </Field>
      </div>

      <Field label="Dias de treino" hint="A ficha aparece no calendário nesses dias, toda semana.">
        <WeekdayPicker value={days} onChange={setDays} />
      </Field>

      <ExerciseRows type={type} items={items} setItems={setItems} />

      <Field label="Notas">
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Aquecer 10 min de corrida leve antes"
        />
      </Field>

      <FormActions>
        <Button type="button" variant="quiet" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 sm:flex-none" disabled={!valid}>
          {initial ? 'Salvar alterações' : 'Criar ficha'}
        </Button>
      </FormActions>
    </form>
  )
}

function PlanCard({ plan, onEdit, onDelete, onStart }) {
  const cat = CATEGORIES[plan.type]
  const sets = totalSets(plan)

  return (
    <Card className="flex flex-col p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="font-semibold text-ink">{plan.name}</h3>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge color={cat.color}>{cat.label}</Badge>
            <span className="text-xs text-ink-2">{daysLabel(plan.days)}</span>
          </div>
        </div>
        <div className="flex shrink-0 gap-1">
          <button
            onClick={onEdit}
            aria-label={'Editar ' + plan.name}
            className="rounded-lg p-2 text-ink-3 transition hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M13 4l3 3-8 8H5v-3l8-8z" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
          <button
            onClick={onDelete}
            aria-label={'Apagar ' + plan.name}
            className="rounded-lg p-2 text-ink-3 transition hover:bg-surface-2 hover:text-[#e66767]"
          >
            <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>

      <div className="mt-4 border-t border-line pt-4">
        <ExerciseList items={plan.items} type={plan.type} />
      </div>

      {plan.notes && <p className="mt-3 text-xs text-ink-2">{plan.notes}</p>}

      <div className="mt-auto flex items-center justify-between gap-3 border-t border-line pt-4">
        <span className="tnum text-xs text-ink-3">
          {plan.items.length} exercícios{sets ? ' · ' + sets + ' séries' : ''}
        </span>
        <Button variant="ghost" className="px-3 py-1.5 text-xs" onClick={onStart}>
          Começar treino
        </Button>
      </div>
    </Card>
  )
}

export default function Plans({ store, onNavigate, onStart }) {
  const { plans, addPlan, updatePlan, removePlan } = store
  const [open, setOpen] = useState(false)
  const [editing, setEditing] = useState(null)

  const close = () => {
    setOpen(false)
    setEditing(null)
  }

  const seed = () => PLAN_TEMPLATES.forEach(addPlan)

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Fichas</h1>
          <p className="mt-1 text-sm text-ink-3">
            O plano de cada treino — exercícios, séries, carga, descanso e em que dias fazer.
          </p>
        </div>
        <Button className="w-full sm:w-auto" onClick={() => setOpen(true)}>
          Nova ficha
        </Button>
      </div>

      {plans.length === 0 ? (
        <EmptyState
          title="Nenhuma ficha criada"
          action={
            <div className="flex flex-wrap justify-center gap-2">
              <Button onClick={() => setOpen(true)}>Criar ficha</Button>
              <Button variant="ghost" onClick={seed}>
                Usar fichas de exemplo
              </Button>
            </div>
          }
        >
          Monte a ficha uma vez e ela vira a sua agenda: aparece no calendário nos dias marcados e
          preenche o registro do treino com um clique.
        </EmptyState>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {plans.map((plan) => (
            <PlanCard
              key={plan.id}
              plan={plan}
              onEdit={() => {
                setEditing(plan)
                setOpen(true)
              }}
              onDelete={() => {
                if (confirm('Apagar a ficha "' + plan.name + '"? Os treinos já registrados continuam no histórico.')) {
                  removePlan(plan.id)
                }
              }}
              onStart={() => onStart(plan)}
            />
          ))}
        </div>
      )}

      {onNavigate && (
        <button
          onClick={() => onNavigate('biblioteca')}
          className="flex w-full items-center gap-3 rounded-2xl border border-line bg-surface-1 px-5 py-4 text-left transition hover:border-ink-3"
        >
          <span className="flex-1 text-sm text-ink-2">
            Sem ideia do que colocar? Veja a biblioteca de exercícios
          </span>
          <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-ink-3" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      )}

      <Modal open={open} onClose={close} title={editing ? 'Editar ficha' : 'Nova ficha'} wide>
        <PlanForm
          key={editing?.id ?? 'nova'}
          initial={editing}
          onSubmit={(data) => (editing ? updatePlan(editing.id, data) : addPlan(data))}
          onClose={close}
        />
      </Modal>
    </div>
  )
}
