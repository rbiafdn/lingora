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
    const sMin = wide ? 50 : 32
    const margin = Math.max(8, u * 0.015)
    // Floating offsets lie in [-FLOAT, 0], so two orbs drift apart by at most FLOAT.
    const need = g + FLOAT
    // Tall screens: keep the categories well away from the centre cluster.
    const needFixed = wide ? need : need + g * 2.5
    const needCat = wide ? need : need + 4
    for (let s = sMax; s >= sMin; s -= 2) {
      const label = clamp(s * 0.13, 11, 16)
      // Label pill width (phones get a little extra room for the longest names).
      const lw = label * (wide ? 6.4 : 7.2)
      const hw = Math.max(s, lw) / 2
      const hh = (s + label * 1.9 + 6) / 2
      const rx = W / 2 - hw - margin
      // The ellipse may be shorter above the centre than below it.
      const ryTop = center.y - hh - margin - FLOAT
      const ryBot = H - center.y - hh - margin
      if (rx <= 0 || ryTop <= 0 || ryBot <= 0) continue
      // Each orb is its bubble (circle) plus the label pill underneath it.
      const lh = label * 1.9
      const clear = (a: Box[], b: Box[], min: number) => a.every((x) => b.every((y) => gap(x, y) >= min))
      const fits = (slots: Pt[]) => {
        const shapes = slots.map((p): Box[] => [
          { x: p.x, y: p.y - hh + s / 2, hw: s / 2, hh: s / 2, round: s / 2 },
          { x: p.x, y: p.y + hh - lh / 2, hw: lw / 2, hh: lh / 2 },
        ])
        for (let i = 0; i < shapes.length; i++) {
          if (!clear(shapes[i], fixed, needFixed)) return false
          for (let j = i + 1; j < shapes.length; j++)
            if (!clear(shapes[i], shapes[j], needCat)) return false
        }
        return true
      }
      // Wide screens: an ellipse. Tall screens: scattered rows below the centre
      // cluster, starting as high as they fit.
      let slots: Pt[] | undefined
      if (wide) {
        const e = ellipseSlots(n, center, rx, ryTop, ryBot)
        if (fits(e)) slots = e
      } else
        for (let start = 0; start < H * 0.7 && !slots; start += 8) {
          const c = scatterSlots(n, W, H, hw, hh, margin, start)
          if (fits(c)) slots = c
        }
      if (slots)
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
    const hw = Math.max(s, label * (wide ? 6.4 : 7.2)) / 2
    const hh = (s + label * 1.9 + 6) / 2
    const slots = wide
      ? ellipseSlots(
          n,
          center,
          Math.max(1, W / 2 - hw - margin),
          Math.max(1, center.y - hh - margin - FLOAT),
          Math.max(1, H - center.y - hh - margin),
        )
      : scatterSlots(n, W, H, hw, hh, margin, center.y + clusterBottom + g + hh)
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

  // The centre cluster sits at the top of the page. Tall screens: try a few
  // heights just below that and keep the one with the most room for the orbs.
  const lo = clusterTop + g
  const hi = Math.max(lo, H - clusterBottom - g * 1.5)
  const preferred = lo
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

/**
 * Tall screens: rows of 3 and 2 orbs alternating (a loose honeycomb) from
 * `start` down to the bottom, nudged a little so it looks scattered.
 */
function scatterSlots(n: number, W: number, H: number, hw: number, hh: number, margin: number, start = 0): Pt[] {
  const rows: number[] = []
  for (let left = n, i = 0; left > 0; i++) {
    const k = Math.min(left, i % 2 ? 2 : 3)
    rows.push(k)
    left -= k
  }
  const top = Math.max(start, hh + margin + FLOAT)
  const bottom = H - hh - margin
  const x3 = [hw + margin, W / 2, W - hw - margin]
  const x2 = [(x3[0] + x3[1]) / 2, (x3[1] + x3[2]) / 2]
  const NUDGE = [-0.1, 0.07, -0.05, 0.09, -0.07, 0.05, 0.1, -0.09, 0.06, -0.06]
  const out: Pt[] = []
  rows.forEach((k, r) => {
    const y = rows.length < 2 ? (top + bottom) / 2 : top + ((bottom - top) * r) / (rows.length - 1)
    const xs = k === 3 ? x3 : k === 2 ? x2 : [W / 2]
    const step = rows.length < 2 ? 0 : (bottom - top) / (rows.length - 1)
    for (const x of xs) {
      // Nudge inner rows only, so the top and bottom edges stay inside the screen.
      const ny = r > 0 && r < rows.length - 1 ? NUDGE[out.length % NUDGE.length] * step : 0
      out.push({ x, y: y + ny })
    }
  })
  return out
}
