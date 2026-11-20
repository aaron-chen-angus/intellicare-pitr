import { distance } from './engine'
import type { DrawingSubject, FillOperation, StrokeRecord } from './types'

export const SUBJECTS: Array<{ id: DrawingSubject; label: string; color: string }> = [
  { id: 'person', label: 'Person', color: '#5d78aa' },
  { id: 'umbrella', label: 'Umbrella', color: '#258778' },
  { id: 'rain', label: 'Rain', color: '#9470b3' },
  { id: 'scene', label: 'Other elements', color: '#c78045' },
  { id: 'unlabelled', label: 'Unlabelled', color: '#77818b' },
]
export const subjectOf = (stroke: { subject?: DrawingSubject }) => SUBJECTS.some((item) => item.id === stroke.subject) ? stroke.subject! : 'unlabelled'
export const secondsLabel = (seconds: number) => {
  const whole = Math.max(0, Math.floor(seconds))
  return `${Math.floor(whole / 60)}:${String(whole % 60).padStart(2, '0')}`
}

export const paletteUsage = (strokes: StrokeRecord[]) => {
  const weights = new Map<string, { weight: number; strokes: number }>()
  for (const stroke of strokes) {
    if (stroke.tool === 'eraser' || !stroke.points.length) continue
    const length = stroke.points.slice(1).reduce((sum, point, i) => sum + distance(point, stroke.points[i]), 0)
    const alpha = stroke.tool === 'watercolour' ? .3 : stroke.tool === 'highlighter' ? .24 : stroke.opacity / 100
    const weight = Math.max(stroke.size, length) * stroke.size * alpha
    const color = stroke.color.toLowerCase()
    const previous = weights.get(color) ?? { weight: 0, strokes: 0 }
    weights.set(color, { weight: previous.weight + weight, strokes: previous.strokes + 1 })
  }
  const total = Array.from(weights.values()).reduce((sum, item) => sum + item.weight, 0)
  return Array.from(weights.entries()).map(([color, item]) => ({ color, share: total ? item.weight / total * 100 : 0, strokes: item.strokes })).sort((a, b) => b.share - a.share)
}

export const processMetrics = (strokes: StrokeRecord[], fills: FillOperation[], startTime: number, timeUsedSeconds: number) => {
  const sorted = [...strokes].sort((a, b) => a.start - b.start)
  const base = startTime || sorted[0]?.start || Date.now()
  const elapsed = (time: number) => Math.max(0, (time - base) / 1000)
  const duration = Math.max(1, timeUsedSeconds, ...sorted.map((s) => elapsed(s.end)), ...fills.filter((f) => f.t).map((f) => elapsed(f.t!)))
  const groups = SUBJECTS.map((subject) => {
    const marks = sorted.filter((s) => subjectOf(s) === subject.id && s.tool !== 'eraser')
    const filled = fills.filter((f) => subjectOf(f) === subject.id && typeof f.t === 'number')
    const times = [...marks.flatMap((s) => [elapsed(s.start), elapsed(s.end)]), ...filled.map((f) => elapsed(f.t!))]
    return { ...subject, marks, fills: filled, first: times.length ? Math.min(...times) : null, last: times.length ? Math.max(...times) : null }
  })
  const activeSeconds = sorted.reduce((sum, s) => sum + Math.max(0, s.end - s.start) / 1000, 0)
  let longestPause = sorted.length ? elapsed(sorted[0].start) : duration
  let lastEnd = base
  for (const stroke of sorted) {
    longestPause = Math.max(longestPause, (stroke.start - lastEnd) / 1000)
    lastEnd = Math.max(lastEnd, stroke.end)
  }
  return { sorted, base, duration, groups, elapsed, activeSeconds, longestPause }
}
