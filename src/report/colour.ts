export type ColourFamily = 'yellow' | 'red' | 'orange' | 'blue' | 'green' | 'purple' | 'neutral' | 'other'

export type ColourSymbolism = {
  family: ColourFamily
  name: string
  meaning: string
  temperature: 'warm' | 'cool' | 'neutral'
  tint: string
  swatch: string
}

type RGB = [number, number, number]

const namedColours: Record<string, string> = {
  black: '#000000', white: '#ffffff', gray: '#808080', grey: '#808080',
  red: '#ff0000', orange: '#ffa500', yellow: '#ffff00', blue: '#0000ff',
  green: '#008000', purple: '#800080', pink: '#ffc0cb', brown: '#a52a2a',
  navy: '#000080', teal: '#008080', cyan: '#00ffff', magenta: '#ff00ff',
}

/** Drawing tools supply hex colours; RGB CSS values are accepted too. */
export function parseColour(value: string): RGB | null {
  const input = value.trim().toLowerCase()
  const colour = namedColours[input] ?? input
  const hex = colour.match(/^#([\da-f]{3}|[\da-f]{4}|[\da-f]{6}|[\da-f]{8})$/i)?.[1]
  if (hex) {
    const full = hex.length <= 4 ? hex.slice(0, 3).split('').map((digit) => digit + digit).join('') : hex.slice(0, 6)
    return [0, 2, 4].map((offset) => parseInt(full.slice(offset, offset + 2), 16)) as RGB
  }
  const rgb = colour.match(/^rgba?\(\s*([\d.]+%?)[,\s]+([\d.]+%?)[,\s]+([\d.]+%?)(?:\s*[,/]\s*[\d.]+%?)?\s*\)$/)
  if (!rgb) return null
  return rgb.slice(1, 4).map((channel) => Math.min(255, Math.max(0, parseFloat(channel) * (channel.endsWith('%') ? 2.55 : 1)))) as RGB
}

export function rgbToHsv([red, green, blue]: RGB) {
  const r = red / 255
  const g = green / 255
  const b = blue / 255
  const max = Math.max(r, g, b)
  const min = Math.min(r, g, b)
  const delta = max - min
  let hue = 0
  if (delta !== 0) {
    if (max === r) hue = ((g - b) / delta) % 6
    else if (max === g) hue = (b - r) / delta + 2
    else hue = (r - g) / delta + 4
    hue = (hue * 60 + 360) % 360
  }
  return { h: hue, s: max === 0 ? 0 : delta / max, v: max }
}

const familyStories: Record<Exclude<ColourFamily, 'other'>, Omit<ColourSymbolism, 'tint' | 'swatch'>> = {
  yellow: { family: 'yellow', name: 'Yellow', meaning: 'Brightness, hope or caution.', temperature: 'warm' },
  red: { family: 'red', name: 'Red', meaning: 'Passion, energy or caution in design symbolism.', temperature: 'warm' },
  orange: { family: 'orange', name: 'Orange', meaning: 'Warmth and comfort; welcome in design symbolism.', temperature: 'warm' },
  blue: { family: 'blue', name: 'Blue', meaning: 'Calm, responsibility or sadness; a soothing cool tone.', temperature: 'cool' },
  green: { family: 'green', name: 'Green', meaning: 'Nature, growth and harmony; a soothing cool tone.', temperature: 'cool' },
  purple: { family: 'purple', name: 'Purple', meaning: 'Imagination in design symbolism; a soothing cool tone.', temperature: 'cool' },
  neutral: { family: 'neutral', name: 'Neutral', meaning: 'Space, balance or contrast in design symbolism.', temperature: 'neutral' },
}

export function describeColour(colour: string): ColourSymbolism {
  const rgb = parseColour(colour)
  if (!rgb) return {
    family: 'other', name: 'Custom colour', meaning: 'Your own association gives this colour its meaning.',
    temperature: 'neutral', tint: '#f4f0e9', swatch: colour,
  }
  const { h, s, v } = rgbToHsv(rgb)
  const family: Exclude<ColourFamily, 'other'> = v < 0.16 || s < 0.16 ? 'neutral'
    : h < 15 || h >= 345 ? 'red'
      : h < 45 ? (h >= 35 && rgb[1] >= 180 && v > .85 ? 'yellow' : 'orange')
        : h < 70 ? 'yellow'
          : h < 175 ? 'green'
            : h < 250 ? 'blue' : 'purple'
  const story = { ...familyStories[family] }
  if (family === 'neutral') {
    story.name = v < 0.16 ? 'Black' : v > 0.95 && s < 0.06 ? 'White' : v > 0.8 && h >= 25 && h <= 75 && s > 0.035 ? 'Cream' : 'Grey / neutral'
  } else if (family === 'orange' && v < 0.72) {
    story.name = 'Brown / earth'
    story.meaning = 'Warmth and comfort; grounding in design symbolism.'
  } else if (family === 'blue' && h < 195) story.name = 'Teal / blue'
  else if (family === 'green' && h > 150) story.name = 'Teal / green'
  else if (family === 'purple' && h > 310 && v > 0.7) story.name = 'Pink / rose'
  else if (family === 'red' && v > 0.75 && s < 0.5) story.name = 'Rose / red'
  // Cards deliberately remain pale in both themes, with fixed dark text in CSS.
  const tint = `rgb(${rgb.map((channel) => Math.round(channel * 0.12 + 255 * 0.88)).join(', ')})`
  const swatch = `rgb(${rgb.map((channel) => Math.round(channel)).join(', ')})`
  return { ...story, tint, swatch }
}

/** share is a percentage in the 0–100 range, not a 0–1 proportion. */
export function formatInkShare(share: number): string {
  if (!Number.isFinite(share) || share <= 0) return '0%'
  if (share < 0.1) return '<0.1%'
  return `${Math.min(100, share).toLocaleString('en', { maximumFractionDigits: 1 })}%`
}
