import type { PersistedSession, StrokeRecord } from './types'

/** Storage can be blocked by browser policy or full. Never let that blank the app. */
export const browserStorage = {
  getItem(key: string): string | null {
    try { return window.localStorage.getItem(key) } catch { return null }
  },
  setItem(key: string, value: string): boolean {
    try { window.localStorage.setItem(key, value); return true } catch { return false }
  },
  removeItem(key: string): boolean {
    try { window.localStorage.removeItem(key); return true } catch { return false }
  },
}

const record = (value: unknown): value is Record<string, unknown> => Boolean(value) && typeof value === 'object'
const number = (value: unknown): value is number => typeof value === 'number' && Number.isFinite(value)
const tools = ['pencil', 'ink', 'marker', 'watercolour', 'crayon', 'airbrush', 'calligraphy', 'highlighter', 'eraser', 'fill']

const validStroke = (value: unknown): value is StrokeRecord => {
  if (!record(value) || typeof value.id !== 'string' || !tools.includes(String(value.tool))) return false
  if (typeof value.color !== 'string' || !number(value.size) || !number(value.opacity) || !number(value.start) || !number(value.end)) return false
  const bounds = value.bbox
  if (!record(bounds) || !['x', 'y', 'width', 'height'].every((key) => number(bounds[key]))) return false
  return Array.isArray(value.points) && value.points.length > 0 && value.points.every((point) => record(point) && ['x', 'y', 't', 'pressure'].every((key) => number(point[key])))
}

export const parseSession = (raw: string | null): PersistedSession | null => {
  if (!raw) return null
  try {
    const value: unknown = JSON.parse(raw)
    if (!record(value) || !record(value.profile)) return null
    const profile = value.profile
    if (typeof profile.name !== 'string' || typeof profile.consent !== 'boolean' || !['child', 'teen', 'adult', 'older'].includes(String(profile.ageGroup))) return null
    if (!number(value.startTime) || value.startTime <= 0 || value.startTime > Date.now() + 5000) return null
    if (!Array.isArray(value.strokes) || !value.strokes.every(validStroke)) return null
    if (typeof value.drawingDataUrl !== 'string' || (value.drawingDataUrl !== '' && !value.drawingDataUrl.startsWith('data:image/png'))) return null
    if (value.fillOps !== undefined && (!Array.isArray(value.fillOps) || !value.fillOps.every((fill) => record(fill) && number(fill.x) && number(fill.y) && number(fill.tolerance) && typeof fill.color === 'string' && (fill.t === undefined || number(fill.t))))) return null
    return { ...value, undoCount: number(value.undoCount) ? value.undoCount : 0 } as PersistedSession
  } catch { return null }
}

export type GalleryEntry = { image: string; title: string; savedAt: number }
export const parseGallery = (raw: string | null): GalleryEntry[] => {
  try {
    const value: unknown = JSON.parse(raw ?? '[]')
    return Array.isArray(value) ? value.filter((entry): entry is GalleryEntry => record(entry) && typeof entry.image === 'string' && entry.image.startsWith('data:image/png') && typeof entry.title === 'string' && number(entry.savedAt)) : []
  } catch { return [] }
}
