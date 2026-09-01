import { useEffect, useMemo, useRef, useState } from 'react'
import { addDays, fromISO, longDate, today, weekday } from '../lib/dates'
import { Card, SectionTitle } from './ui'

// Rampa sequencial de um hue só, do verde da marca, validada pro fundo escuro.
const NIVEIS = ['#3a4f1f', '#5c7d26', '#82ad2d', '#a3d13d']
const MESES = ['jan', 'fev', 'mar', 'abr', 'mai', 'jun', 'jul', 'ago', 'set', 'out', 'nov', 'dez']
const SEMANAS_MIN = 12
const SEMANAS_MAX = 53

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

/** Semanas de domingo a sábado cobrindo o histórico, com no mínimo SEMANAS_MIN. */
function montaSemanas(workouts) {
  const hoje = today()
  const datas = workouts.map((w) => w.date).sort()
  const limite = addDays(hoje, -(SEMANAS_MAX * 7 - 1))
  const minimo = addDays(hoje, -(SEMANAS_MIN * 7 - 1))
  const primeiro = datas[0] ?? minimo
  // Cresce com o histórico, entre 12 e 53 semanas.
  const inicio = primeiro < limite ? limite : primeiro < minimo ? primeiro : minimo

  const porDia = new Map()
  for (const w of workouts) {
    const atual = porDia.get(w.date) ?? { minutos: 0, treinos: 0 }
    atual.minutos += Number(w.duration) || 0
    atual.treinos += 1
    porDia.set(w.date, atual)
  }

  const semanas = []
  let cursor = addDays(inicio, -weekday(inicio))
  while (cursor <= hoje) {
    const dias = []
    for (let i = 0; i < 7; i++) {
      const iso = addDays(cursor, i)
      const dados = porDia.get(iso) ?? { minutos: 0, treinos: 0 }
      dias.push({ iso, ...dados, futuro: iso > hoje })
    }
    semanas.push(dias)
    cursor = addDays(cursor, 7)
  }
  return semanas
}

/** Rótulo de mês na primeira semana dele, pulando os que ficariam colados. */
function rotulosDeMes(semanas) {
  const out = []
  let ultimo = -9
  semanas.forEach((dias, i) => {
    const mes = fromISO(dias[0].iso).getMonth()
    const mudou = i === 0 || fromISO(semanas[i - 1][0].iso).getMonth() !== mes
    if (mudou && i - ultimo >= 3) {
      out.push({ coluna: i, texto: MESES[mes] })
      ultimo = i
    }
  })
  return out
}

export default function Heatmap({ workouts, onNavigate }) {
  const semanas = useMemo(() => montaSemanas(workouts), [workouts])
  const meses = useMemo(() => rotulosDeMes(semanas), [semanas])
  const [sel, setSel] = useState(null)
  const scroll = useRef(null)

  // Abre mostrando os dias mais recentes.
  useEffect(() => {
    if (scroll.current) scroll.current.scrollLeft = scroll.current.scrollWidth
  }, [semanas])

  const total = workouts.length
  const dias = semanas.flat().filter((d) => d.treinos).length

  return (
    <Card className="p-4 sm:p-5">
      <SectionTitle
        action={
          sel ? (
            <span className="flex items-center gap-2 text-xs">
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
            </span>
          ) : (
            <span className="flex items-center gap-2 text-xs">
              <span className="tnum text-ink-3">
                {dias} {dias === 1 ? 'dia treinado' : 'dias treinados'}
              </span>
              <button
                onClick={() => onNavigate('treinos')}
                className="font-medium text-accent hover:underline"
              >
                lista
              </button>
            </span>
          )
        }
      >
        Constância
      </SectionTitle>

      <div
        ref={scroll}
        onMouseLeave={() => setSel(null)}
        className="-mx-1 overflow-x-auto px-1 pb-1"
      >
        <div className="w-max">
          <div className="mb-1 flex pl-6">
            {semanas.map((_, i) => {
              const rotulo = meses.find((m) => m.coluna === i)
              return (
                <span key={i} className="w-4 shrink-0 whitespace-nowrap text-[10px] leading-none text-ink-3">
                  {rotulo ? <span className="relative -left-px">{rotulo.texto}</span> : null}
                </span>
              )
            })}
          </div>

          <div className="flex">
            <div className="flex w-6 shrink-0 flex-col pr-1.5 text-right">
              {['', 'seg', '', 'qua', '', 'sex', ''].map((d, i) => (
                <span key={i} className="h-4 text-[9px] leading-4 text-ink-3">
                  {d}
                </span>
              ))}
            </div>

            {semanas.map((dias, i) => (
              <div key={i} className="flex flex-col">
                {dias.map((dia) =>
                  dia.futuro ? (
                    <span key={dia.iso} className="size-4" />
                  ) : (
                    <button
                      key={dia.iso}
                      onMouseEnter={() => setSel(dia)}
                      onFocus={() => setSel(dia)}
                      onClick={() => setSel(dia)}
                      aria-label={longDate(dia.iso) + ': ' + resumo(dia)}
                      className="grid size-4 place-items-center"
                    >
                      <span
                        className="size-[13px] rounded-[3px] transition-transform"
                        style={{
                          background: dia.treinos
                            ? NIVEIS[nivel(dia.minutos, dia.treinos) - 1]
                            : 'var(--color-surface-2)',
                          outline: sel?.iso === dia.iso ? '1.5px solid var(--color-ink-2)' : undefined,
                          outlineOffset: '1px',
                        }}
                      />
                    </button>
                  ),
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="mt-3 flex items-center gap-1.5 text-[10px] text-ink-3">
        <span>menos</span>
        <span className="size-[10px] rounded-[2px]" style={{ background: 'var(--color-surface-2)' }} />
        {NIVEIS.map((cor) => (
          <span key={cor} className="size-[10px] rounded-[2px]" style={{ background: cor }} />
        ))}
        <span>mais</span>
        <span className="ml-auto">{total ? 'por minutos treinados no dia' : 'nada registrado ainda'}</span>
      </div>
    </Card>
  )
}
