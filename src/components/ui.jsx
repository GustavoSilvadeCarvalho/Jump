import { useEffect } from 'react'

export function Card({ children, className = '', ...props }) {
  return (
    <div className={`rounded-2xl border border-line bg-surface-1 ${className}`} {...props}>
      {children}
    </div>
  )
}

export function SectionTitle({ children, action }) {
  return (
    <div className="mb-3 flex items-end justify-between gap-4">
      <h2 className="text-sm font-semibold tracking-wide text-ink-2 uppercase">{children}</h2>
      {action}
    </div>
  )
}

export function Button({ variant = 'primary', className = '', ...props }) {
  const base =
    'inline-flex items-center justify-center gap-2 rounded-xl px-4 py-3 text-sm font-semibold transition focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent disabled:cursor-not-allowed disabled:opacity-40 sm:py-2.5'
  const variants = {
    primary: 'bg-accent text-surface-0 hover:brightness-110 active:brightness-95',
    ghost: 'border border-line bg-surface-2 text-ink hover:border-ink-3',
    quiet: 'text-ink-2 hover:text-ink',
    danger: 'text-[#e66767] hover:bg-[#e66767]/10',
  }
  return <button className={`${base} ${variants[variant]} ${className}`} {...props} />
}

export function Field({ label, hint, children, className = '' }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1.5 block text-xs font-medium text-ink-2">{label}</span>
      {children}
      {hint && <span className="mt-1 block text-xs text-ink-3">{hint}</span>}
    </label>
  )
}

const controlBase =
  'w-full rounded-xl border border-line bg-surface-2 px-3 py-3 text-base text-ink placeholder:text-ink-3 outline-none transition focus:border-accent sm:py-2.5 sm:text-sm'

export function Input({ className = '', ...props }) {
  return <input className={`${controlBase} ${className}`} {...props} />
}

export function Textarea({ className = '', ...props }) {
  return <textarea className={`${controlBase} resize-y ${className}`} {...props} />
}

export function Select({ className = '', children, ...props }) {
  return (
    <select className={`${controlBase} cursor-pointer ${className}`} {...props}>
      {children}
    </select>
  )
}

export function Badge({ color, children }) {
  return (
    <span
      className="inline-flex items-center gap-1.5 rounded-full border px-2.5 py-1 text-xs font-medium"
      style={{ color, borderColor: `color-mix(in oklab, ${color} 35%, transparent)`, background: `color-mix(in oklab, ${color} 12%, transparent)` }}
    >
      <span className="size-1.5 rounded-full" style={{ background: color }} aria-hidden="true" />
      {children}
    </span>
  )
}

export function Stat({ label, value, unit, sub, tone }) {
  return (
    <Card className="p-4">
      <div className="text-xs font-medium text-ink-2">{label}</div>
      <div className="mt-2 flex items-baseline gap-1">
        <span className="tnum text-3xl leading-none font-semibold" style={tone ? { color: tone } : undefined}>
          {value}
        </span>
        {unit && <span className="text-sm text-ink-3">{unit}</span>}
      </div>
      {sub && <div className="mt-1.5 text-xs text-ink-3">{sub}</div>}
    </Card>
  )
}

export function EmptyState({ title, children, action }) {
  return (
    <div className="rounded-2xl border border-dashed border-line px-6 py-12 text-center">
      <p className="text-sm font-medium text-ink">{title}</p>
      {children && <p className="mx-auto mt-1.5 max-w-sm text-sm text-ink-3">{children}</p>}
      {action && <div className="mt-5">{action}</div>}
    </div>
  )
}

/** Barra de ação colada no rodapé do modal — no celular o formulário é longo demais
 * pra deixar o botão de salvar no fim do scroll. */
export function FormActions({ children }) {
  return (
    <div className="sticky bottom-0 -mx-5 -mb-5 flex justify-end gap-2 border-t border-line bg-surface-1 px-5 py-4 pb-[max(1rem,env(safe-area-inset-bottom))]">
      {children}
    </div>
  )
}

export function Modal({ open, onClose, title, children, wide = false }) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => e.key === 'Escape' && onClose()
    document.addEventListener('keydown', onKey)
    document.body.style.overflow = 'hidden'
    return () => {
      document.removeEventListener('keydown', onKey)
      document.body.style.overflow = ''
    }
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-end justify-center sm:items-center">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
        aria-hidden="true"
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={`relative max-h-[92vh] w-full overflow-y-auto rounded-t-3xl border border-line bg-surface-1 sm:rounded-3xl ${wide ? 'sm:max-w-2xl' : 'sm:max-w-lg'}`}
      >
        <div className="sticky top-0 z-10 flex items-center justify-between border-b border-line bg-surface-1 px-5 py-4">
          <h2 className="text-base font-semibold">{title}</h2>
          <button
            onClick={onClose}
            aria-label="Fechar"
            className="rounded-lg p-1.5 text-ink-3 transition hover:bg-surface-2 hover:text-ink"
          >
            <svg viewBox="0 0 20 20" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.7">
              <path d="M5 5l10 10M15 5L5 15" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <div className="px-5 py-5">{children}</div>
      </div>
    </div>
  )
}
