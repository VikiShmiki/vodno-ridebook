import type { ReactNode } from 'react'

import { Icon, type IconName } from './Icon'

export function Card({
  title,
  icon,
  action,
  flush = false,
  children,
}: {
  title?: string
  icon?: IconName
  action?: ReactNode
  /** Drop the body padding, for cards whose content is a list or a table. */
  flush?: boolean
  children: ReactNode
}) {
  return (
    <section className="card">
      {(title || action) && (
        <header className="card-head">
          {title && (
            <h2>
              {icon && <Icon name={icon} size={15} />}
              {title}
            </h2>
          )}
          {action}
        </header>
      )}
      <div className={flush ? 'card-body flush' : 'card-body'}>{children}</div>
    </section>
  )
}

export function Stat({
  label,
  value,
  sub,
  icon,
  tone = 'accent',
}: {
  label: string
  value: ReactNode
  sub?: string
  icon: IconName
  tone?: 'accent' | 'ok' | 'warn' | 'danger' | 'neutral'
}) {
  return (
    <div className={`stat ${tone}`}>
      <div className="stat-top">
        <span className="label">{label}</span>
        <span className="glyph">
          <Icon name={icon} size={15} />
        </span>
      </div>
      <div className="value">{value}</div>
      {sub && <div className="sub">{sub}</div>}
    </div>
  )
}

export function RatingBar({ label, value }: { label: string; value: number | null }) {
  return (
    <div className="rating-row">
      <span className="name">{label}</span>
      <span className="bar">
        <span style={{ width: `${value === null ? 0 : (value / 5) * 100}%` }} />
      </span>
      <span className="num">{value === null ? '–' : value.toFixed(1)}</span>
    </div>
  )
}

export function Badge({
  tone = 'neutral',
  dot = false,
  children,
}: {
  tone?: 'neutral' | 'low' | 'medium' | 'high' | 'accent' | 'resolved'
  dot?: boolean
  children: ReactNode
}) {
  return (
    <span className={`badge ${tone}`}>
      {dot && <i className="dot-sm" />}
      {children}
    </span>
  )
}

/** Shimmering placeholders that hold the layout while a request is in flight. */
export function Skeleton({ lines = 3 }: { lines?: number }) {
  const widths = ['92%', '76%', '84%', '64%', '88%']
  return (
    <div className="skeleton-lines" aria-hidden="true">
      {Array.from({ length: lines }, (_, index) => (
        <div
          key={index}
          className="skeleton"
          style={{ height: 13, width: widths[index % widths.length] }}
        />
      ))}
    </div>
  )
}

export function SkeletonBlock({ height }: { height: number }) {
  return <div className="skeleton" style={{ height }} aria-hidden="true" />
}

export function EmptyState({ icon = 'inbox', children }: { icon?: IconName; children: ReactNode }) {
  return (
    <div className="empty-state">
      <span className="glyph">
        <Icon name={icon} size={19} />
      </span>
      <p>{children}</p>
    </div>
  )
}

export function ErrorNote({ message }: { message: string }) {
  return (
    <p className="note error" role="alert">
      <Icon name="alert" size={15} />
      <span>{message}</span>
    </p>
  )
}

export function SuccessNote({ message }: { message: string }) {
  return (
    <p className="note success" role="status">
      <Icon name="check" size={15} />
      <span>{message}</span>
    </p>
  )
}
