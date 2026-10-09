export function Logo({ large }: { large?: boolean }) {
  return (
    <span className={`logo${large ? ' logo-large' : ''}`}>
      <svg viewBox="0 0 32 32" aria-hidden="true">
        <rect width="32" height="32" rx="8" fill="var(--accent)" />
        <path d="M10 8v16h12" stroke="#fff" strokeWidth="3.2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
      <span className="logo-word">LINGORA</span>
    </span>
  )
}
