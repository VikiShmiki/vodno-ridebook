import type { ReactNode } from 'react'

export function Card({
  title,
  action,
  children,
}: {
  title?: string
  action?: ReactNode
  children: ReactNode
}) {
  return (
    <section className="card">
      {(title || action) && (
        <div className="spread" style={{ marginBottom: '0.6rem' }}>
          {title && <h2>{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  )
}

export function Stat({ label, value, sub }: { label: string; value: ReactNode; sub?: string }) {
  return (
    <div className="card stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function RatingBar({ label, value }: { label: string; value: number | null }) {
  const percent = value === null ? 0 : (value / 5) * 100
  return (
    <div className="rating-row">
      <span className="muted">{label}</span>
      <span className="bar">
        <span style={{ width: `${percent}%` }} />
      </span>
      <span>{value === null ? '–' : value.toFixed(1)}</span>
    </div>
  )
}

export function Loading({ what }: { what: string }) {
  return <p className="empty">Loading {what}…</p>
}

export function ErrorNote({ message }: { message: string }) {
  return <p className="error">Could not load data: {message}</p>
}

export function Empty({ children }: { children: ReactNode }) {
  return <p className="empty">{children}</p>
}
