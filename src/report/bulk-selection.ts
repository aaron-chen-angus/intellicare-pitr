import type { DrawingSubject, FillOperation, StrokeRecord } from '../types'

export type PaperPoint = { x: number; y: number }
export type SelectionRect = { x: number; y: number; width: number; height: number }
export type TimeInterval = { start: number; end: number }
export type LabelSnapshot = {
  strokes: Array<{ id: string; subject: DrawingSubject }>
  fills: Array<{ index: number; subject: DrawingSubject }>
}

const PAPER_WIDTH = 1240
const PAPER_HEIGHT = 1754
const clamp = (n: number, max: number) => Math.min(max, Math.max(0, n))

/** Map CSS/client coordinates to original paper coordinates, including touch drags. */
export function pointOnPaper(clientX: number, clientY: number, bounds: { left: number; top: number; width: number; height: number }): PaperPoint {
  return {
    x: clamp((clientX - bounds.left) / Math.max(1, bounds.width) * PAPER_WIDTH, PAPER_WIDTH),
    y: clamp((clientY - bounds.top) / Math.max(1, bounds.height) * PAPER_HEIGHT, PAPER_HEIGHT),
  }
}

export function rectangleBetween(a: PaperPoint, b: PaperPoint): SelectionRect {
  return { x: Math.min(a.x, b.x), y: Math.min(a.y, b.y), width: Math.abs(a.x - b.x), height: Math.abs(a.y - b.y) }
}

export function pointInRectangle(p: PaperPoint, r: SelectionRect): boolean {
  return p.x >= r.x && p.x <= r.x + r.width && p.y >= r.y && p.y <= r.y + r.height
}

function pointSegmentDistanceSquared(p: PaperPoint, a: PaperPoint, b: PaperPoint): number {
  const dx = b.x - a.x, dy = b.y - a.y
  const length = dx * dx + dy * dy
  const t = length ? Math.max(0, Math.min(1, ((p.x - a.x) * dx + (p.y - a.y) * dy) / length)) : 0
  return (p.x - a.x - t * dx) ** 2 + (p.y - a.y - t * dy) ** 2
}

function pointRectangleDistanceSquared(p: PaperPoint, r: SelectionRect): number {
  const dx = Math.max(r.x - p.x, 0, p.x - r.x - r.width)
  const dy = Math.max(r.y - p.y, 0, p.y - r.y - r.height)
  return dx * dx + dy * dy
}

/** Exact segment-vs-rectangle intersection, then round brush-padding distance.
 * A crossing segment is selected even when neither endpoint is inside.
 * A stroke's bounding box alone is never considered a hit.
 */
export function segmentIntersectsRectangle(a: PaperPoint, b: PaperPoint, r: SelectionRect, padding = 0): boolean {
  let lo = 0, hi = 1
  const dx = b.x - a.x, dy = b.y - a.y
  const ps = [-dx, dx, -dy, dy]
  const qs = [a.x - r.x, r.x + r.width - a.x, a.y - r.y, r.y + r.height - a.y]
  let crossing = true
  for (let i = 0; i < 4; i++) {
    if (ps[i] === 0) { if (qs[i] < 0) { crossing = false; break } }
    else {
      const t = qs[i] / ps[i]
      if (ps[i] < 0) lo = Math.max(lo, t)
      else hi = Math.min(hi, t)
      if (lo > hi) { crossing = false; break }
    }
  }
  if (crossing) return true
  const corners = [
    { x: r.x, y: r.y }, { x: r.x + r.width, y: r.y },
    { x: r.x, y: r.y + r.height }, { x: r.x + r.width, y: r.y + r.height },
  ]
  const distance = Math.min(pointRectangleDistanceSquared(a, r), pointRectangleDistanceSquared(b, r), ...corners.map((p) => pointSegmentDistanceSquared(p, a, b)))
  return distance <= Math.max(0, padding) ** 2
}

/** Nominal round brush radius follows the existing renderer's pressure/tool width.
 * Diffuse shadow/glow is not treated as additional selectable ink.
 */
export function strokeBrushPadding(stroke: StrokeRecord, index: number): number {
  const p = stroke.points[index]
  if (!p) return Math.max(.5, stroke.size / 2)
  let width = stroke.size * (.55 + p.pressure * .9)
  if (stroke.points.length === 1) return Math.max(1, width / 2) + width / 2
  const previous = stroke.points[Math.max(0, index - 1)]
  const dx = p.x - previous.x, dy = p.y - previous.y
  if (stroke.tool === 'calligraphy') width *= .5 + Math.abs(Math.sin(Math.atan2(dy, dx)))
  if (stroke.tool === 'airbrush') width *= 1.25
  if (stroke.tool === 'watercolour') width *= 1.35
  if (stroke.tool === 'crayon') width *= 1.08
  const speed = Math.max(.1, Math.hypot(dx, dy) / Math.max(1, p.t - previous.t))
  width *= Math.max(.72, Math.min(1.12, 1.12 - speed * .12))
  return Math.max(1, width) / 2
}

export function strokeIntersectsRectangle(stroke: StrokeRecord, r: SelectionRect): boolean {
  if (!stroke.points.length) return false
  if (stroke.points.length === 1) return segmentIntersectsRectangle(stroke.points[0], stroke.points[0], r, strokeBrushPadding(stroke, 0))
  for (let i = 1; i < stroke.points.length; i++) {
    if (segmentIntersectsRectangle(stroke.points[i - 1], stroke.points[i], r, strokeBrushPadding(stroke, i))) return true
  }
  return false
}

export function overlapsTime(start: number, end: number, interval: TimeInterval, base: number): boolean {
  if (![start, end, interval.start, interval.end, base].every(Number.isFinite) || interval.start > interval.end) return false
  return Math.max(start, end) >= base + interval.start * 1000 && Math.min(start, end) <= base + interval.end * 1000
}

/** No region and no time filter means no implicit selection; use an explicit full-page region for all. */
export function selectBulkMarks(strokes: readonly StrokeRecord[], fills: readonly FillOperation[], options: {
  region: SelectionRect | null; interval: TimeInterval | null; base: number; onlyUnlabelled?: boolean
}): { strokeIds: string[]; fillIndices: number[]; timeSpan: TimeInterval | null; untimestampedFills: number } {
  const { region, interval, base, onlyUnlabelled } = options
  const enabled = Boolean(region || interval)
  const unlabelled = (item: { subject?: DrawingSubject }) => !onlyUnlabelled || !item.subject || item.subject === 'unlabelled'
  const chosen = strokes.filter((s) => enabled && unlabelled(s) && (!region || strokeIntersectsRectangle(s, region)) && (!interval || overlapsTime(s.start, s.end, interval, base)))
  const fillIndices = fills.flatMap((f, index) => enabled && unlabelled(f) && (!region || pointInRectangle(f, region)) && (!interval || (typeof f.t === 'number' && overlapsTime(f.t, f.t, interval, base))) ? [index] : [])
  const times = [...chosen.flatMap((s) => [s.start, s.end]), ...fillIndices.flatMap((index) => Number.isFinite(fills[index].t) ? [fills[index].t!] : [])].filter(Number.isFinite)
  return {
    strokeIds: chosen.map((s) => s.id), fillIndices,
    timeSpan: times.length ? { start: Math.max(0, (Math.min(...times) - base) / 1000), end: Math.max(0, (Math.max(...times) - base) / 1000) } : null,
    untimestampedFills: fills.filter((f) => !Number.isFinite(f.t)).length,
  }
}
