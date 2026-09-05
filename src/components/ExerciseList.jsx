import { itemSummary } from '../lib/items'

export default function ExerciseList({ items, type, max, className = '' }) {
  if (!items?.length) return null
  const shown = max ? items.slice(0, max) : items
  const hidden = items.length - shown.length

  return (
    <ul className={'space-y-1.5 ' + className}>
      {shown.map((item, idx) => (
        <li key={idx} className="flex flex-wrap items-baseline justify-between gap-x-3">
          <span className="text-sm text-ink">{item.name}</span>
          <span className="tnum text-xs text-ink-3">{itemSummary(item, type)}</span>
        </li>
      ))}
      {hidden > 0 && <li className="text-xs text-ink-3">+ {hidden} exercício{hidden > 1 ? 's' : ''}</li>}
    </ul>
  )
}
