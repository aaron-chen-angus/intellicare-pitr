import { useEffect, useMemo, useRef, useState } from 'react'
import { Clock3, Pause, Play, Umbrella, UserRound, CloudRain, Trees, Pencil } from 'lucide-react'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../data'
import { paintPaper } from '../canvas'
import { processMetrics, secondsLabel, SUBJECTS, subjectOf } from '../process'
import type { DrawingSubject, FillOperation, StrokeRecord } from '../types'
import BulkLabelEditor from './BulkLabelEditor'
import type { LabelSnapshot } from './bulk-selection'
import ProcessGuidance from './ProcessGuidance'
import './process.css'

const ICONS = { person: UserRound, umbrella: Umbrella, rain: CloudRain, scene: Trees, unlabelled: Pencil }

function ReplayFrame({ strokes, fills, cutoff, base, fillColor = '#fffdf8', label }: { strokes: StrokeRecord[]; fills: FillOperation[]; cutoff: number; base: number; fillColor?: string; label: string }) {
  const ref = useRef<HTMLCanvasElement>(null)
  useEffect(() => {
    const canvas = ref.current
    if (!canvas) return
    const ratio = 248 / CANVAS_WIDTH
    canvas.width = 248; canvas.height = Math.round(CANVAS_HEIGHT * ratio)
    const threshold = base + cutoff * 1000
    const partial = strokes.filter((s) => s.start <= threshold).map((stroke) => {
      const points = stroke.points.filter((p) => p.t <= threshold).map((p) => ({ ...p, x: p.x * ratio, y: p.y * ratio }))
      return { ...stroke, size: stroke.size * ratio, points }
    }).filter((s) => s.points.length)
    const operations = fills.filter((f) => f.t !== undefined && f.t <= threshold).map((f) => ({ ...f, x: f.x * ratio, y: f.y * ratio }))
    paintPaper(canvas, partial, fillColor, undefined, operations)
  }, [strokes, fills, cutoff, base, fillColor])
  return <canvas ref={ref} role="img" aria-label={label} />
}

export default function ProcessStory({ strokes, fills, startTime, timeUsedSeconds, undoCount, onRelabel, onRelabelFill, onRelabelMany, onRestoreLabels }: {
  strokes: StrokeRecord[]; fills: FillOperation[]; startTime: number; timeUsedSeconds: number; undoCount: number
  onRelabel: (id: string, subject: DrawingSubject) => void
  onRelabelFill: (index: number, subject: DrawingSubject) => void
  onRelabelMany?: (strokeIds: string[], fillIndices: number[], subject: DrawingSubject) => void
  onRestoreLabels?: (labels: LabelSnapshot) => void
}) {
  const metrics = useMemo(() => processMetrics(strokes, fills, startTime, timeUsedSeconds), [strokes, fills, startTime, timeUsedSeconds])
  const [cursor, setCursor] = useState(metrics.duration)
  const [playing, setPlaying] = useState(false)
  useEffect(() => {
    if (!playing) return
    const timer = window.setInterval(() => setCursor((time) => {
      const next = time + metrics.duration / 48
      if (next >= metrics.duration) { setPlaying(false); return metrics.duration }
      return next
    }), 250)
    return () => window.clearInterval(timer)
  }, [playing, metrics.duration])
  const labelled = metrics.groups.filter((g) => g.id !== 'unlabelled' && g.first !== null).sort((a, b) => a.first! - b.first!)
  const order = labelled.length ? labelled.map((g) => `${g.label} ${secondsLabel(g.first!)}`).join(' → ') : 'Select parts of your drawing below to label the person / umbrella / rain sequence.'
  return (
    <section className="paper-card process-story" aria-labelledby="process-heading">
      <div className="section-kicker">Your recorded process</div>
      <h2 id="process-heading">Your process, mark by mark</h2>
      <p className="process-intro">{order}</p>
      <div className="process-stats">
        <div><Clock3 size={16} /><strong>{secondsLabel(metrics.duration)}</strong><span>session elapsed</span></div>
        <div><Pencil size={16} /><strong>{strokes.filter((s) => s.tool !== 'eraser').length}</strong><span>retained strokes</span></div>
        <div><strong>{secondsLabel(metrics.activeSeconds)}</strong><span>pen-down time</span></div>
        <div><strong>{undoCount} / {strokes.filter((s) => s.tool === 'eraser').length}</strong><span>undos / erase strokes</span></div>
      </div>
      <div className="process-replay">
        <div className="replay-paper"><ReplayFrame strokes={strokes} fills={fills} base={metrics.base} cutoff={cursor} label={`Drawing replay at ${secondsLabel(cursor)}`} /></div>
        <div className="replay-controls">
          <button className="small-button" aria-label={playing ? 'Pause drawing replay' : 'Play drawing replay'} onClick={() => { if (cursor >= metrics.duration) setCursor(0); setPlaying(!playing) }}>{playing ? <Pause size={16} /> : <Play size={16} />}{playing ? 'Pause' : 'Replay'}</button>
          <label>At {secondsLabel(cursor)}<input type="range" min="0" max={metrics.duration} step="0.1" value={cursor} aria-label="Drawing replay time" onChange={(e) => { setPlaying(false); setCursor(Number(e.target.value)) }} /></label>
          <p>Scrub to see what appeared when. Playback is sped up; timestamps are real.</p>
          <p>Longest gap between retained strokes: <strong>{secondsLabel(metrics.longestPause)}</strong>. A pause has no automatic psychological meaning.</p>
        </div>
      </div>
      <div className="scene-lanes" aria-label="Drawing elements over time">
        <div className="lane-axis"><span>0:00</span><span>{secondsLabel(metrics.duration / 2)}</span><span>{secondsLabel(metrics.duration)}</span></div>
        {metrics.groups.map((group) => {
          const Icon = ICONS[group.id]
          return <div className="scene-lane" key={group.id}>
            <div className="lane-name"><Icon size={16} /><strong>{group.label}</strong></div>
            <div className="lane-track">{group.marks.map((stroke) => <button key={stroke.id} className="lane-mark" style={{ left: `${metrics.elapsed(stroke.start) / metrics.duration * 100}%`, width: `${Math.max(.7, (stroke.end - stroke.start) / 1000 / metrics.duration * 100)}%`, background: group.color }} title={`${group.label}: ${secondsLabel(metrics.elapsed(stroke.start))}–${secondsLabel(metrics.elapsed(stroke.end))}`} aria-label={`${group.label} stroke at ${secondsLabel(metrics.elapsed(stroke.start))}`} onClick={() => { setPlaying(false); setCursor(metrics.elapsed(stroke.end)) }} />)}{group.fills.map((fill, i) => <span key={`fill-${i}`} className="lane-fill" style={{ left: `${metrics.elapsed(fill.t!) / metrics.duration * 100}%`, background: group.color }} title={`Fill at ${secondsLabel(metrics.elapsed(fill.t!))}`} />)}</div>
            <span className="lane-times">{group.first === null ? 'Not labelled' : `${secondsLabel(group.first)}–${secondsLabel(group.last!)}`}</span>
          </div>
        })}
      </div>
      <p className="process-footnote">Element names are your labels, not AI object recognition. Times cover retained strokes, not erased/undone history. {fills.some((f) => f.t === undefined) ? 'Older fills lack timestamps and cannot be placed in the replay.' : ''}</p>
      <ProcessGuidance strokes={strokes} fills={fills} startTime={metrics.base} />
      <BulkLabelEditor strokes={strokes} fills={fills} base={metrics.base} duration={metrics.duration} onRelabelMany={onRelabelMany} onRestoreLabels={onRestoreLabels} />
      <details className="stroke-labels"><summary>Advanced detail · individual labels ({strokes.length} strokes, {fills.length} fills)</summary>
        <p>Match the small mark to the drawing. Choose what it belongs to; the timeline updates immediately.</p>
        <div className="stroke-label-list">{metrics.sorted.map((stroke, i) => <div className="stroke-label-row" key={stroke.id}>
          <button className="stroke-mini" title="Show this point in the replay" onClick={() => { setPlaying(false); setCursor(metrics.elapsed(stroke.end)) }} aria-label={`Replay stroke ${i + 1}`}><svg viewBox="0 0 1240 1754" aria-hidden="true"><polyline points={stroke.points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" stroke={stroke.tool === 'eraser' ? '#b55742' : stroke.color} strokeWidth={Math.max(20, stroke.size)} strokeLinecap="round" /></svg></button>
          <span><strong>#{i + 1}</strong> {secondsLabel(metrics.elapsed(stroke.start))}<small>{stroke.tool}</small></span>
          <select aria-label={`Element label for stroke ${i + 1}`} value={subjectOf(stroke)} onChange={(e) => onRelabel(stroke.id, e.target.value as DrawingSubject)}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select>
        </div>)}{fills.map((fill, i) => <div className="stroke-label-row" key={`fill-${i}`}><span className="stroke-mini" style={{ background: fill.color }} /><span>Fill {i + 1}<small>{fill.t ? secondsLabel(metrics.elapsed(fill.t)) : 'time unavailable'}</small></span><select aria-label={`Element label for fill ${i + 1}`} value={subjectOf(fill)} onChange={(e) => onRelabelFill(i, e.target.value as DrawingSubject)}>{SUBJECTS.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}</select></div>)}</div>
      </details>
    </section>
  )
}
