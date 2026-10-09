import { useLanguages } from '../core/hooks'
import { href } from '../router'
import { Logo } from '../components/Logo'

export function Welcome() {
  const { data: languages, error } = useLanguages()
  return (
    <main className="welcome">
      <div className="welcome-inner">
        <Logo large />
        <p className="motto">Track what you know. Learn what you don't.</p>
        <p className="welcome-sub">Hangi dilde ilerlemek istiyorsun?</p>
        {error && <p className="error">Diller yüklenemedi: {error}</p>}
        <div className="lang-grid">
          {languages?.map((l) =>
            l.active ? (
              <a key={l.id} className="lang-card" href={href(l.id)}>
                <span className="lang-code">{l.id.toUpperCase()}</span>
                <span className="lang-name">{l.name}</span>
                <span className="lang-go" aria-hidden="true">
                  →
                </span>
              </a>
            ) : (
              <div key={l.id} className="lang-card is-disabled" aria-disabled="true">
                <span className="lang-code">{l.id.toUpperCase()}</span>
                <span className="lang-name">{l.nativeName}</span>
                <span className="soon">Yakında</span>
              </div>
            ),
          )}
        </div>
      </div>
    </main>
  )
}
