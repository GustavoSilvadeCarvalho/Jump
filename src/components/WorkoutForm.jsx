import { useState } from 'react'
import { CATEGORIES, CATEGORY_KEYS, isGame } from '../lib/data'
import { today } from '../lib/dates'
import { isHoldType, toFormItems, toStoredItems } from '../lib/items'
import ExerciseRows from './ExerciseRows'
import { Button, Field, FormActions, Input, Select, Textarea } from './ui'

export default function WorkoutForm({ initial, plans = [], onSubmit, onClose }) {
  const [date, setDate] = useState(initial?.date ?? today())
  const [type, setType] = useState(initial?.type ?? 'pliometria')
  const [planId, setPlanId] = useState(initial?.planId ?? '')
  const [duration, setDuration] = useState(initial?.duration ?? '')
  const [rpe, setRpe] = useState(initial?.rpe ?? 7)
  const [notes, setNotes] = useState(initial?.notes ?? '')
  const [items, setItems] = useState(() => toFormItems(initial?.items, initial?.type))

  // Escolher uma ficha troca a categoria e carrega os exercícios dela.
  const pickPlan = (id) => {
    setPlanId(id)
    const plan = plans.find((p) => p.id === id)
    if (!plan) return
    setType(plan.type)
    setItems(toFormItems(plan.items, plan.type))
  }

  const jogo = isGame(type)
  const valid = jogo || items.some((i) => i.name.trim())

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({
      date,
      type,
      planId: jogo ? null : planId || null,
      duration: duration === '' ? null : Number(duration),
      rpe: Number(rpe),
      notes: notes.trim(),
      items: jogo ? [] : toStoredItems(items),
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

      {plans.length > 0 && !jogo && (
        <Field label="Ficha" hint="Carrega os exercícios da ficha — dá pra ajustar depois de escolher.">
          <Select value={planId} onChange={(e) => pickPlan(e.target.value)}>
            <option value="">Treino avulso</option>
            {plans.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </Select>
        </Field>
      )}

      {!jogo && <ExerciseRows type={type} items={items} setItems={setItems} />}

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
          placeholder={
            jogo
              ? 'Duas horas de quadra, muito salto'
              : isHoldType(type)
                ? 'Quadril ainda travado do lado direito'
                : 'Joelho incomodou no terceiro set'
          }
        />
      </Field>

      <FormActions>
        <Button type="button" variant="quiet" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" className="flex-1 sm:flex-none" disabled={!valid}>
          {initial?.id ? 'Salvar alterações' : 'Salvar treino'}
        </Button>
      </FormActions>
    </form>
  )
}
