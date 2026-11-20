import { useId, useRef } from 'react'
import {
  ChevronDown,
  CloudRain,
  Footprints,
  Frame,
  House,
  MessageCircle,
  Smile,
  Umbrella,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'
import './reflection.css'
import './composition.css'

export type FigureDescription = {
  size: 'unspecified' | 'small' | 'medium' | 'large'
  position: 'unspecified' | 'top-left' | 'top-center' | 'top-right' | 'middle-left' | 'center' | 'middle-right' | 'bottom-left' | 'bottom-center' | 'bottom-right'
}

export type SceneDescription = {
  expression: 'unspecified' | 'smiling' | 'neutral' | 'sad'
  posture: 'unspecified' | 'upright' | 'hunched' | 'moving' | 'small'
  umbrella: 'unspecified' | 'covering' | 'partial' | 'broken' | 'none'
  rain: 'unspecified' | 'light' | 'moderate' | 'heavy' | 'personal'
  extras: string[]
  figure?: FigureDescription
}

export const initialScene: SceneDescription = {
  expression: 'unspecified',
  posture: 'unspecified',
  umbrella: 'unspecified',
  rain: 'unspecified',
  extras: [],
  figure: { size: 'unspecified', position: 'unspecified' },
}

export default initialScene

export type ReflectionCardsProps = {
  scene: SceneDescription
  onChange: (scene: SceneDescription) => void
  hints?: { rain?: string; umbrella?: boolean }
}

type Cue = { heading: string; sentence: string; question: string }

type Lens = Cue & {
  key: string
  label: string
  icon: LucideIcon
  confirmed: boolean
}

const expressionCues: Record<SceneDescription['expression'], Cue> = {
  unspecified: {
    heading: 'The face of the story',
    sentence: 'Reflection cue: a smile or neutral face can suggest positive outlook or resilience; a frown invites exploring stress or sadness.',
    question: 'Which expression did you draw?',
  },
  smiling: {
    heading: 'A positive outlook',
    sentence: 'May represent a positive outlook or resilience in the face of the rain.',
    question: 'What does this smile mean in your story?',
  },
  neutral: {
    heading: 'Steady through the rain',
    sentence: 'May represent a steady, positive outlook or quiet resilience.',
    question: 'What does this neutral face mean to you?',
  },
  sad: {
    heading: 'Room for harder feelings',
    sentence: 'Reflection cue: a frowning or sad face invites exploring stress or sadness in the story.',
    question: 'What is this character feeling?',
  },
}

const postureCues: Record<SceneDescription['posture'], Cue> = {
  unspecified: {
    heading: 'How the figure stands',
    sentence: 'Reflection cue: an upright stance can suggest strength, a hunched stance stress or sadness, and a small figure vulnerability.',
    question: 'Which posture matches your drawing?',
  },
  upright: {
    heading: 'Strength in the stance',
    sentence: 'May represent inner strength or determination through a confident, upright stance.',
    question: 'What gives this figure steadiness?',
  },
  hunched: {
    heading: 'A moment to pause',
    sentence: 'Reflection cue: a hunched posture invites exploring stress or sadness in the story.',
    question: 'What might this character need?',
  },
  moving: {
    heading: 'A story in motion',
    sentence: 'Reflection cue: movement invites considering how the figure is meeting the rain.',
    question: 'Where is this figure going?',
  },
  small: {
    heading: 'A smaller presence',
    sentence: 'Reflection cue: a small figure invites exploring vulnerability within the scene.',
    question: 'What does the small scale mean to you?',
  },
}

const umbrellaCues: Record<SceneDescription['umbrella'], Cue> = {
  unspecified: {
    heading: 'Ways of finding shelter',
    sentence: 'Reflection cue: a covering umbrella can suggest coping or self-protection, a broken one exposure, and no umbrella a question of support.',
    question: 'What kind of umbrella did you draw?',
  },
  covering: {
    heading: 'A layer of protection',
    sentence: 'May represent coping or self-protection through a large, covering umbrella.',
    question: 'What does this shelter stand for?',
  },
  partial: {
    heading: 'Some room for shelter',
    sentence: 'Reflection cue: partial cover invites considering what offers protection and what remains exposed.',
    question: 'Would this figure want more cover?',
  },
  broken: {
    heading: 'When shelter gives way',
    sentence: 'Reflection cue: a broken umbrella invites exploring feeling exposed in the story.',
    question: 'What could help this character feel protected?',
  },
  none: {
    heading: 'Considering support',
    sentence: 'Reflection cue: no umbrella invites considering support, without assuming loneliness.',
    question: 'Does this character want shelter or prefer the rain?',
  },
}

const rainCues: Record<SceneDescription['rain'], Cue> = {
  unspecified: {
    heading: 'The weather around them',
    sentence: 'Reflection cue: light rain can suggest manageable challenges, heavy rain persistent strain, and rain only on the figure feeling personally burdened.',
    question: 'How much rain, and where did you place it?',
  },
  light: {
    heading: 'A gentler challenge',
    sentence: 'May represent manageable challenges through light rain.',
    question: 'How does this figure meet the light rain?',
  },
  moderate: {
    heading: 'Weather to move through',
    sentence: 'Reflection cue: moderate rain invites considering the challenges and shelter within the story.',
    question: 'What makes this weather manageable?',
  },
  heavy: {
    heading: 'A persistent downpour',
    sentence: 'May represent persistent strain through heavy rain.',
    question: 'What would soften this character’s weather?',
  },
  personal: {
    heading: 'Rain in one place',
    sentence: 'Reflection cue: rain falling only on the figure invites exploring feeling personally burdened in the story.',
    question: 'Why does the rain fall here in your drawing?',
  },
}

const extraChoices = [
  { value: 'puddles', label: 'Puddles / reflections' },
  { value: 'people', label: 'Other people / company' },
  { value: 'shelter', label: 'House, tree or shelter' },
  { value: 'none', label: 'None of these' },
]

const hasCompany = (extras: string[]) => extras.includes('people') || extras.includes('company')
const hasShelter = (extras: string[]) => ['shelter', 'house', 'tree'].some((extra) => extras.includes(extra))
const hasPuddles = (extras: string[]) => extras.includes('puddles') || extras.includes('reflections')

const figurePositions: { value: Exclude<FigureDescription['position'], 'unspecified'>; label: string; x: number; y: number }[] = [
  { value: 'top-left', label: 'Top left', x: 24, y: 30 },
  { value: 'top-center', label: 'Top center', x: 60, y: 30 },
  { value: 'top-right', label: 'Top right', x: 96, y: 30 },
  { value: 'middle-left', label: 'Middle left', x: 24, y: 75 },
  { value: 'center', label: 'Center', x: 60, y: 75 },
  { value: 'middle-right', label: 'Middle right', x: 96, y: 75 },
  { value: 'bottom-left', label: 'Bottom left', x: 24, y: 120 },
  { value: 'bottom-center', label: 'Bottom center', x: 60, y: 120 },
  { value: 'bottom-right', label: 'Bottom right', x: 96, y: 120 },
]

const getFigure = (scene: SceneDescription): FigureDescription => ({
  size: scene.figure?.size ?? 'unspecified',
  position: scene.figure?.position ?? 'unspecified',
})

function additionalCue(scene: SceneDescription): Cue {
  const meanings = [
    ...(hasPuddles(scene.extras) ? ['puddles or reflections: introspection'] : []),
    ...(hasCompany(scene.extras) ? ['company: connections'] : []),
    ...(hasShelter(scene.extras) ? ['a house, tree or shelter: security'] : []),
  ]
  if (meanings.length) return {
    heading: 'Details with a story',
    sentence: `May represent ${meanings.join('; ')}.`,
    question: 'Which detail matters most to you?',
  }
  if (scene.extras.includes('none')) return {
    heading: 'Keeping the scene simple',
    sentence: 'Reflection cue: leaving out these details keeps attention on the figure and weather, rather than implying missing support.',
    question: 'Is there any detail you would like to add?',
  }
  return {
    heading: 'The world around them',
    sentence: 'Reflection cue: puddles can suggest introspection, company connections, and a house, tree or shelter security.',
    question: 'Which details are actually in your drawing?',
  }
}

function figureCue(scene: SceneDescription): Cue {
  const figure = getFigure(scene)
  const position = figurePositions.find(({ value }) => value === figure.position)
  const hasSize = figure.size !== 'unspecified'
  return {
    heading: 'Their place on the page',
    sentence: hasSize && position
      ? `You described a ${figure.size} figure at the ${position.label.toLowerCase()} of the page. Size and position do not establish a personality trait or feeling.`
      : hasSize
        ? `You described a ${figure.size} figure. Its page position is not described yet; choose it separately to confirm this detail.`
        : position
          ? `You placed the figure at the ${position.label.toLowerCase()} of the page. Its size is not described yet; choose it separately to confirm this detail.`
          : 'Describe the figure’s size and position on the page. Neither is inferred from posture, other people, or drawing marks.',
    question: hasSize && position
      ? 'If you wish, what does this use of space mean in your story?'
      : 'Which size and page position match your drawing?',
  }
}

export function ReflectionCards({ scene, onChange, hints }: ReflectionCardsProps) {
  const id = useId()
  const editorRef = useRef<HTMLDetailsElement>(null)
  const figure = getFigure(scene)
  const selectedPosition = figurePositions.find(({ value }) => value === figure.position)
  const figureConfirmed = figure.size !== 'unspecified' && figure.position !== 'unspecified'
  const update = <K extends keyof SceneDescription>(key: K, value: SceneDescription[K]) => {
    onChange({ ...scene, [key]: value })
  }
  const confirmDetail = (key: string) => {
    const editor = editorRef.current
    if (!editor) return
    editor.open = true
    const selector = key === 'additional'
      ? 'input[type="checkbox"]'
      : key === 'figure' && figure.size !== 'unspecified' && figure.position === 'unspecified'
        ? 'input[data-scene-field="figure-position"]'
        : `[data-scene-field="${key === 'figure' ? 'figure-size' : key}"]`
    editor.querySelector<HTMLInputElement | HTMLSelectElement>(selector)?.focus()
  }
  const toggleExtra = (value: string, checked: boolean) => {
    if (value === 'none') {
      update('extras', checked ? ['none'] : [])
      return
    }
    const extras = scene.extras.filter((extra) => extra !== 'none' && extra !== value)
    update('extras', checked ? [...extras, value] : extras)
  }
  const lenses: Lens[] = [
    { key: 'expression', label: 'Expression', icon: Smile, confirmed: scene.expression !== 'unspecified', ...expressionCues[scene.expression] },
    { key: 'posture', label: 'Posture', icon: Footprints, confirmed: scene.posture !== 'unspecified', ...postureCues[scene.posture] },
    { key: 'umbrella', label: 'Umbrella / shelter', icon: Umbrella, confirmed: scene.umbrella !== 'unspecified', ...umbrellaCues[scene.umbrella] },
    { key: 'rain', label: 'The rain', icon: CloudRain, confirmed: scene.rain !== 'unspecified', ...rainCues[scene.rain] },
    { key: 'additional', label: 'Additional elements', icon: House, confirmed: scene.extras.length > 0, ...additionalCue(scene) },
    { key: 'figure', label: 'Figure / composition', icon: Frame, confirmed: figureConfirmed, ...figureCue(scene) },
  ]
  const confirmationCount = lenses.filter(({ confirmed }) => confirmed).length
  const rainHint = hints?.rain && ['light', 'moderate', 'heavy', 'none'].includes(hints.rain) ? hints.rain : null

  return (
    <section className="rm-report rm-reflections reflection-cards" aria-labelledby={`${id}-title`}>
      <header className="rm-section-header">
        <div>
          <span className="rm-kicker">Six ways to look a little closer</span>
          <h2 id={`${id}-title`}>Person · weather · shelter · scene</h2>
        </div>
        <span className="rm-section-motif" aria-hidden="true"><Umbrella size={25} strokeWidth={1.5} /></span>
      </header>
      <p className="rm-shared-caveat">These are optional reflection cues, not a diagnosis; only you can confirm what your drawing means.</p>
      <details className="rm-scene-editor" id={`${id}-editor`} ref={editorRef}>
        <summary>
          <span><MessageCircle size={16} aria-hidden="true" /> Describe your drawing</span>
          <span className="rm-summary-meta">{confirmationCount}/6 described <ChevronDown size={16} aria-hidden="true" /></span>
        </summary>
        <div className="rm-editor-body">
          <p id={`${id}-editor-help`} className="rm-editor-help">Choose what you drew to update the cues below. Faces and objects are not automatically recognised.</p>
          <div className="rm-scene-fields" aria-describedby={`${id}-editor-help`}>
            <label htmlFor={`${id}-expression`}>Expression
              <select id={`${id}-expression`} data-scene-field="expression" value={scene.expression} onChange={(event) => update('expression', event.target.value as SceneDescription['expression'])}>
                <option value="unspecified">Not described yet</option>
                <option value="smiling">Smiling</option>
                <option value="neutral">Neutral</option>
                <option value="sad">Frowning / sad</option>
              </select>
            </label>
            <label htmlFor={`${id}-posture`}>Posture
              <select id={`${id}-posture`} data-scene-field="posture" value={scene.posture} onChange={(event) => update('posture', event.target.value as SceneDescription['posture'])}>
                <option value="unspecified">Not described yet</option>
                <option value="upright">Upright / confident</option>
                <option value="hunched">Hunched / bent over</option>
                <option value="moving">Walking / moving</option>
                <option value="small">Small figure</option>
              </select>
            </label>
            <label htmlFor={`${id}-umbrella`}>Umbrella
              <select id={`${id}-umbrella`} data-scene-field="umbrella" value={scene.umbrella} onChange={(event) => update('umbrella', event.target.value as SceneDescription['umbrella'])}>
                <option value="unspecified">Not described yet</option>
                <option value="covering">Large / covering the figure</option>
                <option value="partial">Partial cover</option>
                <option value="broken">Broken umbrella</option>
                <option value="none">No umbrella</option>
              </select>
            </label>
            <label htmlFor={`${id}-rain`}>Rain
              <select id={`${id}-rain`} data-scene-field="rain" value={scene.rain} onChange={(event) => update('rain', event.target.value as SceneDescription['rain'])}>
                <option value="unspecified">Not described yet</option>
                <option value="light">Light rain</option>
                <option value="moderate">Moderate rain</option>
                <option value="heavy">Heavy rain</option>
                <option value="personal">Rain only on the figure</option>
              </select>
            </label>
          </div>
          <fieldset className="rm-extra-options">
            <legend>Additional details</legend>
            {extraChoices.map(({ value, label }) => (
              <label key={value}>
                <input type="checkbox" checked={scene.extras.includes(value)} onChange={(event) => toggleExtra(value, event.target.checked)} />
                <span>{label}</span>
              </label>
            ))}
          </fieldset>
          <fieldset className="rm-composition" aria-describedby={`${id}-figure-help`}>
            <legend>Figure / composition</legend>
            <p id={`${id}-figure-help`} className="rm-composition-help">Choose both size and position to describe this sixth detail. These choices are independent of posture and additional details.</p>
            <label className="rm-composition-size" htmlFor={`${id}-figure-size`}>Figure size on the page
              <select id={`${id}-figure-size`} data-scene-field="figure-size" value={figure.size} onChange={(event) => update('figure', { ...figure, size: event.target.value as FigureDescription['size'] })}>
                <option value="unspecified">Not described yet</option>
                <option value="small">Small</option>
                <option value="medium">Medium</option>
                <option value="large">Large</option>
              </select>
            </label>
            <div className="rm-composition-layout">
              <fieldset className="rm-position-options">
                <legend>Figure position on the page</legend>
                <div className="rm-page-picker">
                  {figurePositions.map(({ value, label }) => (
                    <label className="rm-position-choice" key={value}>
                      <input type="radio" id={`${id}-figure-${value}`} name={`${id}-figure-position`} data-scene-field="figure-position" value={value} checked={figure.position === value} onChange={() => update('figure', { ...figure, position: value })} />
                      <span>{label}</span>
                    </label>
                  ))}
                </div>
              </fieldset>
              <div className="rm-composition-preview">
                <svg viewBox="0 0 120 150" aria-hidden="true" className="rm-composition-page">
                  <rect x="1" y="1" width="118" height="148" rx="2" />
                  <path d="M42 2V148M78 2V148M2 52H118M2 98H118" />
                  {selectedPosition && <circle className="rm-composition-marker" data-figure-position={figure.position} cx={selectedPosition.x} cy={selectedPosition.y} r={figure.size === 'large' ? 9 : figure.size === 'medium' ? 6 : 4} />}
                </svg>
                <span>Page marker{!selectedPosition ? ': choose a position' : `: ${selectedPosition.label.toLowerCase()}`}</span>
                <small>Placement guide only, not a drawing measurement.</small>
              </div>
            </div>
            <p className="rm-composition-confirmed" role="status" aria-live="polite" aria-atomic="true">
              {figureConfirmed
                ? `Figure / composition confirmed: ${figure.size} size · ${selectedPosition?.label.toLowerCase()} position.`
                : `Figure / composition not confirmed: size ${figure.size === 'unspecified' ? 'not chosen' : figure.size}; position ${selectedPosition?.label.toLowerCase() ?? 'not chosen'}. Choose both to count this detail.`}
            </p>
            {figure.position !== 'unspecified' && <button type="button" className="rm-composition-clear" onClick={() => update('figure', { ...figure, position: 'unspecified' })}>Clear position</button>}
          </fieldset>
          {(rainHint || hints?.umbrella === true) && (
            <p className="rm-mark-hint"><strong>Unconfirmed mark hints:</strong> {rainHint ? `rain-mark estimate: ${rainHint}. ` : ''}{hints?.umbrella === true ? 'A broad mark might offer shelter. ' : ''}These do not select your answers.</p>
          )}
        </div>
      </details>
      <div className="rm-lens-grid">
        {lenses.map(({ key, label, icon: Icon, heading, sentence, question, confirmed }, index) => (
          <article className={`rm-lens rm-lens-${key}`} key={key}>
            <div className="rm-lens-top">
              <span className="rm-lens-icon" aria-hidden="true"><Icon size={22} strokeWidth={1.6} /></span>
              <span className="rm-lens-index" aria-hidden="true">0{index + 1}</span>
            </div>
            <div className="rm-lens-label">{heading}{!confirmed && <button type="button" className="rm-confirm-tag" aria-label={`Confirm detail: ${label}`} aria-controls={`${id}-editor`} onClick={() => confirmDetail(key)}>Confirm detail</button>}</div>
            <h3>{label}</h3>
            <p className="rm-lens-sentence">{sentence}</p>
            <p className="rm-lens-question">{question}</p>
          </article>
        ))}
      </div>
      <p className="rm-live-status" role="status" aria-live="polite" aria-atomic="true">{confirmationCount} of 6 scene details described. {confirmationCount ? 'Reflection cues updated from your choices.' : 'The six lenses show possibilities to explore; no scene details are confirmed yet.'}</p>
    </section>
  )
}
