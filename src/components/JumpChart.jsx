import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { JUMP_KINDS } from '../lib/data'
import { fromISO, longDate, shortDate } from '../lib/dates'
import { sortByDate } from '../lib/stats'
import { EmptyState } from './ui'

const PAD = { top: 26, right: 20, bottom: 28, left: 40 }
const HEIGHT = 260

/** Passo "redondo" pros ticks do eixo Y. */
function niceStep(range, target = 4) {
  const raw = range / target
  const mag = 10 ** Math.floor(Math.log10(raw))
  const norm = raw / mag
  const step = norm <= 1 ? 1 : norm <= 2 ? 2 : norm <= 5 ? 5 : 10
  return step * mag
}

function useWidth(ref) {
  const [width, setWidth] = useState(720)
  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return
    const ro = new ResizeObserver(([entry]) => setWidth(entry.contentRect.width))
    ro.observe(el)
    return () => ro.disconnect()
  }, [ref])
  return width
}

export default function JumpChart({ jumps, kind }) {
  const wrapRef = useRef(null)
  const width = useWidth(wrapRef)
  const [hover, setHover] = useState(null)

  const points = useMemo(() => sortByDate(jumps.filter((j) => j.kind === kind)), [jumps, kind])

  const geom = useMemo(() => {
    if (points.length === 0) return null

    const xs = points.map((p) => fromISO(p.date).getTime())
    const ys = points.map((p) => p.height)

    const innerW = Math.max(width - PAD.left - PAD.right, 10)
    const innerH = HEIGHT - PAD.top - PAD.bottom

    // Um único ponto (ou vários no mesmo dia) não tem domínio de tempo: centraliza.
    const xMin = Math.min(...xs)
    const xMax = Math.max(...xs)
    const flatX = xMax === xMin
    const x = (t) =>
      flatX ? PAD.left + innerW / 2 : PAD.left + ((t - xMin) / (xMax - xMin)) * innerW

    const rawMin = Math.min(...ys)
    const rawMax = Math.max(...ys)
    const span = rawMax - rawMin || 6
    const step = niceStep(span * 1.4)
    const yMin = Math.floor((rawMin - span * 0.2) / step) * step
    const yMax = Math.ceil((rawMax + span * 0.2) / step) * step
    const y = (v) => PAD.top + innerH - ((v - yMin) / (yMax - yMin)) * innerH

    const ticks = []
    for (let v = yMin; v <= yMax + 1e-9; v += step) ticks.push(+v.toFixed(2))

    const coords = points.map((p, i) => ({ ...p, i, cx: x(xs[i]), cy: y(p.height) }))
    const line = coords
      .map((c, i) => (i === 0 ? 'M' : 'L') + c.cx.toFixed(1) + ',' + c.cy.toFixed(1))
      .join(' ')
    const baseY = PAD.top + innerH
    const area =
      coords.length > 1
        ? line +
          ' L' + coords[coords.length - 1].cx.toFixed(1) + ',' + baseY +
          ' L' + coords[0].cx.toFixed(1) + ',' + baseY + ' Z'
        : null

    // No máximo 5 rótulos de data, sempre incluindo o primeiro e o último.
    const maxLabels = Math.max(2, Math.min(5, Math.floor(innerW / 70)))
    const stride = Math.max(1, Math.ceil((coords.length - 1) / (maxLabels - 1)))
    const xLabels = coords.filter((c, i) => i % stride === 0 || i === coords.length - 1)

    const best = coords.reduce((a, b) => (b.height > a.height ? b : a))
    const last = coords[coords.length - 1]

    return { coords, line, area, ticks, y, baseY, best, last, xLabels }
  }, [points, width])

  const kindLabel = JUMP_KINDS[kind]?.label ?? kind

  if (!geom) {
    return (
      <div ref={wrapRef}>
        <EmptyState title={'Nenhum salto de ' + kindLabel + ' registrado'}>
          Registre pelo menos duas medições pra ver a curva de evolução.
        </EmptyState>
      </div>
    )
  }

  const { coords, line, area, ticks, y, baseY, best, last, xLabels } = geom
  const active = hover !== null ? coords[hover] : null

  const handleMove = (e) => {
    const rect = e.currentTarget.getBoundingClientRect()
    const px = e.clientX - rect.left
    let nearest = 0
    let dist = Infinity
    for (const c of coords) {
      const d = Math.abs(c.cx - px)
      if (d < dist) {
        dist = d
        nearest = c.i
      }
    }
    setHover(nearest)
  }

  // Mantém o tooltip dentro da caixa quando o ponto está perto das bordas.
  const tipLeft = active ? Math.min(Math.max(active.cx, 80), Math.max(width - 80, 80)) : 0

  return (
    <div ref={wrapRef} className="relative">
      <svg
        width={width}
        height={HEIGHT}
        role="img"
        aria-label={
          'Evolução do salto ' + kindLabel + ': ' + points.length +
          ' medições, de ' + points[0].height + ' a ' + last.height + ' centímetros'
        }
        className="block touch-none"
        onPointerMove={handleMove}
        onPointerLeave={() => setHover(null)}
      >
        <defs>
          <linearGradient id="jumpArea" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--color-accent-mark)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--color-accent-mark)" stopOpacity="0" />
          </linearGradient>
        </defs>

        {ticks.map((t) => (
          <g key={t}>
            <line
              x1={PAD.left}
              x2={width - PAD.right}
              y1={y(t)}
              y2={y(t)}
              stroke="var(--color-line)"
              strokeWidth="1"
            />
            <text
              x={PAD.left - 10}
              y={y(t)}
              textAnchor="end"
              dominantBaseline="middle"
              className="tnum"
              fill="var(--color-ink-3)"
              fontSize="11"
            >
              {t}
            </text>
          </g>
        ))}

        {xLabels.map((c) => (
          <text
            key={c.id}
            x={c.cx}
            y={baseY + 18}
            textAnchor="middle"
            fill="var(--color-ink-3)"
            fontSize="11"
          >
            {shortDate(c.date)}
          </text>
        ))}

        {area && <path d={area} fill="url(#jumpArea)" />}
        {coords.length > 1 && (
          <path
            d={line}
            fill="none"
            stroke="var(--color-accent-mark)"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        )}

        {active && (
          <line
            x1={active.cx}
            x2={active.cx}
            y1={PAD.top}
            y2={baseY}
            stroke="var(--color-ink-3)"
            strokeWidth="1"
            strokeDasharray="3 3"
          />
        )}

        {coords.map((c) => (
          <circle
            key={c.id}
            cx={c.cx}
            cy={c.cy}
            r={active && active.i === c.i ? 5 : 3}
            fill="var(--color-accent-mark)"
            stroke="var(--color-surface-1)"
            strokeWidth="2"
          />
        ))}

        {/* Rótulo direto só no recorde e no último ponto — nunca em todos. */}
        {!active && (
          <g>
            <text
              x={Math.min(Math.max(best.cx, PAD.left + 16), width - PAD.right - 16)}
              y={best.cy - 12}
              textAnchor="middle"
              className="tnum"
              fill="var(--color-ink)"
              fontSize="11"
              fontWeight="600"
            >
              {best.height} cm
            </text>
            {last.i !== best.i && (
              <text
                x={Math.min(last.cx, width - PAD.right)}
                y={last.cy - 12}
                textAnchor="end"
                className="tnum"
                fill="var(--color-ink-2)"
                fontSize="11"
              >
                {last.height} cm
              </text>
            )}
          </g>
        )}
      </svg>

      {active && (
        <div
          className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-line bg-surface-2 px-3 py-2 shadow-xl"
          style={{ left: tipLeft, top: 0 }}
        >
          <div className="text-xs whitespace-nowrap text-ink-3">{longDate(active.date)}</div>
          <div className="tnum mt-0.5 text-sm font-semibold text-ink">{active.height} cm</div>
          {active.notes && <div className="mt-1 max-w-40 text-xs text-ink-2">{active.notes}</div>}
        </div>
      )}
    </div>
  )
}
