import { useEffect, useId, useMemo, useRef, useState } from 'react'
import type { CSSProperties } from 'react'
import { browserStorage } from '../storage'
import {
  FEELINGS, INTENSITIES, SUPPORTS, TRIGGERS, activityColours, activityPlan,
  activityProgress, activityStorageKey, createActivityOutcome, emptyActivityState,
  parseActivityState, reconcileActivityState, safeActivityTitle,
} from './activities'
import type { ActivityState, ActivityColour, FeelingId, Intensity, SupportId } from './activities'
import { exportActivityJSON, exportActivityPNG } from './activity-export'
import './activities.css'

export type DiscoveryActivitiesProps = { sessionId: string; colors: string[]; title?: string; onStateChange?: (sessionId: string, state: ActivityState) => void }

function FeelingCloud({ state }: { state: ActivityState }) {
  return <div className="da-cloud" aria-label="Your feeling word cloud">
    {state.feelings.length ? state.feelings.map((feeling) => <span key={feeling.id} className="da-cloud-word" style={{ '--da-word-size': `${[20, 29, 38][feeling.intensity - 1]}px` } as CSSProperties}>
      <span aria-hidden="true">{FEELINGS.find((item) => item.id === feeling.id)!.label}</span>
      <span className="da-sr-only">{feeling.id}: intensity {feeling.intensity} of 3, {INTENSITIES[feeling.intensity - 1].toLowerCase()}.</span>
    </span>) : <p>No feelings chosen yet. Your words will appear here.</p>}
  </div>
}
function ColourLinks({ state, colours }: { state: ActivityState; colours: ActivityColour[] }) {
  return <ul className="da-link-list">{state.feelings.map((feeling) => {
    const colour = colours.find((item) => item.value === state.links[feeling.id])
    return <li key={feeling.id}>{colour ? <><span className="da-swatch-dot" aria-hidden="true" style={{ backgroundColor: colour.value }} /><span>You linked <strong>{colour.name.toLowerCase()}/{colour.value}</strong> with <strong>{feeling.id}</strong>.{colour.source === 'personal' && <small>Personal palette, not a drawing colour.</small>}</span></> : <span>{FEELINGS.find((item) => item.id === feeling.id)!.label}: no colour linked yet.</span>}</li>
  })}</ul>
}
function SupportMap({ state }: { state: ActivityState }) {
  const supports = SUPPORTS.filter((support) => state.supports.includes(support.id))
  return <div className="da-support-map">
    <svg viewBox="0 0 300 140" className="da-umbrella" aria-hidden="true" focusable="false"><path d="M30 84 Q150 -48 270 84 Q240 57 210 84 Q180 57 150 84 Q120 57 90 84 Q60 57 30 84Z" /><path d="M150 84V112 Q150 139 124 121" className="da-umbrella-handle" /></svg>
    <p className="da-map-label">My available supports</p>
    {supports.length ? <ul className="da-support-nodes">{supports.map((support) => <li key={support.id}><small>{support.group}</small><strong>{support.label}</strong></li>)}</ul> : <p className="da-note">Choose a support you can actually use. Nothing is assumed to be available.</p>}
  </div>
}

/** Key the inner component so one session's reflection is never written into another session. */
export default function DiscoveryActivities(props: DiscoveryActivitiesProps) {
  return <SessionActivities key={props.sessionId} {...props} />
}
function SessionActivities({ sessionId, colors, title = 'My reflection keepsake', onStateChange }: DiscoveryActivitiesProps) {
  const id = useId()
  const storageKey = activityStorageKey(sessionId)
  const [state, setState] = useState<ActivityState>(() => {
    const restored = parseActivityState(browserStorage.getItem(storageKey))
    return reconcileActivityState(restored, activityColours(colors, restored.personalPalette))
  })
  const [step, setStep] = useState(0)
  const [activeFeeling, setActiveFeeling] = useState<FeelingId | null>(null)
  const [notice, setNotice] = useState('')
  const [saveFailed, setSaveFailed] = useState(false)
  const [confirmClear, setConfirmClear] = useState<'all' | 'feelings' | 'links' | 'supports' | null>(null)
  const [exporting, setExporting] = useState(false)
  const cancelRef = useRef<HTMLButtonElement>(null)
  const previewRef = useRef<HTMLElement>(null)
  const coloursKey = JSON.stringify(colors)
  const colours = useMemo(() => activityColours(colors, state.personalPalette), [coloursKey, state.personalPalette])
  const hasDrawingColours = activityColours(colors, false).length > 0
  const progress = activityProgress(state, colours)
  const plan = activityPlan(state)
  const chosenWord = state.feelings.some((feeling) => feeling.id === activeFeeling) ? activeFeeling : state.feelings[0]?.id ?? null
  const safeTitle = safeActivityTitle(title)
  const selectedSupports = SUPPORTS.filter((support) => state.supports.includes(support.id))
  useEffect(() => {
    setState((current) => {
      const next = reconcileActivityState(current, colours)
      return JSON.stringify(next) === JSON.stringify(current) ? current : next
    })
  }, [colours])
  useEffect(() => { setSaveFailed(!browserStorage.setItem(storageKey, JSON.stringify(state))) }, [state, storageKey])
  useEffect(() => { onStateChange?.(sessionId, state) }, [sessionId, state, onStateChange])
  useEffect(() => { if (confirmClear) cancelRef.current?.focus() }, [confirmClear])

  const toggleFeeling = (feelingId: FeelingId) => {
    if (!state.feelings.some((feeling) => feeling.id === feelingId) && state.feelings.length >= 6) { setNotice('You can choose up to six feelings. Remove one before adding another.'); return }
    setState((current) => {
      const exists = current.feelings.some((feeling) => feeling.id === feelingId)
      const links = { ...current.links }; if (exists) delete links[feelingId]
      return { ...current, feelings: exists ? current.feelings.filter((feeling) => feeling.id !== feelingId) : [...current.feelings, { id: feelingId, intensity: 1 }], links }
    })
    setNotice(`${FEELINGS.find((feeling) => feeling.id === feelingId)!.label} ${state.feelings.some((feeling) => feeling.id === feelingId) ? 'removed' : 'chosen at intensity 1; you can change it below'}.`)
  }
  const toggleSupport = (supportId: SupportId) => {
    if (!state.supports.includes(supportId) && state.supports.length >= 3) { setNotice('Choose up to three available supports. Remove one to choose another.'); return }
    setState((current) => {
      const supports = current.supports.includes(supportId) ? current.supports.filter((item) => item !== supportId) : [...current.supports, supportId]
      return { ...current, supports, ...(supports.includes(current.resource!) ? {} : { action: null, resource: null }) }
    })
    setNotice(`${SUPPORTS.find((support) => support.id === supportId)!.label} ${state.supports.includes(supportId) ? 'removed' : 'added as available'}.`)
  }
  const clearChoices = () => {
    setState((current) => confirmClear === 'all' ? emptyActivityState() : confirmClear === 'feelings' ? { ...current, feelings: [], links: {} } : confirmClear === 'links' ? { ...current, links: {}, personalPalette: false } : { ...current, supports: [], trigger: null, action: null, resource: null })
    if (confirmClear === 'all' || confirmClear === 'feelings') setActiveFeeling(null)
    setNotice('Chosen activity choices cleared. You can start again.'); setConfirmClear(null)
  }
  const download = async (format: 'png' | 'json') => {
    if (!progress.complete || exporting) return
    setExporting(true)
    try {
      const outcome = createActivityOutcome(state, colours, safeTitle)
      if (format === 'png') await exportActivityPNG(outcome); else exportActivityJSON(outcome)
      setNotice(`${format.toUpperCase()} download prepared from your choices. No drawing or account information is included.`)
    } catch (error) { setNotice(error instanceof Error ? error.message : 'Download did not finish. Try again or choose JSON.') }
    finally { setExporting(false) }
  }
  const stepNames = ['Feeling cloud', 'Colour connections', 'Support & next step']
  return <section className="discovery-activities" aria-labelledby={`${id}-title`}>
    <header className="da-header"><div><span className="da-kicker">A little discovery, led by you</span><h2 id={`${id}-title`}>Your feelings. Your colours. Your next step.</h2></div><span className="da-progress" aria-live="polite" aria-atomic="true">{progress.completed}/3 activities complete</span></header>
    <p>Make a few choices to create something you can use today. There are no right answers, personality scores, or required written answers.</p>
    <div className="da-progress-track" aria-hidden="true">{progress.steps.map((done, index) => <span key={index} className={done ? 'is-done' : ''} />)}</div>
    <nav className="da-navigation" aria-label="Revisit a discovery activity">{stepNames.map((name, index) => <button type="button" key={name} aria-current={step === index ? 'step' : undefined} onClick={() => { setStep(index); setConfirmClear(null) }}><span>{index + 1}</span>{name}<small>{progress.steps[index] ? 'Complete' : 'Not complete'}</small></button>)}</nav>
    <div className="da-live" role="status" aria-live="polite" aria-atomic="true">{notice || 'Your choices update the preview below.'}</div>
    {saveFailed ? <p className="da-note">Local storage is unavailable. Your choices still work while this page is open; download your completed outcome to keep it.</p> : <p className="da-note">These activity choices are saved on this browser for this session only, if storage is available. This does not restore the drawing or the whole report.</p>}

    <section className="da-workspace" aria-labelledby={`${id}-step-${step}`}>
      {step === 0 && <>
        <div className="da-step-heading"><h3 id={`${id}-step-0`}>1. Make your feeling cloud</h3><button className="da-quiet" type="button" onClick={() => setConfirmClear('feelings')} disabled={!state.feelings.length}>Clear feelings</button></div>
        <p>Choose 1–6 words that fit right now. Then choose how strongly you feel each one. Bigger words mean only the intensity <em>you</em> picked.</p>
        <fieldset><legend>Feelings · {state.feelings.length}/6 selected</legend><div className="da-choices">{FEELINGS.map((feeling) => <button type="button" key={feeling.id} aria-pressed={state.feelings.some((item) => item.id === feeling.id)} onClick={() => toggleFeeling(feeling.id)}>{feeling.label}</button>)}</div></fieldset>
        {state.feelings.length > 0 && <div className="da-intensities">{state.feelings.map((feeling) => <fieldset key={feeling.id}><legend>{FEELINGS.find((item) => item.id === feeling.id)!.label} · intensity</legend><div className="da-intensity-options">{INTENSITIES.map((label, index) => <label key={label}><input type="radio" name={`${id}-intensity-${feeling.id}`} value={index + 1} checked={feeling.intensity === index + 1} onChange={() => setState((current) => ({ ...current, feelings: current.feelings.map((item) => item.id === feeling.id ? { ...item, intensity: (index + 1) as Intensity } : item) }))} /><span>{index + 1} · {label}</span></label>)}</div></fieldset>)}</div>}
        <FeelingCloud state={state} />
      </>}
      {step === 1 && <>
        <div className="da-step-heading"><h3 id={`${id}-step-1`}>2. Connect each feeling to a colour</h3><button className="da-quiet" type="button" onClick={() => setConfirmClear('links')} disabled={!Object.keys(state.links).length && !state.personalPalette}>Clear colour links</button></div>
        <p>Pick a chosen feeling, then a swatch. These links express your personal meaning today—not a universal colour rule.</p>
        {!state.feelings.length ? <p>Choose at least one feeling in activity 1 to begin. <button type="button" className="da-quiet" onClick={() => setStep(0)}>Choose feelings</button></p> : <>
          <fieldset><legend>Which feeling are you linking?</legend><div className="da-choices">{state.feelings.map((feeling) => <button type="button" key={feeling.id} aria-pressed={chosenWord === feeling.id} onClick={() => setActiveFeeling(feeling.id)}>{FEELINGS.find((item) => item.id === feeling.id)!.label} {state.links[feeling.id] ? '· linked' : '· not linked'}</button>)}</div></fieldset>
          {!hasDrawingColours && <div className="da-palette-empty"><p>No usable ink colours were supplied for this drawing. You can choose an optional personal palette instead; those colours are <strong>not</strong> described as drawing colours.</p><label className="da-check"><input type="checkbox" checked={state.personalPalette} onChange={(event) => { if (!event.target.checked && Object.keys(state.links).length) { setConfirmClear('links'); return } const enabled = event.target.checked; setState((current) => ({ ...current, personalPalette: enabled, links: {} })); setNotice(enabled ? 'Optional personal palette enabled. These are not drawing colours.' : 'Optional personal palette disabled.') }} />Use the optional personal palette</label></div>}
          {colours.length > 0 && <fieldset><legend>{hasDrawingColours ? 'Colours actually used in your drawing' : 'Optional personal palette — not drawing colours'} · choose one for {chosenWord}</legend><div className="da-swatches">{colours.map((colour) => <button type="button" key={colour.value} aria-pressed={chosenWord !== null && state.links[chosenWord] === colour.value} onClick={() => { if (chosenWord) { setState((current) => ({ ...current, links: { ...current.links, [chosenWord]: colour.value } })); setNotice(`You linked ${colour.name.toLowerCase()}/${colour.value} with ${chosenWord}.`) } }}><span className="da-swatch" style={{ backgroundColor: colour.value }} aria-hidden="true" /><span>{colour.name}<small>{colour.value}</small></span></button>)}</div></fieldset>}
          <ColourLinks state={state} colours={colours} />
          <p className="da-note">{state.feelings.filter((feeling) => colours.some((colour) => colour.value === state.links[feeling.id])).length}/{state.feelings.length} feelings linked. A colour can be used more than once.</p>
        </>}
      </>}
      {step === 2 && <>
        <div className="da-step-heading"><h3 id={`${id}-step-2`}>3. Gather support & choose one small step</h3><button className="da-quiet" type="button" onClick={() => setConfirmClear('supports')} disabled={!state.supports.length && !state.trigger}>Clear support plan</button></div>
        <p>Choose 1–3 supports that are genuinely available to you. Selecting one means “I can use this.” Leave out anything unavailable, unsafe, or uncomfortable.</p>
        <fieldset><legend>Available to me · {state.supports.length}/3 selected</legend>{(['People', 'Places', 'Actions', 'Skills'] as const).map((group) => <div className="da-support-group" key={group}><h4>{group}</h4><div className="da-choices">{SUPPORTS.filter((support) => support.group === group).map((support) => <button type="button" key={support.id} aria-pressed={state.supports.includes(support.id)} onClick={() => toggleSupport(support.id)}>{support.label}</button>)}</div></div>)}</fieldset>
        <SupportMap state={state} />
        <fieldset><legend>When will I try my small step?</legend><div className="da-radio-choices">{TRIGGERS.map((trigger) => <label key={trigger.id}><input type="radio" name={`${id}-trigger`} checked={state.trigger === trigger.id} onChange={() => setState((current) => ({ ...current, trigger: trigger.id }))} /><span>{trigger.label}</span></label>)}</div></fieldset>
        <fieldset><legend>One observable action using an available support</legend>{selectedSupports.length ? <div className="da-radio-choices">{selectedSupports.map((support) => <label key={support.id}><input type="radio" name={`${id}-action`} checked={state.action === support.action && state.resource === support.id} onChange={() => setState((current) => ({ ...current, resource: support.id, action: support.action }))} /><span>{support.actionLabel}<small>Using: {support.label}</small></span></label>)}</div> : <p className="da-note">Select an available support above to see actions you can actually choose.</p>}</fieldset>
        {plan && <div className="da-plan"><h4>My if/when–then plan</h4><p>{plan}</p><small>A personal intention only. No reminder, schedule, message, or automatic action is created.</small></div>}
      </>}
      <div className="da-step-actions">{step > 0 && <button type="button" className="da-quiet" onClick={() => setStep(step - 1)}>Previous activity</button>}{step < 2 ? <button type="button" className="da-primary" onClick={() => setStep(step + 1)}>Explore activity {step + 2}</button> : <button type="button" className="da-primary" onClick={() => { previewRef.current?.scrollIntoView({ behavior: window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' }); previewRef.current?.focus({ preventScroll: true }) }}>View my keepsake</button>}</div>
    </section>

    {confirmClear && <div className="da-confirm" role="group" aria-labelledby={`${id}-clear-title`}><h3 id={`${id}-clear-title`}>Clear {confirmClear === 'all' ? 'all activity choices' : confirmClear === 'feelings' ? 'feelings and their colour links' : confirmClear === 'links' ? 'colour links' : 'supports and the action plan'}?</h3><p>This cannot be undone. Your drawing and other report sections will not be changed.</p><div className="da-step-actions"><button type="button" ref={cancelRef} onClick={() => setConfirmClear(null)}>Keep my choices</button><button type="button" className="da-quiet" onClick={clearChoices}>Yes, clear choices</button></div></div>}

    <section className="da-keepsake" ref={previewRef} tabIndex={-1} aria-labelledby={`${id}-keepsake`}>
      <header><span className="da-kicker">Your own small keepsake</span><h3 id={`${id}-keepsake`}>{safeTitle}</h3><p className="da-preview-status">{progress.complete ? 'Complete · ready to download' : `Partial preview · ${progress.completed}/3 complete. Finish the activities to download.`}</p></header>
      <div className="da-keepsake-grid"><article><h4>My feeling cloud</h4><FeelingCloud state={state} /><p className="da-note">Word size = my chosen intensity, not an AI score.</p></article><article><h4>My colour connections</h4>{state.feelings.length ? <ColourLinks state={state} colours={colours} /> : <p>No colour connections yet.</p>}<p className="da-note">My meanings, not a diagnosis.</p></article></div>
      <SupportMap state={state} />
      <div className="da-plan"><h4>My next small step</h4><p>{plan || 'Choose an available support, a when/if cue, and one action in activity 3 to make your plan.'}</p>{plan && <p className="da-note">Using: {SUPPORTS.find((support) => support.id === state.resource)?.label}</p>}<small>This plan is yours to try. The app does not schedule or carry it out.</small></div>
      <div className="da-downloads"><button type="button" className="da-primary" disabled={!progress.complete || exporting} onClick={() => void download('png')}>{exporting ? 'Preparing download…' : 'Download keepsake PNG'}</button><button type="button" disabled={!progress.complete || exporting} onClick={() => void download('json')}>Download choices JSON</button></div>
      <p className="da-note">Exports contain these actual choices and local export metadata only—no drawing, secret keys, or account identifiers. Keep or share them only where you feel comfortable.</p>
    </section>
    <details className="da-approach"><summary>Activity approach</summary><p>These are custom, choice-led reflection activities—not a clinically validated assessment or treatment. They help you name your current feelings, decide your own colour associations, and choose an available resource for a practical next step. The activities do not infer your personality from a drawing.</p><p>The <a href="https://www.who.int/publications/i/item/9789240003927" target="_blank" rel="noopener noreferrer">WHO practical stress-management guide</a> offers evidence-informed practical skills. <a href="https://www.nhs.uk/every-mind-matters/mental-wellbeing-tips/self-help-cbt-techniques/" target="_blank" rel="noopener noreferrer">NHS self-help guidance</a> explains connections between thoughts, feelings, and actions and offers a free personalised practical plan. This app’s activities are independently written, not those organisations’ workflows or artwork.</p><p><a href="https://pubmed.ncbi.nlm.nih.gov/32900287/" target="_blank" rel="noopener noreferrer">Jonauskaite and colleagues (2020)</a> found colour–emotion associations are modulated by linguistic and geographic factors; this does not validate an individual colour-based diagnosis. Your selected associations come first.</p><p>These activity sources are separate from any references used for the original drawing report. This section is not mental-health care. If you need care, contact a qualified professional or trusted local support.</p></details>
    <button type="button" className="da-reset da-quiet" onClick={() => setConfirmClear('all')} disabled={!state.feelings.length && !state.supports.length && !state.trigger && !state.personalPalette}>Reset all three activities</button>
  </section>
}
