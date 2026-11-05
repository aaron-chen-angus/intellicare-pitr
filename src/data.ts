import type { AgeGroup, ToolName } from './types'

export const APP_NAME = 'Rain & Me'
export const DRAWING_SECONDS = 5 * 60
export const CANVAS_WIDTH = 1240
export const CANVAS_HEIGHT = 1754

export const palette = [
  '#15243a', '#34465f', '#53718a', '#7fabc1', '#b9d8d3', '#2e8c88',
  '#6fb7a6', '#a8d8b9', '#f6d58a', '#f6b38a', '#e98773', '#c76879',
  '#84558d', '#b4a1d4', '#e8bfd8', '#f3e8d6', '#ffffff', '#1f2937',
  '#715944', '#b48457', '#9a6d7b', '#e1a8a0', '#7c9b80', '#9db9c9',
]

export const toolMeta: Array<{ id: ToolName; label: string; glyph: string; hint: string }> = [
  { id: 'pencil', label: 'Pencil', glyph: '✎', hint: 'Grainy and light' },
  { id: 'ink', label: 'Ink pen', glyph: '🖋', hint: 'Smooth and crisp' },
  { id: 'marker', label: 'Marker', glyph: '▰', hint: 'Flat and semi-opaque' },
  { id: 'watercolour', label: 'Watercolour', glyph: '◌', hint: 'Soft edges and bleed' },
  { id: 'crayon', label: 'Crayon', glyph: '✹', hint: 'Textured pastel' },
  { id: 'airbrush', label: 'Airbrush', glyph: '◉', hint: 'Soft spray' },
  { id: 'calligraphy', label: 'Calligraphy', glyph: 'Ꞩ', hint: 'Angle-sensitive width' },
  { id: 'highlighter', label: 'Highlighter', glyph: '▱', hint: 'Multiply-style glow' },
  { id: 'eraser', label: 'Eraser', glyph: '⌫', hint: 'Erase marks' },
  { id: 'fill', label: 'Fill', glyph: '▤', hint: 'Flood fill paper' },
]

export const references = [
  'Hammer, E. F. (1958). The clinical application of projective drawings. Charles C. Thomas.',
  'Verinis, J. S., Lichtenberg, J. M., & Henrich, L. (1974). The Draw-A-Person in the Rain technique: Its relationship to diagnostic category and other personality indicators. Journal of Clinical Psychology, 30(3), 407–414.',
  "Lack, H. S. (1996). The Person-in-the-Rain projective drawing as a measure of children's coping capacity [Doctoral dissertation, California School of Professional Psychology].",
  'Willis, L. R., Joy, S. P., & Kaiser, D. H. (2010). Draw-a-Person-in-the-Rain as an assessment of stress and coping resources. The Arts in Psychotherapy, 37(3), 233–239. https://doi.org/10.1016/j.aip.2010.04.009',
  'Jue, J., & Ha, J. H. (2019). The Person-in-the-Rain drawing test as an assessment of soldiers\' army life adjustment and resilience. Psychology, 10(11), 1418–1434.',
  'Li, Z., Liu, G., Liu, Y., & Ma, Z. (2021). Using a computer scoring system to correlate stress response and indicators in the Draw-A-Person-in-the-Rain Test. Social Behavior and Personality, 49(1), e9619. https://doi.org/10.2224/sbp.9619',
  'Lichtenberg, E. F. (2014). Draw-a-Person-in-the-Rain test. In L. Handler & A. D. Thomas (Eds.), Drawings in assessment and psychotherapy: Research and application. Routledge.',
  'Oster, G. D., & Crone, P. G. (2004). Using drawings in assessment and therapy: A guide for mental health professionals (2nd ed.). Brunner-Routledge.',
  'Lilienfeld, S. O., Wood, J. M., & Garb, H. N. (2000). The scientific status of projective techniques. Psychological Science in the Public Interest, 1(2), 27–66.',
]

export const ageLabel: Record<AgeGroup, string> = {
  child: 'Child · under 12',
  teen: 'Teen · 12–17',
  adult: 'Adult · 18–64',
  older: 'Older adult · 65+',
}

export const developingMessages = [
  'Mixing the colours…',
  'Listening to the rain…',
  'Finding the story in your strokes…',
]
