import { useMemo, useState } from 'react'
import { WEEKDAYS, fromISO, longDate, monthGrid, monthLabel, today } from '../lib/dates'
import { Card, SectionTitle } from './ui'

// Rampa sequencial de um hue só, do verde da marca, validada pro fundo escuro.
const NIVEIS = ['#3a4f1f', '#5c7d26', '#82ad2d', '#a3d13d']
// Tinta do número do dia em cada nível — cada combinação conferida por contraste.
const TINTAS = ['var(--color-ink-3)', 'var(--color-ink)', '#0b0d11', '#0b0d11', '#0b0d11']

/** Minutos do dia → 0 (nada) a 4. Treino sem duração ainda conta como 1. */
function nivel(minutos, treinos) {
  if (!treinos) return 0
  if (minutos >= 90) return 4
  if (minutos >= 60) return 3
  if (minutos >= 30) return 2
  return 1
}

function resumo(dia) {
  if (!dia.treinos) return 'sem treino'
  const sessoes = dia.treinos + (dia.treinos > 1 ? ' treinos' : ' treino')
  return dia.minutos ? dia.minutos + ' min · ' + sessoes : sessoes
}

function porDia(workouts) {
  const map = new Map()
  for (const w of workouts) {
    const atual = map.get(w.date) ?? { minutos: 0, treinos: 0 }
    atual.minutos += Number(w.duration) || 0
    atual.treinos += 1
    map.set(w.date, atual)
  }
  return map
}

/** As semanas do mês, sem a linha que cai toda no mês seguinte. */
function semanasDoMes(ano, mes) {
  const celulas = monthGrid(ano, mes)
  const semanas = []
  for (let i = 0; i < celulas.length; i += 7) semanas.push(celulas.slice(i, i + 7))
  return semanas.filter((s) => s.some((c) => c.inMonth))
}

export default function Heatmap({ workouts, onNavigate }) {
  const hoje = today()
  const agora = fromISO(hoje)
  const [cursor, setCursor] = useState({ y: agora.getFullYear(), m: agora.getMonth() })
  const [sel, setSel] = useState(null)

  const dados = useMemo(() => porDia(workouts), [workouts])
  const semanas = useMemo(() => semanasDoMes(cursor.y, cursor.m), [cursor.y, cursor.m])

  const mes = semanas
    .flat()
    .filter((c) => c.inMonth)
    .reduce(
      (acc, c) => {
        const d = dados.get(c.iso)
        return d ? { dias: acc.dias + 1, minutos: acc.minutos + d.minutos } : acc
      },
      { dias: 0, minutos: 0 },
    )

  const move = (delta) => {
    const d = new Date(cursor.y, cursor.m + delta, 1)
    setCursor({ y: d.getFullYear(), m: d.getMonth() })
    setSel(null)
  }

  const noMesAtual = agora.getFullYear() === cursor.y && agora.getMonth() === cursor.m

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle
        action={
          <span className="flex items-center gap-0.5">
            <button
              onClick={() => move(-1)}
              aria-label="Mês anterior"
              className="rounded-lg p-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M12 4l-6 6 6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
            <span className="w-28 text-center text-xs font-medium text-ink capitalize">
              {monthLabel(cursor.y, cursor.m)}
            </span>
            <button
              onClick={() => move(1)}
              disabled={noMesAtual}
              aria-label="Próximo mês"
              className="rounded-lg p-1.5 text-ink-2 transition hover:bg-surface-2 hover:text-ink disabled:opacity-30"
            >
              <svg viewBox="0 0 20 20" className="size-4" fill="none" stroke="currentColor" strokeWidth="1.8">
                <path d="M8 4l6 6-6 6" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </span>
        }
      >
        Constância
      </SectionTitle>

      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((d) => (
          <div key={d.key} className="pb-1 text-[10px] font-medium tracking-wide text-ink-3 lowercase">
            {d.short}
          </div>
        ))}

        {semanas.flat().map((celula) => {
          if (!celula.inMonth) return <span key={celula.iso} />

          const dia = { iso: celula.iso, ...(dados.get(celula.iso) ?? { minutos: 0, treinos: 0 }) }
          const futuro = celula.iso > hoje
          const n = nivel(dia.minutos, dia.treinos)

          return (
            <button
              key={celula.iso}
              onMouseEnter={() => setSel(dia)}
              onFocus={() => setSel(dia)}
              onClick={() => setSel(dia)}
              aria-label={longDate(celula.iso) + ': ' + (futuro ? 'ainda não chegou' : resumo(dia))}
              className={
                'tnum grid aspect-square place-items-center rounded-lg text-xs font-medium transition ' +
                (futuro ? 'border border-dashed border-line text-ink-3' : '')
              }
              style={
                futuro
                  ? { opacity: 0.5 }
                  : {
                      background: dia.treinos ? NIVEIS[n - 1] : 'var(--color-surface-2)',
                      color: TINTAS[n],
                      outline: sel?.iso === celula.iso ? '2px solid var(--color-ink-2)' : undefined,
                      outlineOffset: '1px',
                    }
              }
            >
              {celula.day}
            </button>
          )
        })}
      </div>

      <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-line pt-3 text-xs">
        {sel ? (
          <>
            <span className="text-ink-2">
              {longDate(sel.iso)} · <span className="tnum">{resumo(sel)}</span>
            </span>
            {sel.treinos > 0 && (
              <button
                onClick={() => onNavigate('calendario', sel.iso)}
                className="font-medium text-accent hover:underline"
              >
                ver
              </button>
            )}
          </>
        ) : (
          <>
            <span className="tnum text-ink-2">
              {mes.dias} {mes.dias === 1 ? 'dia treinado' : 'dias treinados'}
              {mes.minutos ? ' · ' + mes.minutos + ' min' : ''}
            </span>
            <button onClick={() => onNavigate('treinos')} className="font-medium text-accent hover:underline">
              lista
            </button>
          </>
        )}

        <span className="ml-auto flex items-center gap-1 text-[10px] text-ink-3">
          menos
          <span className="size-2.5 rounded-[3px]" style={{ background: 'var(--color-surface-2)' }} />
          {NIVEIS.map((cor) => (
            <span key={cor} className="size-2.5 rounded-[3px]" style={{ background: cor }} />
          ))}
          mais
        </span>
      </div>
    </Card>
  )
}
