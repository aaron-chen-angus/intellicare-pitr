import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { PointerEvent as ReactPointerEvent } from 'react'
import { paintPaper } from '../canvas'
import { CANVAS_HEIGHT, CANVAS_WIDTH } from '../data'
import { secondsLabel, SUBJECTS, subjectOf } from '../process'
import type { DrawingSubject, FillOperation, StrokeRecord } from '../types'
import { pointOnPaper, rectangleBetween, selectBulkMarks } from './bulk-selection'
import type { LabelSnapshot, PaperPoint, SelectionRect } from './bulk-selection'
import './bulk-label.css'

export type BulkLabelEditorProps = {
  strokes: StrokeRecord[]
  fills: FillOperation[]
  base: number
  duration: number
  onRelabelMany?: (strokeIds: string[], fillIndices: number[], subject: DrawingSubject) => void
  onRestoreLabels?: (labels: LabelSnapshot) => void
}

type Drag = { pointerId: number; start: PaperPoint; target: SVGSVGElement }
type LatestBatch = { labels: LabelSnapshot; subject: DrawingSubject; fillKeys: Map<number, string> }
const fillKey = (fill: FillOperation) => JSON.stringify([fill.x, fill.y, fill.color, fill.tolerance, fill.t])

export default function BulkLabelEditor({ strokes, fills, base, duration, onRelabelMany, onRestoreLabels }: BulkLabelEditorProps) {
  const id = useId()
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dragRef = useRef<Drag | null>(null)
  const [region, setRegion] = useState<SelectionRect | null>(null)
  const [draft, setDraft] = useState<SelectionRect | null>(null)
  const [timeEnabled, setTimeEnabled] = useState(false)
  const [from, setFrom] = useState('0')
  const [to, setTo] = useState(String(duration))
  const [onlyUnlabelled, setOnlyUnlabelled] = useState(false)
  const [subject, setSubject] = useState<DrawingSubject>('person')
  const [coordinates, setCoordinates] = useState({ left: '0', top: '0', right: String(CANVAS_WIDTH), bottom: String(CANVAS_HEIGHT) })
  const [coordinateError, setCoordinateError] = useState('')
  const [message, setMessage] = useState('')
  const [latest, setLatest] = useState<LatestBatch | null>(null)
  const [showHighlights, setShowHighlights] = useState(true)
  const activeRegion = draft ?? region
  const timeValid = from.trim() !== '' && to.trim() !== '' && Number.isFinite(Number(from)) && Number.isFinite(Number(to)) && Number(from) >= 0 && Number(to) >= Number(from) && Number(to) <= duration
  const interval = timeEnabled ? { start: timeValid ? Number(from) : NaN, end: timeValid ? Number(to) : NaN } : null
  const selection = useMemo(() => selectBulkMarks(strokes, fills, { region: activeRegion, interval, base, onlyUnlabelled }), [strokes, fills, activeRegion, timeEnabled, from, to, timeValid, base, onlyUnlabelled])
  const selectedIds = useMemo(() => new Set(selection.strokeIds), [selection.strokeIds])
  const count = selection.strokeIds.length + selection.fillIndices.length
  const changedCount = strokes.filter((s) => selectedIds.has(s.id) && subjectOf(s) !== subject).length + selection.fillIndices.filter((i) => subjectOf(fills[i]) !== subject).length
  const undoSafe = latest !== null && latest.labels.strokes.every((saved) => strokes.some((s) => s.id === saved.id && subjectOf(s) === latest.subject)) && latest.labels.fills.every((saved) => fills[saved.index] && fillKey(fills[saved.index]) === latest.fillKeys.get(saved.index) && subjectOf(fills[saved.index]) === latest.subject)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    // Render at native dimensions; CSS alone scales the A4 preview. Labels never alter pixels.
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    paintPaper(canvas, strokes, '#fffdf8', undefined, fills)
  }, [strokes, fills])

  useEffect(() => () => {
    const drag = dragRef.current
    dragRef.current = null
    if (drag?.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId)
  }, [])

  function cancelDrag() {
    const drag = dragRef.current
    dragRef.current = null
    setDraft(null)
    if (drag?.target.hasPointerCapture(drag.pointerId)) drag.target.releasePointerCapture(drag.pointerId)
  }

  function commitRegion(next: SelectionRect) {
    setRegion(next)
    setCoordinates({ left: String(Math.round(next.x)), top: String(Math.round(next.y)), right: String(Math.round(next.x + next.width)), bottom: String(Math.round(next.y + next.height)) })
    setCoordinateError('')
    setMessage('')
  }

  function beginDrag(event: ReactPointerEvent<SVGSVGElement>) {
    if (!event.isPrimary || event.button !== 0 || dragRef.current) return
    event.preventDefault()
    const start = pointOnPaper(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())
    event.currentTarget.setPointerCapture(event.pointerId)
    dragRef.current = { pointerId: event.pointerId, start, target: event.currentTarget }
    setDraft(rectangleBetween(start, start))
    setMessage('')
  }

  function moveDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    setDraft(rectangleBetween(drag.start, pointOnPaper(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())))
  }

  function finishDrag(event: ReactPointerEvent<SVGSVGElement>) {
    const drag = dragRef.current
    if (!drag || event.pointerId !== drag.pointerId) return
    const next = rectangleBetween(drag.start, pointOnPaper(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()))
    dragRef.current = null
    setDraft(null)
    if (next.width >= 1 && next.height >= 1) commitRegion(next)
    else setMessage('Drag a rectangle, or use the numeric region coordinates below.')
    if (event.currentTarget.hasPointerCapture(event.pointerId)) event.currentTarget.releasePointerCapture(event.pointerId)
  }

  function applyCoordinates() {
    const values = Object.values(coordinates).map(Number)
    const [left, top, right, bottom] = values
    if (Object.values(coordinates).some((value) => !value.trim()) || !values.every(Number.isFinite) || left < 0 || top < 0 || right > CANVAS_WIDTH || bottom > CANVAS_HEIGHT || right <= left || bottom <= top) {
      setCoordinateError('Use 0–1240 for horizontal coordinates and 0–1754 for vertical coordinates. Right must exceed left; bottom must exceed top.')
      return
    }
    cancelDrag()
    commitRegion({ x: left, y: top, width: right - left, height: bottom - top })
  }

  function applyLabels() {
    if (!onRelabelMany || !count || !changedCount || (timeEnabled && !timeValid) || dragRef.current) return
    const labels: LabelSnapshot = {
      strokes: strokes.filter((s) => selectedIds.has(s.id)).map((s) => ({ id: s.id, subject: subjectOf(s) })),
      fills: selection.fillIndices.map((index) => ({ index, subject: subjectOf(fills[index]) })),
    }
    const fillKeys = new Map(selection.fillIndices.map((index) => [index, fillKey(fills[index])]))
    onRelabelMany([...selection.strokeIds], [...selection.fillIndices], subject)
    setLatest({ labels, subject, fillKeys })
    setMessage(`Applied ${SUBJECTS.find((item) => item.id === subject)?.label} to ${selection.strokeIds.length} whole strokes and ${selection.fillIndices.length} fills. Original marks and timestamps are unchanged.`)
  }

  function undoLabels() {
    if (!latest || !onRestoreLabels || !undoSafe) return
    onRestoreLabels(latest.labels)
    setLatest(null)
    setMessage('Restored the labels from immediately before your latest batch.')
  }

  return <section className="bulk-label-editor" aria-labelledby={`${id}-heading`}>
    <div className="bulk-heading"><span className="section-kicker">Your labels, in one gesture</span><h3 id={`${id}-heading`}>Label a part of your drawing</h3><p>Draw a rectangle, choose a time interval, or combine both. Then apply one label to the selected marks together.</p></div>
    <div className="bulk-workspace">
      <figure className="bulk-artwork">
        <div className="bulk-paper proportionalA4" style={{ aspectRatio: `${CANVAS_WIDTH} / ${CANVAS_HEIGHT}` }}>
          <canvas ref={canvasRef} role="img" aria-label="Your original drawing, unchanged, with all retained strokes and fills" />
          <svg className="bulk-overlay" viewBox={`0 0 ${CANVAS_WIDTH} ${CANVAS_HEIGHT}`} preserveAspectRatio="none" role="group" aria-label="Drag a rectangle to select whole drawing marks" aria-describedby={`${id}-region-help`} tabIndex={0} onPointerDown={beginDrag} onPointerMove={moveDrag} onPointerUp={finishDrag} onPointerCancel={cancelDrag} onLostPointerCapture={() => { if (dragRef.current) cancelDrag() }} onKeyDown={(event) => { if (event.key === 'Escape') { cancelDrag(); setRegion(null); setMessage('Region cleared. An enabled time interval still selects marks.'); event.preventDefault() } }}>
            {showHighlights && <g aria-hidden="true" pointerEvents="none">
              {strokes.filter((s) => selectedIds.has(s.id)).map((s) => s.points.length === 1 ? <circle key={s.id} cx={s.points[0].x} cy={s.points[0].y} r={Math.max(9, s.size)} className="bulk-stroke-highlight" /> : <polyline key={s.id} points={s.points.map((p) => `${p.x},${p.y}`).join(' ')} fill="none" className="bulk-stroke-highlight" strokeWidth={Math.max(10, s.size + 6)} />)}
              {selection.fillIndices.map((index) => <g key={index} className="bulk-fill-highlight" transform={`translate(${fills[index].x}, ${fills[index].y})`}><circle r="18" /><path d="M -24 0 H 24 M 0 -24 V 24" /><title>Selected fill {index + 1}: seed point only</title></g>)}
            </g>}
            {activeRegion && <g aria-hidden="true" pointerEvents="none"><rect {...activeRegion} className="bulk-region-halo" /><rect {...activeRegion} className="bulk-region-outline" /></g>}
          </svg>
        </div>
        <figcaption id={`${id}-region-help`}>Drag on the original drawing. Crossing strokes are selected <strong>in full</strong>, with brush-width padding—not cut into pieces. Fill crosses indicate <strong>seed points only</strong>, not the full flooded area. Escape clears the region.</figcaption>
        <label className="bulk-check"><input type="checkbox" checked={showHighlights} onChange={(event) => setShowHighlights(event.target.checked)} />Show selection highlights <span>(toggle off to see original pixels)</span></label>
      </figure>
      <div className="bulk-controls">
        <fieldset><legend>1 · Choose your marks</legend>
          <div className="bulk-button-row"><button type="button" onClick={() => { cancelDrag(); commitRegion({ x: 0, y: 0, width: CANVAS_WIDTH, height: CANVAS_HEIGHT }) }}>Select whole drawing</button><button type="button" disabled={!region && !draft} onClick={() => { cancelDrag(); setRegion(null); setMessage('Region cleared. An enabled time interval still selects marks.') }}>Clear region</button></div>
          <p className="bulk-help">{activeRegion ? `Region: ${Math.round(activeRegion.x)}, ${Math.round(activeRegion.y)} → ${Math.round(activeRegion.x + activeRegion.width)}, ${Math.round(activeRegion.y + activeRegion.height)}.` : 'No region. Enable a time interval to select across the whole drawing, or draw a rectangle.'} {activeRegion && timeEnabled ? 'Both filters apply: region AND time.' : ''}</p>
          <details className="bulk-coordinate-details"><summary>Set rectangle without dragging</summary>
            <div className="bulk-number-grid">{(['left', 'top', 'right', 'bottom'] as const).map((edge) => <label key={edge}>{edge[0].toUpperCase() + edge.slice(1)}<input type="number" min="0" max={edge === 'left' || edge === 'right' ? CANVAS_WIDTH : CANVAS_HEIGHT} step="1" value={coordinates[edge]} onChange={(event) => setCoordinates((current) => ({ ...current, [edge]: event.target.value }))} aria-invalid={Boolean(coordinateError)} aria-describedby={coordinateError ? `${id}-coordinate-error` : undefined} /></label>)}</div>
            <button type="button" onClick={applyCoordinates}>Use these coordinates</button>
            {coordinateError && <p id={`${id}-coordinate-error`} className="bulk-error" role="alert">{coordinateError}</p>}
          </details>
          <label className="bulk-check"><input type="checkbox" checked={timeEnabled} onChange={(event) => setTimeEnabled(event.target.checked)} />Filter by recorded time</label>
          {timeEnabled && <div className="bulk-time-sliders">
            <label>From {secondsLabel(Number(from) || 0)}<input type="range" aria-label="Selection start time" min="0" max={duration} step="0.1" value={Math.max(0, Math.min(duration, Number(from) || 0))} onChange={(event) => { const next = Number(event.target.value); setFrom(String(next)); if (!Number.isFinite(Number(to)) || next > Number(to)) setTo(String(next)) }} /></label>
            <label>Until {secondsLabel(Number(to) || 0)}<input type="range" aria-label="Selection end time" min="0" max={duration} step="0.1" value={Math.max(0, Math.min(duration, Number(to) || 0))} onChange={(event) => { const next = Number(event.target.value); setTo(String(next)); if (!Number.isFinite(Number(from)) || next < Number(from)) setFrom(String(next)) }} /></label>
          </div>}
          <div className="bulk-number-grid"><label>Start (seconds)<input type="number" min="0" max={duration} step="0.1" value={from} disabled={!timeEnabled} onChange={(event) => setFrom(event.target.value)} aria-invalid={timeEnabled && !timeValid} aria-describedby={`${id}-time-help`} /></label><label>End (seconds)<input type="number" min="0" max={duration} step="0.1" value={to} disabled={!timeEnabled} onChange={(event) => setTo(event.target.value)} aria-invalid={timeEnabled && !timeValid} aria-describedby={`${id}-time-help`} /></label></div>
          <p className="bulk-help" id={`${id}-time-help`}>Seconds from the recorded session start; end may be up to {duration.toFixed(1)} s ({secondsLabel(duration)}). A stroke is selected if its start–end overlaps the inclusive interval.</p>
          {timeEnabled && !timeValid && <p className="bulk-error" role="alert">Enter a valid interval: 0 ≤ start ≤ end ≤ {duration.toFixed(1)} seconds.</p>}
          {timeEnabled && selection.untimestampedFills > 0 && <p className="bulk-time-note">{selection.untimestampedFills} fills without timestamps are excluded while the time filter is on. Turn it off to select them by seed point.</p>}
          <label className="bulk-check"><input type="checkbox" checked={onlyUnlabelled} onChange={(event) => setOnlyUnlabelled(event.target.checked)} />Only currently unlabelled marks</label>
        </fieldset>
        <div className="bulk-selection-summary" role="status" aria-live="polite" aria-atomic="true"><strong>{selection.strokeIds.length} strokes + {selection.fillIndices.length} fills</strong><span>{selection.timeSpan ? `Recorded span: ${secondsLabel(selection.timeSpan.start)}–${secondsLabel(selection.timeSpan.end)} (${selection.timeSpan.start.toFixed(1)}–${selection.timeSpan.end.toFixed(1)} s)` : count ? 'Time unavailable for the selected fills.' : 'Nothing selected yet.'}</span>{selection.timeSpan && !timeEnabled && selection.fillIndices.some((i) => !Number.isFinite(fills[i].t)) && <span>Span excludes selected fills without timestamps.</span>}</div>
        <fieldset><legend>2 · Apply your label</legend>
          <label className="bulk-label-choice">Selected marks belong to<select aria-label="Selected marks belong to" value={subject} onChange={(event) => setSubject(event.target.value as DrawingSubject)}>{SUBJECTS.map((item) => <option key={item.id} value={item.id}>{item.id === 'unlabelled' ? 'Unlabelled / reset' : item.label}</option>)}</select></label>
          <button type="button" className="bulk-apply" disabled={!onRelabelMany || !count || !changedCount || Boolean(draft) || (timeEnabled && !timeValid)} onClick={applyLabels}>Apply label to {count} marks</button>
          {count > 0 && changedCount === 0 && <p className="bulk-help">These marks already have the chosen label.</p>}
          <button type="button" disabled={!onRestoreLabels || !latest || !undoSafe} onClick={undoLabels}>Undo latest label batch</button>
          {!onRelabelMany && <p className="bulk-help">Batch saving is not connected. You can preview selections; use Advanced detail to edit individual labels.</p>}
          {onRelabelMany && !onRestoreLabels && <p className="bulk-help">Batch undo is not connected. Individual corrections remain available in Advanced detail.</p>}
          {latest && !undoSafe && <p className="bulk-help">The latest batch has since changed. Undo is unavailable to avoid overwriting newer edits.</p>}
        </fieldset>
        <p className="bulk-message" role="status" aria-live="polite">{message}</p>
        <p className="bulk-help">You choose the element names; this is not AI recognition. Labels never modify drawing points, original pixels, or recorded times. Retained erase strokes may also be selected.</p>
      </div>
    </div>
  </section>
}
