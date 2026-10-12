import type { ReactNode } from 'react'

export function ProgressBar({ pct, label }: { pct: number; label?: string }) {
  return (
    <div
      className="progress"
      role="progressbar"
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={pct}
      aria-label={label}
    >
      <div className="progress-fill" style={{ width: `${pct}%` }} />
    </div>
  )
}

const fmt = (n: number) => n.toLocaleString('tr-TR')

/** Compact page title with "425 / 1.200" and a short bar. */
export function PageHead({
  title,
  progress,
  sub,
}: {
  title: ReactNode
  progress?: { known: number; total: number; pct: number }
  sub?: ReactNode
}) {
  return (
    <header className="page-head">
      <h1>{title}</h1>
      {progress && (
        <div className="page-progress">
          <span>
            {fmt(progress.known)} / {fmt(progress.total)}
          </span>
          <ProgressBar pct={progress.pct} />
        </div>
      )}
      {sub && <span className="muted page-sub">{sub}</span>}
    </header>
  )
}
