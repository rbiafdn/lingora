const base = import.meta.env.BASE_URL

/** Lingora logo: full wordmark, or just the "L" mark on narrow screens. */
export function Logo({ large }: { large?: boolean }) {
  return (
    <span className={`logo${large ? ' logo-large' : ''}`}>
      <img className="logo-full" src={`${base}logo.png`} alt="Lingora" draggable={false} />
      {!large && <img className="logo-mark" src={`${base}logo-mark.png`} alt="Lingora" draggable={false} />}
    </span>
  )
}
