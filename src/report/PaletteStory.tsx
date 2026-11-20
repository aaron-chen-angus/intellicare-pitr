import { useId, useMemo, useState } from 'react'
import { ChevronDown, Palette, PencilLine } from 'lucide-react'
import { describeColour, formatInkShare } from './colour'
import './reflection.css'

export type PaletteEntry = { color: string; share: number; strokes: number }
export type PaletteStoryProps = { entries: Array<PaletteEntry> }

export function PaletteStory({ entries }: PaletteStoryProps) {
  const id = useId()
  const [meanings, setMeanings] = useState<Record<string, string>>({})
  const colours = useMemo(() => {
    // Keep every supplied used colour, including tiny marks and fill-only colours.
    // Merge duplicates without truncating to a top-three or inventing palette colours.
    const merged = new Map<string, PaletteEntry>()
    entries.forEach((entry) => {
      const key = entry.color.trim().toLowerCase()
      const share = Number.isFinite(entry.share) ? Math.max(0, entry.share) : 0
      const strokes = Number.isFinite(entry.strokes) ? Math.max(0, Math.round(entry.strokes)) : 0
      const previous = merged.get(key)
      merged.set(key, {
        color: entry.color,
        share: (previous?.share ?? 0) + share,
        strokes: (previous?.strokes ?? 0) + strokes,
      })
    })
    return [...merged.entries()].map(([key, entry]) => ({ ...entry, key, ...describeColour(entry.color) }))
  }, [entries])
  const totalShare = colours.reduce((total, entry) => total + entry.share, 0)

  return (
    <section className="rm-report rm-palette palette-story" aria-labelledby={`${id}-title`}>
      <header className="rm-section-header">
        <div>
          <span className="rm-kicker">The colours you actually used</span>
          <h2 id={`${id}-title`}>Your palette, your meaning</h2>
        </div>
        <span className="rm-section-motif" aria-hidden="true"><Palette size={25} strokeWidth={1.5} /></span>
      </header>
      <p className="rm-section-intro">A colour story in design symbolism. Warm tones can suggest comfort; cool tones can feel soothing. Your own associations come first.</p>
      {colours.length ? (
        <>
          <div className="rm-palette-measure">
            <span>Estimated ink share</span>
            <span>{colours.length} used {colours.length === 1 ? 'colour' : 'colours'}</span>
          </div>
          {totalShare > 0 ? (
            <div className="rm-palette-bar" role="img" aria-label={`Estimated ink share by used colour: ${colours.map((entry) => `${entry.name} ${entry.color}, ${formatInkShare(entry.share)}`).join('; ')}. This measures colour use, not feelings.`}>
              {colours.map((entry) => (
                <span key={entry.key} className="rm-palette-segment" style={{ backgroundColor: entry.swatch, flexGrow: entry.share }} title={`${entry.name} ${entry.color}: ${formatInkShare(entry.share)} estimated ink share`} />
              ))}
            </div>
          ) : (
            <div className="rm-palette-unmeasured" aria-label="Used colours; ink shares are not measurable yet">
              {colours.map((entry) => <span key={entry.key} style={{ backgroundColor: entry.swatch }} title={`${entry.name} ${entry.color}`} />)}
            </div>
          )}
          <p className="rm-measure-note">Share estimates describe the ink, not psychological scores.{totalShare === 0 ? ' No measurable ink shares were supplied.' : ''}</p>
          <div className="rm-colour-list">
            {colours.map((entry, index) => (
              <article className="rm-colour-card" key={entry.key} style={{ backgroundColor: entry.tint }}>
                <div className="rm-colour-top">
                  <span className="rm-colour-swatch" style={{ backgroundColor: entry.swatch }} aria-hidden="true" />
                  <div className="rm-colour-heading">
                    <h3>{entry.name}</h3>
                    <span className="rm-colour-code">{entry.color}</span>
                  </div>
                  <strong className="rm-colour-share">{formatInkShare(entry.share)}<span>ink share</span></strong>
                </div>
                <p className="rm-colour-meaning">{entry.meaning}</p>
                <div className="rm-colour-meta"><span>{entry.temperature === 'neutral' ? 'Neutral tone' : `${entry.temperature === 'warm' ? 'Warm' : 'Cool'} tone`}</span><span>{entry.strokes.toLocaleString('en')} {entry.strokes === 1 ? 'stroke' : 'strokes'}</span></div>
                <details className="rm-personal-meaning">
                  <summary><span><PencilLine size={14} aria-hidden="true" /> {meanings[entry.key]?.trim() ? 'Your own meaning' : 'Add your own meaning'}</span><ChevronDown size={14} aria-hidden="true" /></summary>
                  <div className="rm-meaning-body">
                    <label htmlFor={`${id}-meaning-${index}`}>What does {entry.name.toLowerCase()} mean to you?</label>
                    <textarea id={`${id}-meaning-${index}`} rows={2} maxLength={240} value={meanings[entry.key] ?? ''} onChange={(event) => setMeanings((current) => ({ ...current, [entry.key]: event.target.value }))} placeholder="A memory, a place, or simply a colour you like…" />
                    <span className="rm-meaning-note">Optional · kept in this report while it is open</span>
                  </div>
                </details>
                {meanings[entry.key]?.trim() && <p className="rm-custom-meaning"><span>Your meaning:</span> {meanings[entry.key]}</p>}
              </article>
            ))}
          </div>
        </>
      ) : (
        <div className="rm-palette-empty"><Palette size={22} aria-hidden="true" /><p>No used colours were supplied yet. A palette story appears when there are colour marks to describe.</p></div>
      )}
    </section>
  )
}

export default PaletteStory
