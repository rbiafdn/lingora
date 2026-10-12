// Geometry for the orbit dashboard (all values in px).
//
// Static, tidy layout: the centre ring in the middle, the Kelimeler orb right
// above it with its CEFR level orbs in an arc (open side towards the ring), and
// the other categories evenly spaced on an ellipse around everything. Sizes are
// chosen so that nothing touches anything — even while the orbs gently float.

export interface Pt {
  x: number
  y: number
}

export interface OrbitGeometry {
  W: number
  H: number
  center: Pt
  ringR: number // centre ring radius
  wordsR: number // Kelimeler orb radius
  levelR: number // level orb radius
  words: Pt // Kelimeler orb centre
  levels: Pt[] // level orb centres (A1 … C2)
  catSize: number // category orb diameter
  catLabel: number // category label font size
  slots: Pt[] // category orb centres, clockwise from the top-right
}

/** How far orbs bob up and down while floating (px). Kept clear in the layout. */
export const FLOAT = 7

const LEVEL_SPREAD_DEG = 55 // level orbs hang below the ring, ±this many degrees
const ORBIT_START_DEG = 50
const ORBIT_END_DEG = 310

const clamp = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v))

interface Box {
  x: number
  y: number
  hw: number
  hh: number
  round?: number // radius for circles
}

/** Free space between two shapes (boxes or circles), negative = overlap. */
function gap(a: Box, b: Box) {
  if (a.round !== undefined && b.round !== undefined) return Math.hypot(a.x - b.x, a.y - b.y) - a.round - b.round
  if (a.round !== undefined || b.round !== undefined) {
    const c = a.round !== undefined ? a : b
    const box = a.round !== undefined ? b : a
    const ex = Math.max(Math.abs(c.x - box.x) - box.hw, 0)
    const ey = Math.max(Math.abs(c.y - box.y) - box.hh, 0)
    return Math.hypot(ex, ey) - c.round!
  }
  return Math.max(Math.abs(a.x - b.x) - a.hw - b.hw, Math.abs(a.y - b.y) - a.hh - b.hh)
}

export function computeGeometry(W: number, H: number, n: number): OrbitGeometry | null {
  if (W < 50 || H < 50) return null
  const wide = W >= H
  const u = wide ? H : W
  const k = wide
    ? { ring: 0.17, words: 0.062, level: 0.038, gap: 0.022 }
    : { ring: 0.19, words: 0.085, level: 0.048, gap: 0.024 }
  const ringR = k.ring * u
  const wordsR = k.words * u
  const levelR = k.level * u
  const g = k.gap * u
  const spread = (LEVEL_SPREAD_DEG * Math.PI) / 180
  const step = (2 * spread) / 5
  // Kelimeler sits on the ring's top edge like a badge (the ring line is at 0.88 r).
  const wordsDist = ringR * 0.88
  // Level orbs hang below the ring on an arc (A1 left … C2 right), each on a
  // short string; neighbours keep a gap.
  const levelDist = Math.max(ringR + levelR + g * 1.6, (2 * levelR + g * 1.2) / (2 * Math.sin(step / 2)))
  const clusterTop = wordsDist + wordsR
  const clusterBottom = levelDist + levelR
  const layoutAt = (cy: number): OrbitGeometry => {
    const center = { x: W / 2, y: cy }
    const words = { x: center.x, y: center.y - wordsDist }
    const levels = Array.from({ length: 6 }, (_, i) => {
      const a = -spread + step * i
      return {
        x: center.x + levelDist * Math.sin(a),
        y: center.y + levelDist * Math.cos(a),
      }
    })

    const fixed: Box[] = [
      { x: center.x, y: center.y, hw: ringR, hh: ringR, round: ringR },
      { x: words.x, y: words.y, hw: wordsR, hh: wordsR, round: wordsR },
      ...levels.map((p) => ({ ...p, hw: levelR, hh: levelR, round: levelR })),
    ]

    // Category orbs: largest size whose evenly spaced ellipse fits without touching.
    const sMax = wide ? Math.min(0.22 * H, 170) : Math.min(0.24 * W, 96)
    const sMin = wide ? 50 : 40
    const margin = Math.max(8, u * 0.015)
    // Floating offsets lie in [-FLOAT, 0], so two orbs drift apart by at most FLOAT.
    const need = g + FLOAT
    for (let s = sMax; s >= sMin; s -= 2) {
      const label = clamp(s * 0.13, 11, 16)
      const hw = Math.max(s, label * 6.4) / 2
      const hh = (s + label * 1.9 + 6) / 2
      const rx = W / 2 - hw - margin
      // Top and bottom halves may differ: the centre sits below the middle.
      const ryTop = center.y - hh - margin - FLOAT
      const ryBot = H - center.y - hh - margin
      if (rx <= 0 || ryTop <= 0 || ryBot <= 0) continue
      // Tall screens: two columns down the sides; wide screens: an ellipse.
      const slots = wide ? ellipseSlots(n, center, rx, ryTop, ryBot) : columnSlots(n, W, H, hw, hh, margin)
      // Each orb is its bubble (circle) plus the label pill underneath it.
      const lh = label * 1.9
      const shapes = slots.map((p): Box[] => [
        { x: p.x, y: p.y - hh + s / 2, hw: s / 2, hh: s / 2, round: s / 2 },
        { x: p.x, y: p.y + hh - lh / 2, hw: (label * 6.4) / 2, hh: lh / 2 },
      ])
      const clear = (a: Box[], b: Box[]) => a.every((x) => b.every((y) => gap(x, y) >= need))
      let ok = true
      for (let i = 0; i < shapes.length && ok; i++) {
        if (!clear(shapes[i], fixed)) ok = false
        for (let j = i + 1; j < shapes.length && ok; j++) if (!clear(shapes[i], shapes[j])) ok = false
      }
      if (ok)
        return {
          W,
          H,
          center,
          ringR,
          wordsR,
          levelR,
          words,
          levels,
          catSize: s,
          catLabel: label,
          slots,
        }
    }
    // Best effort on very small screens.
    const s = sMin
    const label = 11
    const hw = Math.max(s, label * 6.4) / 2
    const hh = (s + label * 1.9 + 6) / 2
    const slots = ellipseSlots(
      n,
      center,
      Math.max(1, W / 2 - hw - margin),
      Math.max(1, center.y - hh - margin - FLOAT),
      Math.max(1, H - center.y - hh - margin),
    )
    return {
      W,
      H,
      center,
      ringR,
      wordsR,
      levelR,
      words,
      levels,
      catSize: s,
      catLabel: label,
      slots,
    }
  }

  // Wide screens: a bit above the middle. Tall screens: try heights and keep the
  // one (not much below the middle) that leaves the most room for the side columns.
  const lo = clusterTop + g * 1.5
  const hi = Math.max(lo, H - clusterBottom - g * 1.5)
  const preferred = clamp(wide ? H * 0.45 : H * 0.48, lo, hi)
  let best = layoutAt(preferred)
  if (!wide)
    for (let y = lo; y <= Math.min(hi, preferred + H * 0.04); y += 6) {
      const c = layoutAt(y)
      if (
        c.catSize > best.catSize ||
        (c.catSize === best.catSize && Math.abs(y - preferred) < Math.abs(best.center.y - preferred))
      )
        best = c
    }
  return best
}

/** n points spaced evenly by distance along the ellipse arc (clockwise from top-right). */
function ellipseSlots(n: number, c: Pt, rx: number, ryTop: number, ryBot: number): Pt[] {
  const a0 = (ORBIT_START_DEG * Math.PI) / 180
  const a1 = (ORBIT_END_DEG * Math.PI) / 180
  const at = (a: number) => {
    const cos = Math.cos(a)
    return {
      x: c.x + rx * Math.sin(a),
      y: c.y - (cos > 0 ? ryTop : ryBot) * cos,
    }
  }
  if (n < 2) return [at(a0)]
  const STEPS = 720
  const len: number[] = [0]
  let prev = at(a0)
  for (let i = 1; i <= STEPS; i++) {
    const cur = at(a0 + ((a1 - a0) * i) / STEPS)
    len.push(len[i - 1] + Math.hypot(cur.x - prev.x, cur.y - prev.y))
    prev = cur
  }
  const total = len[STEPS]
  return Array.from({ length: n }, (_, i) => {
    const target = (total * i) / (n - 1)
    let j = 0
    while (j < STEPS && len[j] < target) j++
    return at(a0 + ((a1 - a0) * j) / STEPS)
  })
}

/** Tall screens: right column top→bottom, then left column bottom→top (clockwise). */
function columnSlots(n: number, W: number, H: number, hw: number, hh: number, margin: number): Pt[] {
  const right = Math.ceil(n / 2)
  const left = n - right
  const top = hh + margin + FLOAT
  const bottom = H - hh - margin
  const col = (count: number, x: number) =>
    Array.from({ length: count }, (_, i) => ({
      x,
      y: count < 2 ? (top + bottom) / 2 : top + ((bottom - top) * i) / (count - 1),
    }))
  return [...col(right, W - hw - margin), ...col(left, hw + margin).reverse()]
}
