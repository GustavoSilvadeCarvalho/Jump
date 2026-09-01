import { LIBRARY } from '../lib/data'
import { emptyItem, isHoldType } from '../lib/items'
import { Input, Select } from './ui'

const miniLabel = 'mb-1 block text-center text-[10px] font-medium tracking-wide text-ink-3 uppercase'

/** Campo numérico curto: no celular, placeholder sozinho não basta. */
function MiniField({ label, header, ...props }) {
  return (
    <div>
      {header ?? <span className={miniLabel}>{label}</span>}
      <Input className="px-1 text-center" type="number" inputMode="numeric" {...props} />
    </div>
  )
}

/** Repetições ou segundos, exercício por exercício. */
function UnitToggle({ unit, onChange }) {
  return (
    <button
      type="button"
      onClick={() => onChange(unit === 'seg' ? 'reps' : 'seg')}
      title="Trocar entre repetições e segundos"
      aria-label={'Medida: ' + (unit === 'seg' ? 'segundos' : 'repetições') + '. Toque pra trocar.'}
      className="mb-1 flex w-full items-center justify-center gap-1 rounded-md border border-line py-1 text-[10px] font-medium tracking-wide text-ink-2 uppercase transition hover:border-ink-3 hover:text-ink"
    >
      {unit === 'seg' ? 'seg' : 'reps'}
      <svg viewBox="0 0 20 20" className="size-2.5" fill="none" stroke="currentColor" strokeWidth="2">
        <path d="M3 7h14l-4-4M17 13H3l4 4" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    </button>
  )
}

export default function ExerciseRows({ type, items, setItems }) {
  const defaultUnit = isHoldType(type) ? 'seg' : 'reps'

  const setItem = (key, patch) =>
    setItems((list) => list.map((i) => (i.key === key ? { ...i, ...patch } : i)))

  const removeItem = (key) =>
    setItems((list) => (list.length === 1 ? [emptyItem(defaultUnit)] : list.filter((i) => i.key !== key)))

  const addFromLibrary = (name) => {
    if (!name) return
    const ex = LIBRARY[type].find((e) => e.name === name)
    const unit = ex?.unit ?? defaultUnit
    setItems((list) => {
      const blank = list.find((i) => !i.name.trim())
      if (blank) return list.map((i) => (i.key === blank.key ? { ...i, name, unit } : i))
      return [...list, { ...emptyItem(unit), name }]
    })
  }

  return (
    <div>
      <div className="mb-2 flex items-center justify-between gap-3">
        <span className="text-xs font-medium text-ink-2">Exercícios</span>
        <Select
          className="w-auto max-w-52 py-2 text-xs sm:py-1.5"
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
        {items.map((item, idx) => {
          const seg = item.unit === 'seg'
          return (
            <div key={item.key} className="rounded-xl border border-line bg-surface-2/40 p-3">
              <div className="flex items-center gap-2">
                <span className="tnum w-4 shrink-0 text-center text-xs text-ink-3">{idx + 1}</span>
                <Input
                  className="flex-1"
                  placeholder="Nome do exercício"
                  value={item.name}
                  onChange={(e) => setItem(item.key, { name: e.target.value })}
                />
                <button
                  type="button"
                  onClick={() => removeItem(item.key)}
                  aria-label={'Remover ' + (item.name.trim() || 'exercício ' + (idx + 1))}
                  className="grid size-10 shrink-0 place-items-center rounded-lg text-ink-3 transition hover:bg-surface-2 hover:text-[#e66767]"
                >
                  <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.7">
                    <path d="M5 10h10" strokeLinecap="round" />
                  </svg>
                </button>
              </div>

              <div className="mt-2 grid grid-cols-4 gap-2 pl-6">
                <MiniField
                  label="séries"
                  aria-label="Séries"
                  min="1"
                  placeholder="3"
                  value={item.sets}
                  onChange={(e) => setItem(item.key, { sets: e.target.value })}
                />
                <MiniField
                  header={<UnitToggle unit={item.unit} onChange={(unit) => setItem(item.key, { unit })} />}
                  aria-label={seg ? 'Segundos por série' : 'Repetições por série'}
                  min="1"
                  placeholder={seg ? '30' : '8'}
                  value={item.reps}
                  onChange={(e) => setItem(item.key, { reps: e.target.value })}
                />
                <MiniField
                  label="kg"
                  aria-label="Carga em quilos"
                  min="0"
                  step="0.5"
                  inputMode="decimal"
                  placeholder="40"
                  value={item.load}
                  onChange={(e) => setItem(item.key, { load: e.target.value })}
                />
                <MiniField
                  label="desc. (s)"
                  aria-label="Descanso em segundos"
                  min="0"
                  step="15"
                  placeholder="60"
                  value={item.rest}
                  onChange={(e) => setItem(item.key, { rest: e.target.value })}
                />
              </div>
            </div>
          )
        })}
      </div>

      <button
        type="button"
        onClick={() => setItems((l) => [...l, emptyItem(defaultUnit)])}
        className="mt-2 w-full rounded-xl border border-dashed border-line py-3 text-sm font-medium text-ink-2 transition hover:border-ink-3 hover:text-ink"
      >
        + Adicionar exercício
      </button>
    </div>
  )
}
