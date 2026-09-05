import { CATEGORIES, CATEGORY_KEYS, LIBRARY } from '../lib/data'
import { Card, SectionTitle } from './ui'

export default function Library() {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Biblioteca</h1>
        <p className="mt-1 text-sm text-ink-3">
          Exercícios prontos por categoria — todos aparecem no seletor ao montar um treino.
        </p>
      </div>

      {CATEGORY_KEYS.filter((key) => LIBRARY[key].length).map((key) => {
        const cat = CATEGORIES[key]
        return (
          <section key={key}>
            <SectionTitle>
              <span className="inline-flex items-center gap-2">
                <span className="size-2 rounded-full" style={{ background: cat.color }} aria-hidden="true" />
                {cat.label}
                <span className="font-normal text-ink-3 normal-case">— {cat.desc}</span>
              </span>
            </SectionTitle>
            <div className="grid gap-2 sm:grid-cols-2">
              {LIBRARY[key].map((ex) => (
                <Card key={ex.name} className="px-4 py-3">
                  <div className="text-sm font-medium text-ink">{ex.name}</div>
                  <div className="mt-0.5 text-xs text-ink-3">{ex.hint}</div>
                </Card>
              ))}
            </div>
          </section>
        )
      })}
    </div>
  )
}
