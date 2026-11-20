import { describeColour, parseColour } from './colour'

export const ACTIVITY_VERSION = 1 as const
export const FEELINGS = [
  { id: 'calm', label: 'Calm' }, { id: 'hopeful', label: 'Hopeful' },
  { id: 'worried', label: 'Worried' }, { id: 'tired', label: 'Tired' },
  { id: 'sad', label: 'Sad' }, { id: 'determined', label: 'Determined' },
  { id: 'grateful', label: 'Grateful' }, { id: 'lonely', label: 'Lonely' },
  { id: 'frustrated', label: 'Frustrated' }, { id: 'curious', label: 'Curious' },
  { id: 'relieved', label: 'Relieved' }, { id: 'overwhelmed', label: 'Overwhelmed' },
  { id: 'content', label: 'Content' }, { id: 'uncertain', label: 'Uncertain' },
  { id: 'energised', label: 'Energised' }, { id: 'connected', label: 'Connected' },
] as const
export type FeelingId = typeof FEELINGS[number]['id']
export type Intensity = 1 | 2 | 3
export const INTENSITIES = ['A little', 'Somewhat', 'Strongly'] as const
export const SUPPORTS = [
  { id: 'trusted-person', group: 'People', label: 'A trusted person I can contact', action: 'message-person', actionLabel: 'Send my trusted person a short check-in message' },
  { id: 'family-friend', group: 'People', label: 'A friend or family member who can listen', action: 'ask-listen', actionLabel: 'Ask my friend or family member for five minutes to talk' },
  { id: 'care-contact', group: 'People', label: 'An existing care or support contact', action: 'contact-care', actionLabel: 'Send my existing care contact a short message asking for support' },
  { id: 'quiet-place', group: 'Places', label: 'A quiet corner I can use', action: 'sit-quiet', actionLabel: 'Sit in my quiet corner for two minutes' },
  { id: 'safe-outdoors', group: 'Places', label: 'A safe outdoor spot I can reach', action: 'step-outside', actionLabel: 'Spend two minutes in my safe outdoor spot' },
  { id: 'comfortable-seat', group: 'Places', label: 'A comfortable place to sit', action: 'rest-seat', actionLabel: 'Sit comfortably and rest for one minute' },
  { id: 'water', group: 'Actions', label: 'Drinking water within reach', action: 'drink-water', actionLabel: 'Drink a glass of water' },
  { id: 'music', group: 'Actions', label: 'One song I can listen to', action: 'listen-song', actionLabel: 'Listen to one song I choose' },
  { id: 'safe-walk', group: 'Actions', label: 'A short, safe walking route', action: 'walk', actionLabel: 'Take a two-minute walk on my safe route' },
  { id: 'breathing', group: 'Skills', label: 'Slow breathing that feels comfortable', action: 'breathe', actionLabel: 'Take three slow, comfortable breaths' },
  { id: 'noticing', group: 'Skills', label: 'Noticing things around me', action: 'notice', actionLabel: 'Name five things I can see around me' },
  { id: 'gentle-movement', group: 'Skills', label: 'A gentle movement I can comfortably do', action: 'move', actionLabel: 'Gently roll my shoulders three times' },
] as const
export type SupportId = typeof SUPPORTS[number]['id']
export type ActionId = typeof SUPPORTS[number]['action']
export const TRIGGERS = [
  { id: 'next-break', label: 'At my next break' },
  { id: 'need-pause', label: 'When I notice I need a pause' },
  { id: 'after-task', label: 'After I finish my next task' },
  { id: 'feel-overwhelmed', label: 'If I start to feel overwhelmed' },
] as const
export type TriggerId = typeof TRIGGERS[number]['id']
export type ActivityState = {
  version: typeof ACTIVITY_VERSION
  feelings: Array<{ id: FeelingId; intensity: Intensity }>
  links: Partial<Record<FeelingId, string>>
  personalPalette: boolean
  supports: SupportId[]
  trigger: TriggerId | null
  action: ActionId | null
  resource: SupportId | null
}
export type ActivityColour = { value: string; name: string; source: 'drawing' | 'personal' }
export const PERSONAL_PALETTE = ['#355c88', '#738a65', '#be724f', '#9473a3', '#daa849', '#53616e']
export const activityStorageKey = (sessionId: string) => `rainandme:discovery:v1:${encodeURIComponent(sessionId)}`
export function emptyActivityState(): ActivityState {
  return { version: ACTIVITY_VERSION, feelings: [], links: {}, personalPalette: false, supports: [], trigger: null, action: null, resource: null }
}
const record = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value)

/** Only known fields are read. Old, oversized, malformed, or unknown-version records fail safely. */
export function parseActivityState(raw: string | null): ActivityState {
  const result = emptyActivityState()
  if (!raw || raw.length > 32768) return result
  try {
    const input: unknown = JSON.parse(raw)
    if (!record(input) || input.version !== ACTIVITY_VERSION) return result
    if (Array.isArray(input.feelings)) {
      for (const item of input.feelings.slice(0, 32)) {
        if (!record(item) || !FEELINGS.some((feeling) => feeling.id === item.id) || ![1, 2, 3].includes(Number(item.intensity)) || typeof item.intensity !== 'number') continue
        if (!result.feelings.some((feeling) => feeling.id === item.id) && result.feelings.length < 6) result.feelings.push({ id: item.id as FeelingId, intensity: item.intensity as Intensity })
      }
    }
    if (record(input.links)) for (const feeling of result.feelings) {
      const value = input.links[feeling.id]
      if (typeof value === 'string' && value.length <= 80 && parseColour(value)) result.links[feeling.id] = normaliseActivityColour(value)!
    }
    result.personalPalette = input.personalPalette === true
    if (Array.isArray(input.supports)) result.supports = [...new Set(input.supports.filter((id): id is SupportId => SUPPORTS.some((support) => support.id === id)))].slice(0, 3)
    result.trigger = TRIGGERS.some((trigger) => trigger.id === input.trigger) ? input.trigger as TriggerId : null
    const support = SUPPORTS.find((item) => item.id === input.resource && result.supports.includes(item.id) && item.action === input.action)
    if (support) { result.resource = support.id; result.action = support.action }
    return result
  } catch { return result }
}
export function normaliseActivityColour(value: string): string | null {
  const rgb = parseColour(value)
  if (!rgb || rgb.some((channel) => !Number.isFinite(channel))) return null
  const base = `#${rgb.map((channel) => Math.round(channel).toString(16).padStart(2, '0')).join('')}`
  const hex = value.trim().match(/^#([\da-f]{4}|[\da-f]{8})$/i)?.[1]
  const alpha = hex ? (hex.length === 4 ? hex[3].repeat(2) : hex.slice(6)).toLowerCase() : ''
  const cssAlpha = value.trim().match(/^rgba?\([^)]*[,/]\s*([\d.]+%?)\s*\)$/i)?.[1]
  if (alpha && alpha !== 'ff') return base + alpha
  if (/^rgba\(/i.test(value.trim()) && cssAlpha) {
    const amount = Number.parseFloat(cssAlpha) / (cssAlpha.endsWith('%') ? 100 : 1)
    if (Number.isFinite(amount) && amount < 1) return base + Math.round(Math.max(0, amount) * 255).toString(16).padStart(2, '0')
  }
  return base
}
export function activityColours(colors: string[], personalPalette: boolean): ActivityColour[] {
  const values = [...new Set(colors.filter((value) => typeof value === 'string').map(normaliseActivityColour).filter((value): value is string => value !== null))]
  const source = values.length ? 'drawing' : 'personal'
  return (values.length ? values : personalPalette ? PERSONAL_PALETTE : []).map((value) => ({ value, name: describeColour(value).name, source }))
}
export function reconcileActivityState(state: ActivityState, colours: ActivityColour[]): ActivityState {
  const links: ActivityState['links'] = {}
  state.feelings.forEach((feeling) => {
    const value = state.links[feeling.id]
    if (value && colours.some((colour) => colour.value === value)) links[feeling.id] = value
  })
  const support = SUPPORTS.find((item) => item.id === state.resource && state.supports.includes(item.id) && item.action === state.action)
  return { ...state, links, resource: support?.id ?? null, action: support?.action ?? null }
}
export function activityProgress(state: ActivityState, colours: ActivityColour[]) {
  const feelings = state.feelings.length > 0 && state.feelings.length <= 6
  const links = feelings && state.feelings.every((feeling) => colours.some((colour) => colour.value === state.links[feeling.id]))
  const supports = state.supports.length > 0 && state.supports.length <= 3 && TRIGGERS.some((trigger) => trigger.id === state.trigger) && SUPPORTS.some((support) => support.id === state.resource && state.supports.includes(support.id) && support.action === state.action)
  const steps = [feelings, links, supports]
  return { steps, completed: steps.filter(Boolean).length, complete: steps.every(Boolean) }
}
export function activityPlan(state: ActivityState): string | null {
  const trigger = TRIGGERS.find((item) => item.id === state.trigger)
  const support = SUPPORTS.find((item) => item.id === state.resource && state.supports.includes(item.id) && item.action === state.action)
  return trigger && support ? `${trigger.label}, then I will ${support.actionLabel.charAt(0).toLowerCase()}${support.actionLabel.slice(1)}.` : null
}
export function createActivityOutcome(state: ActivityState, colours: ActivityColour[], title = 'My reflection keepsake', exportedAt = new Date().toISOString()) {
  const progress = activityProgress(state, colours)
  return {
    schema: 'rainandme.discovery-outcome', version: ACTIVITY_VERSION, exportedAt,
    title: safeActivityTitle(title), status: progress.complete ? 'complete' : 'partial', completedActivities: progress.completed,
    origin: 'User-selected reflection choices; not an assessment or diagnosis',
    privacy: 'Created locally. Contains reflection choices only; no drawing, account identifiers, or secret keys.',
    feelings: state.feelings.map((feeling) => ({ ...feeling, word: FEELINGS.find((item) => item.id === feeling.id)!.label, intensityLabel: INTENSITIES[feeling.intensity - 1] })),
    colourLinks: state.feelings.flatMap((feeling) => {
      const colour = colours.find((item) => item.value === state.links[feeling.id])
      return colour ? [{ feeling: feeling.id, colour: colour.value, colourName: colour.name, source: colour.source, meaning: `You linked ${colour.name.toLowerCase()}/${colour.value} with ${feeling.id}.` }] : []
    }),
    resources: SUPPORTS.filter((support) => state.supports.includes(support.id)).map((support) => ({ id: support.id, category: support.group, label: support.label, availability: 'self-confirmed' })),
    plan: activityPlan(state) ? { trigger: TRIGGERS.find((item) => item.id === state.trigger)!.label, action: SUPPORTS.find((item) => item.id === state.resource)!.actionLabel, resourceId: state.resource, statement: activityPlan(state)!, execution: 'Personal intention only; no reminder, scheduling, or automatic action' } : null,
  }
}
export type ActivityOutcome = ReturnType<typeof createActivityOutcome>
export function safeActivityTitle(title: string) { return title.replace(/[\u0000-\u001f\u007f]/g, '').trim().slice(0, 120) || 'My reflection keepsake' }
