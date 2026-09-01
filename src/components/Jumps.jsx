import { useMemo, useState } from 'react'
import { JUMP_KINDS, JUMP_KIND_KEYS } from '../lib/data'
import { longDate, today } from '../lib/dates'
import { personalRecord, sortByDate, touchHeight } from '../lib/stats'
import JumpChart from './JumpChart'
import { Button, Card, Field, Input, Modal, SectionTitle, Select, Textarea } from './ui'

function JumpForm({ onSubmit, onClose }) {
  const [date, setDate] = useState(today())
  const [kind, setKind] = useState('cmj')
  const [height, setHeight] = useState('')
  const [notes, setNotes] = useState('')

  const valid = Number(height) > 0

  const submit = (e) => {
    e.preventDefault()
    if (!valid) return
    onSubmit({ date, kind, height: +Number(height).toFixed(1), notes: notes.trim() })
    onClose()
  }

  return (
    <form onSubmit={submit} className="space-y-4">
      <div className="grid grid-cols-2 gap-3">
        <Field label="Data">
          <Input type="date" value={date} max={today()} onChange={(e) => setDate(e.target.value)} />
        </Field>
        <Field label="Altura (cm)">
          <Input
            type="number"
            inputMode="decimal"
            step="0.5"
            min="1"
            placeholder="62"
            value={height}
            onChange={(e) => setHeight(e.target.value)}
            autoFocus
          />
        </Field>
      </div>

      <Field label="Tipo de salto" hint={JUMP_KINDS[kind].desc}>
        <Select value={kind} onChange={(e) => setKind(e.target.value)}>
          {JUMP_KIND_KEYS.map((k) => (
            <option key={k} value={k}>
              {JUMP_KINDS[k].label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Observações" hint="Opcional — como você estava, calçado, superfície…">
        <Textarea
          rows={2}
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Perna cansada do treino de ontem"
        />
      </Field>

      <div className="flex justify-end gap-2 pt-1">
        <Button type="button" variant="quiet" onClick={onClose}>
          Cancelar
        </Button>
        <Button type="submit" disabled={!valid}>
          Salvar salto
        </Button>
      </div>
    </form>
  )
}

export default function Jumps({ store }) {
  const { jumps, reach, addJump, removeJump, setReach } = store
  const [open, setOpen] = useState(false)

  // Abre no tipo que você mais registra — normalmente o CMJ.
  const defaultKind = useMemo(() => {
    if (!jumps.length) return 'cmj'
    const counts = {}
    for (const j of jumps) counts[j.kind] = (counts[j.kind] || 0) + 1
    return Object.keys(counts).reduce((a, b) => (counts[a] >= counts[b] ? a : b))
  }, [jumps])

  const [kind, setKind] = useState(defaultKind)
  const history = useMemo(() => sortByDate(jumps).reverse(), [jumps])
  const pr = personalRecord(jumps)

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Impulsão</h1>
          <p className="mt-1 text-sm text-ink-3">
            Meça sempre do mesmo jeito — mesma superfície, mesmo calçado, mesmo aquecimento.
          </p>
        </div>
        <Button onClick={() => setOpen(true)}>Registrar salto</Button>
      </div>

      <Card className="p-5">
        {/* Filtro numa linha só, acima do gráfico: uma série por vez. */}
        <div className="mb-5 flex flex-wrap items-center gap-2">
          {JUMP_KIND_KEYS.map((k) => {
            const count = jumps.filter((j) => j.kind === k).length
            const isActive = k === kind
            return (
              <button
                key={k}
                onClick={() => setKind(k)}
                className={
                  'rounded-full border px-3 py-1.5 text-xs font-medium transition ' +
                  (isActive
                    ? 'border-accent bg-accent-soft text-accent'
                    : 'border-line text-ink-2 hover:border-ink-3 hover:text-ink')
                }
              >
                {JUMP_KINDS[k].label}
                <span className="tnum ml-1.5 text-ink-3">{count}</span>
              </button>
            )
          })}
        </div>

        <SectionTitle>Evolução — {JUMP_KINDS[kind].label} (cm)</SectionTitle>
        <JumpChart jumps={jumps} kind={kind} />
      </Card>

      <Card className="p-5">
        <SectionTitle>Alcance parado</SectionTitle>
        <div className="flex flex-wrap items-end gap-4">
          <Field label="Altura que você alcança em pé (cm)" className="w-48">
            <Input
              type="number"
              step="0.5"
              placeholder="240"
              value={reach ?? ''}
              onChange={(e) => setReach(e.target.value === '' ? null : Number(e.target.value))}
            />
          </Field>
          <p className="pb-3 text-sm text-ink-3">
            {pr && touchHeight(reach, pr.height)
              ? 'Com seu recorde de ' + pr.height + ' cm, você toca ' + touchHeight(reach, pr.height) + ' cm.'
              : 'Preencha pra calcular a que altura você chega no seu melhor salto.'}
          </p>
        </div>
      </Card>

      <div>
        <SectionTitle>Histórico ({history.length})</SectionTitle>
        {history.length === 0 ? (
          <Card className="px-5 py-10 text-center text-sm text-ink-3">
            Nenhuma medição ainda.
          </Card>
        ) : (
          <Card className="divide-y divide-line">
            {history.map((j) => (
              <div key={j.id} className="flex items-center gap-4 px-5 py-3.5">
                <div className="tnum w-20 shrink-0 text-lg font-semibold">
                  {j.height}
                  <span className="ml-0.5 text-xs font-normal text-ink-3">cm</span>
                </div>
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-x-2 text-sm">
                    <span className="font-medium">{JUMP_KINDS[j.kind]?.label ?? j.kind}</span>
                    {pr && j.id === pr.id && (
                      <span className="rounded-md bg-accent-soft px-1.5 py-0.5 text-xs font-semibold text-accent">
                        recorde
                      </span>
                    )}
                  </div>
                  <div className="text-xs text-ink-3">{longDate(j.date)}</div>
                  {j.notes && <div className="mt-1 truncate text-xs text-ink-2">{j.notes}</div>}
                </div>
                <button
                  onClick={() => removeJump(j.id)}
                  aria-label={'Apagar salto de ' + j.height + ' cm'}
                  className="shrink-0 rounded-lg p-2 text-ink-3 transition hover:bg-surface-2 hover:text-[#e66767]"
                >
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M4 6h12M8 6V4h4v2M6 6l1 10h6l1-10" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </button>
              </div>
            ))}
          </Card>
        )}
      </div>

      <Modal open={open} onClose={() => setOpen(false)} title="Registrar salto">
        <JumpForm onSubmit={addJump} onClose={() => setOpen(false)} />
      </Modal>
    </div>
  )
}
