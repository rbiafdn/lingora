import { memo, type CSSProperties } from 'react'

// Deterministic pseudo-random values (same layout on every render).
function rand(seed: number) {
  let s = seed
  return () => {
    s = (s * 16807) % 2147483647
    return (s - 1) / 2147483646
  }
}

const BUBBLES = (() => {
  const r = rand(7)
  return Array.from({ length: 14 }, () => {
    const size = r() < 0.7 ? 6 + r() * 16 : 24 + r() * 26
    const dur = 38 + r() * 40
    return {
      x: r() * 100,
      size,
      dur,
      delay: -r() * dur, // start mid-way so the screen is never empty
      sway: 10 + r() * 30,
    }
  })
})()

/** Fixed, decorative background: soft water bubbles rising slowly. */
export const StarField = memo(function StarField() {
  return (
    <div className="bubblefield" aria-hidden="true">
      {BUBBLES.map((b, i) => (
        <i
          key={i}
          style={
            {
              left: `${b.x}%`,
              width: b.size,
              height: b.size,
              animationDuration: `${b.dur}s, ${b.dur / 6}s`,
              animationDelay: `${b.delay}s, ${b.delay}s`,
              '--sway': `${b.sway}px`,
            } as CSSProperties
          }
        />
      ))}
    </div>
  )
})
