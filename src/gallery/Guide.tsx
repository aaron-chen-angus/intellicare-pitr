import { memo, useEffect, useState, type ReactNode } from 'react'
import { ChevronRight, X } from 'lucide-react'
import { Delvina } from './characters'

const reducedMotion = () => typeof window !== 'undefined' && window.matchMedia?.('(prefers-reduced-motion: reduce)').matches

/**
 * Miss Delvina See narrates each screen. Guidance only: she never interprets
 * the drawing. Text types in like a game dialogue; a tap shows it in full.
 */
function GuideInner({ lines, actions, compact = false, onDismiss, className = '' }: {
  lines: string[]
  actions?: ReactNode
  compact?: boolean
  onDismiss?: () => void
  className?: string
}) {
  const key = lines.join('\u241e')
  const [index, setIndex] = useState(0)
  const [shown, setShown] = useState(0)
  useEffect(() => { setIndex(0) }, [key])
  const line = lines[Math.min(index, lines.length - 1)] ?? ''

  useEffect(() => {
    if (reducedMotion()) { setShown(line.length); return }
    setShown(0)
    const timer = window.setInterval(() => {
      setShown((value) => {
        if (value >= line.length) { window.clearInterval(timer); return value }
        return value + 2
      })
    }, 18)
    return () => window.clearInterval(timer)
  }, [line])

  const typing = shown < line.length
  return (
    <section className={`guide ${compact ? 'guide-compact' : ''} ${className}`} aria-label="Guidance from Miss Delvina See, Art Therapist">
      <div className="guide-avatar"><Delvina crop={compact} /></div>
      <div className="guide-bubble" onClick={() => setShown(line.length)}>
        <div className="guide-name"><strong>Miss Delvina See</strong><span>Art Therapist</span></div>
        <p className="guide-text" aria-hidden="true">{line.slice(0, shown)}{typing && <span className="guide-caret" />}</p>
        <p className="guide-sr" aria-live="polite">{line}</p>
        {(actions || lines.length > 1) && (
          <div className="guide-actions">
            {actions}
            {lines.length > 1 && <button type="button" className="guide-next" onClick={(event) => { event.stopPropagation(); setIndex((value) => (value + 1) % lines.length) }}>{index + 1 < lines.length ? 'Next' : 'Start over'} <ChevronRight size={15} /></button>}
          </div>
        )}
        {onDismiss && <button type="button" className="guide-close" onClick={(event) => { event.stopPropagation(); onDismiss() }} aria-label="Hide Miss Delvina's tips"><X size={15} /></button>}
      </div>
    </section>
  )
}

export const Guide = memo(GuideInner)

/** Soft drifting clouds behind the welcome, waiting and report screens. */
export function Sky() {
  return <div className="sky" aria-hidden="true"><div className="cloud c1" /><div className="cloud c2" /><div className="cloud c3" /></div>
}
