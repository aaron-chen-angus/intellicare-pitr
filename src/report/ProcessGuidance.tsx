import { useMemo } from 'react'
import type { FillOperation, StrokeRecord } from '../types'
import { processInsights } from './process-insights'
import './process-guidance.css'

export default function ProcessGuidance({ strokes, fills, startTime }: { strokes: StrokeRecord[]; fills: FillOperation[]; startTime: number }) {
  const data = useMemo(() => processInsights(strokes, fills, startTime), [strokes, fills, startTime])
  const goToActivities = () => {
    const target = document.querySelector<HTMLElement>('.discovery-activities')
    target?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' })
    target?.querySelector<HTMLButtonElement>('button')?.focus({ preventScroll: true })
  }
  return <section className="process-guidance" aria-labelledby="process-guidance-heading">
    <div className="section-kicker">Recorded choices, not a psychological score</div>
    <h3 id="process-guidance-heading">What can this process tell you?</h3>
    <p className="pg-measure">{data.measure}</p>
    <div className="pg-share-bar" role="img" aria-label={data.totalSeconds ? data.groups.map((g) => `${g.label}: ${g.share.toFixed(1)}%`).join(', ') : 'No positive recorded pen-time to compare'}>
      {data.totalSeconds > 0 ? data.groups.filter((g) => g.share > 0).map((g) => <span key={g.id} style={{ width: `${g.share}%`, backgroundColor: g.color }} />) : <span className="pg-empty">No timed strokes</span>}
    </div>
    <ul className="pg-share-list">{data.groups.map((g) => <li key={g.id}><i style={{ backgroundColor: g.color }} aria-hidden="true" /><strong>{g.label}</strong><span>{data.totalSeconds ? `${Math.round(g.share)}%` : '—'}</span><small>{g.activeSeconds.toFixed(1)} s active · {g.count} strokes</small></li>)}</ul>
    <p className="pg-coverage">Labels cover <strong>{data.labelledCount}/{data.count} retained drawing strokes</strong>.{fills.length ? ` ${fills.length} fill operations have no measured duration.` : ''} Rounded percentages may not total exactly 100%.</p>
    {data.revisits && <p className="pg-returns"><strong>Returns after another subject:</strong> {data.revisits}. This can reflect detail work or revision—not a symptom.</p>}
    <div className="pg-guidance-cards">
      <article><span>01 · What it shows</span><p>{data.guidance.observation}</p></article>
      <article><span>02 · What to explore</span><p>{data.guidance.question}</p></article>
      <article><span>03 · One next step</span><p>{data.guidance.action}</p><button type="button" onClick={goToActivities}>Make my next-step plan</button></article>
    </div>
    <p className="pg-limit">More time on a subject can reflect complexity, drawing speed or artistic preference. It cannot establish stress, resilience or personality. Ask what the artist intended; use their chosen feelings and supports for next steps.</p>
  </section>
}
