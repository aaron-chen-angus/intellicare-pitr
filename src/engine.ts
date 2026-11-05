import { CANVAS_HEIGHT, CANVAS_WIDTH, DRAWING_SECONDS } from './data'
import type { AgeGroup, AnalysisReport, FillOperation, Point, StrokeRecord, ToolName } from './types'
import scoring from '../scoring.config.json'

export const clamp = (value: number, min: number, max: number) => Math.max(min, Math.min(max, value))
export const distance = (a: Point, b: Point) => Math.hypot(a.x - b.x, a.y - b.y)

export const hexToRgba = (hex: string, alpha = 1) => {
  const normalized = hex.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map((x) => x + x).join('') : normalized
  const value = Number.parseInt(full, 16)
  return `rgba(${(value >> 16) & 255}, ${(value >> 8) & 255}, ${value & 255}, ${alpha})`
}

export const floodFill = (canvas: HTMLCanvasElement, operation: FillOperation) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  const image = ctx.getImageData(0, 0, canvas.width, canvas.height)
  const pixels = image.data
  const startX = clamp(Math.round(operation.x), 0, canvas.width - 1)
  const startY = clamp(Math.round(operation.y), 0, canvas.height - 1)
  const startIndex = (startY * canvas.width + startX) * 4
  const normalized = operation.color.replace('#', '')
  const full = normalized.length === 3 ? normalized.split('').map((part) => part + part).join('') : normalized
  const value = Number.parseInt(full, 16)
  const fill = [(value >> 16) & 255, (value >> 8) & 255, value & 255, 255]
  const source = [pixels[startIndex], pixels[startIndex + 1], pixels[startIndex + 2], pixels[startIndex + 3]]
  if (source.every((channel, index) => Math.abs(channel - fill[index]) <= 2)) return
  const matches = (index: number) => Math.abs(pixels[index] - source[0]) <= operation.tolerance && Math.abs(pixels[index + 1] - source[1]) <= operation.tolerance && Math.abs(pixels[index + 2] - source[2]) <= operation.tolerance && Math.abs(pixels[index + 3] - source[3]) <= operation.tolerance
  const stack: Array<[number, number]> = [[startX, startY]]
  const visited = new Uint8Array(canvas.width * canvas.height)
  while (stack.length) {
    const [x, y] = stack.pop()!
    if (x < 0 || x >= canvas.width || y < 0 || y >= canvas.height) continue
    const pixelIndex = y * canvas.width + x
    if (visited[pixelIndex]) continue
    visited[pixelIndex] = 1
    const dataIndex = pixelIndex * 4
    if (!matches(dataIndex)) continue
    pixels[dataIndex] = fill[0]
    pixels[dataIndex + 1] = fill[1]
    pixels[dataIndex + 2] = fill[2]
    pixels[dataIndex + 3] = fill[3]
    stack.push([x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1])
  }
  ctx.putImageData(image, 0, 0)
}

export const makeStroke = (tool: ToolName, color: string, size: number, opacity: number, points: Point[]): StrokeRecord => {
  const xs = points.map((point) => point.x)
  const ys = points.map((point) => point.y)
  const pressures = points.map((point) => point.pressure)
  return {
    id: crypto.randomUUID(),
    start: points[0]?.t ?? Date.now(),
    end: points.at(-1)?.t ?? Date.now(),
    tool,
    color,
    size,
    opacity,
    points,
    bbox: {
      x: Math.min(...xs, 0),
      y: Math.min(...ys, 0),
      width: Math.max(...xs, 0) - Math.min(...xs, 0),
      height: Math.max(...ys, 0) - Math.min(...ys, 0),
    },
    averagePressure: pressures.length ? pressures.reduce((sum, pressure) => sum + pressure, 0) / pressures.length : 0.5,
  }
}

const uniqueColors = (strokes: StrokeRecord[]) => Array.from(new Set(strokes.map((stroke) => stroke.color))).slice(0, 5)

const colourTemperature = (colors: string[]) => {
  const warm = colors.filter((color) => {
    const value = Number.parseInt(color.replace('#', ''), 16)
    const r = (value >> 16) & 255
    const b = value & 255
    return r > b + 18
  }).length
  const cool = colors.length - warm
  return warm > cool ? 'warm-led' : cool > warm ? 'cool-led' : 'mixed'
}

const readingSet = (strokes: StrokeRecord[], rainAmount: AnalysisReport['rainAmount'], umbrella: boolean, wholeFigure: boolean, company: boolean, pageUsage: number, averageSlope: number) => {
  const colors = uniqueColors(strokes)
  const temperature = colourTemperature(colors)
  const expressionReading = { title: 'Expression remains open', body: 'A browser canvas can describe line placement and process, but it cannot responsibly infer a facial emotion from these marks alone. Look at the face you intended: does it feel calm, worried, determined, tired, playful, or deliberately unreadable to you?', confidence: 0.42 }
  const postureReading = averageSlope > 1.35
    ? { title: 'Leaning or active posture', body: 'The figure-like lines change direction or lean noticeably. You might reflect on movement, effort, bracing, or the person actively meeting the weather.', confidence: 0.56 }
    : pageUsage < 0.1
      ? { title: 'Contained posture / smaller presence', body: 'The figure-like marks occupy a modest part of the page. Consider whether the person feels protected, distant, cautious, or simply given generous space around them.', confidence: 0.58 }
      : { title: 'Upright or grounded posture', body: 'The main marks read as relatively stable on the page. Notice whether your person feels steady, waiting, held by the ground, or ready to move.', confidence: 0.55 }
  const figureReading = wholeFigure
    ? { title: 'A formed figure', body: 'The marks suggest a more complete person-like structure with enough presence to anchor the page.', confidence: 0.63 }
    : { title: 'A developing figure', body: 'The page suggests a person-like starting point, while some details remain open for your own interpretation.', confidence: 0.48 }
  const umbrellaReading = umbrella
    ? { title: 'A possible shelter shape', body: 'A broad horizontal mark may function as an umbrella or cover. Its presence can prompt reflection on protection, coping tools, or the people and places that create room around you.', confidence: 0.62 }
    : { title: 'No clear umbrella shape', body: 'The local sketch reading did not find a broad shelter-like form. That does not mean support is absent; it simply opens a question about what protection or companionship would look like in this picture.', confidence: 0.54 }
  const rainReading = rainAmount === 'heavy'
    ? { title: 'Dense or insistent rain marks', body: 'Many narrow, vertical marks create a strong weather field. In the activity’s reflective language, heavy rain can stand in for challenges that feel persistent or hard to ignore.', confidence: 0.7 }
    : rainAmount === 'moderate'
      ? { title: 'A noticeable rain field', body: 'The page contains a repeated pattern of rain-like marks. You might notice whether the weather feels manageable, absorbing, or personally directed at the figure.', confidence: 0.64 }
      : rainAmount === 'light'
        ? { title: 'Light or scattered rain', body: 'A few vertical marks suggest a lighter weather pattern. This can be a prompt to consider whether the difficulties in view feel contained, passing, or still gathering.', confidence: 0.56 }
        : { title: 'Rain is not strongly legible', body: 'The local reader did not find a clear repeated rain pattern. You may have been more interested in the person, the ground, or another part of the scene.', confidence: 0.5 }
  const additionalReading = company
    ? { title: 'More than one mark cluster', body: 'Several distinct clusters appear across the page. They might become people, objects, landscape, or atmosphere; consider whether the surrounding elements feel companionable, distracting, or protective.', confidence: 0.49 }
    : strokes.some((stroke) => stroke.bbox.y > CANVAS_HEIGHT * 0.72)
      ? { title: 'Ground-level activity', body: 'Marks gather near the lower part of the page. That may be a useful place to look for ground, puddles, reflections, or the feeling of being held in a particular environment.', confidence: 0.52 }
      : { title: 'An open surrounding field', body: 'No additional object or companion cluster was clear in this local reading. The open space can be part of the drawing’s quietness, or simply room still available to develop.', confidence: 0.45 }
  const compositionReading = pageUsage > 0.22
    ? { title: 'A full-page composition', body: 'Your marks travel across a substantial part of the paper, creating a more immersive scene with several visual paths for the eye to follow.', confidence: 0.66 }
    : { title: 'A focused composition', body: 'The marks stay relatively concentrated, leaving generous quiet around them. Notice whether that quiet feels intentional, protective, or unfinished to you.', confidence: 0.6 }
  const colourReading = temperature === 'warm-led'
    ? { title: 'A warm-led palette', body: 'The local palette leans toward warmer colours. In the slides’ art-language, warm colours can evoke energy, comfort, brightness, or caution; the personal meaning belongs to you.', confidence: 0.54 }
    : temperature === 'cool-led'
      ? { title: 'A cool-led palette', body: 'The local palette leans toward cool colours. They are often associated with calm, responsibility, nature, or sadness, but colour meaning depends on your own context.', confidence: 0.54 }
      : { title: 'A mixed palette', body: 'The colours do not lean strongly warm or cool. That mix may reflect contrast between weather and shelter, or simply the materials that felt right in the moment.', confidence: 0.46 }
  return { expressionReading, postureReading, figureReading, umbrellaReading, rainReading, additionalReading, compositionReading, colourReading }
}

export const analyseLocally = (strokes: StrokeRecord[], timeUsedSeconds: number, undoCount = 0, ageGroup: AgeGroup = 'adult'): AnalysisReport => {
  const strokeCount = strokes.length
  const eraseCount = strokes.filter((stroke) => stroke.tool === 'eraser').length
  const totalLength = strokes.reduce((sum, stroke) => sum + stroke.points.slice(1).reduce((length, point, index) => length + distance(point, stroke.points[index]), 0), 0)
  const weightedInk = strokes.reduce((sum, stroke) => sum + stroke.points.length * stroke.size, 0)
  const inkCoverage = clamp((weightedInk / (CANVAS_WIDTH * CANVAS_HEIGHT)) * 2.4, 0, 0.96)
  const pageUsage = clamp((strokes.reduce((sum, stroke) => sum + stroke.bbox.width * stroke.bbox.height, 0) / (CANVAS_WIDTH * CANVAS_HEIGHT)) * 1.2, 0, 1)
  const averageSlope = strokes.length ? strokes.reduce((sum, stroke) => {
    const start = stroke.points[0]
    const end = stroke.points.at(-1)
    return sum + (start && end ? Math.abs((end.y - start.y) / ((end.x - start.x) || 1)) : 0)
  }, 0) / strokes.length : 0
  const rainLikeCount = strokes.filter((stroke) => stroke.points.length <= 22 && stroke.bbox.height > stroke.bbox.width * 1.25).length
  const rainAmount: AnalysisReport['rainAmount'] = rainLikeCount >= 18 ? 'heavy' : rainLikeCount >= 8 ? 'moderate' : rainLikeCount >= 2 ? 'light' : 'none'
  const hasEnoughInk = strokeCount >= 3 && inkCoverage > 0.0005 && totalLength > 30
  const figureLike = strokeCount >= 6 && pageUsage > 0.004

  if (!hasEnoughInk || !figureLike) {
    return {
      blank: true,
      supportFirst: false,
      band: 'Finding Your Footing',
      bandLine: 'There is always room to try another weather pattern.',
      summary: 'We could not confidently find a person in the rain from these marks yet. That is completely okay — you might try again with a few simple shapes, a rain line, and something that offers shelter.',
      stressScore: 0,
      resourceScore: 0,
      copingBalance: 0,
      inkCoverage,
      pageUsage,
      strokeCount,
      eraseCount,
      undoCount,
      timeUsedSeconds,
      rainAmount,
      noticed: [],
      palette: uniqueColors(strokes),
      protectionTiming: 'unclear',
      prompts: ['What would you like to add to the page next?', 'What kind of weather belongs around your person?', 'What would make the drawing feel more sheltered?'],
      processNote: 'A small first sketch can be a beginning, not a conclusion.',
      region: 'Singapore',
      ...readingSet(strokes, rainAmount, false, false, false, pageUsage, averageSlope),
    }
  }

  const heavyRain = rainAmount === 'heavy'
  const stormElements = rainLikeCount >= 6 || averageSlope > 1.5
  const resourceHints = strokes.filter((stroke) => stroke.bbox.width > stroke.bbox.height * 1.3).length
  const umbrella = resourceHints >= 1
  const wholeFigure = strokeCount >= 8
  const company = strokeCount >= 18 && pageUsage > 0.07
  const stressScore = (heavyRain ? scoring.stressWeights.heavyRain : 0) + (stormElements ? scoring.stressWeights.stormElements : 0) + (rainAmount === 'moderate' ? 1 : 0) + (pageUsage < 0.08 ? scoring.stressWeights.lowPageUsage : 0)
  const resourceScore = (umbrella ? scoring.resourceWeights.umbrella : 0) + (wholeFigure ? scoring.resourceWeights.wholeFigure : 0) + (company ? scoring.resourceWeights.company : 0) + (resourceHints >= 2 ? scoring.resourceWeights.positiveDetail : 0)
  const copingBalance = resourceScore - stressScore
  const band: AnalysisReport['band'] = copingBalance >= scoring.thresholds.shelteredSteady ? 'Sheltered & Steady' : copingBalance >= scoring.thresholds.findingYourFooting ? 'Finding Your Footing' : copingBalance >= scoring.thresholds.weatheringTheStorm ? 'Weathering the Storm' : 'Caught in the Downpour'
  const bandLine: Record<AnalysisReport['band'], string> = {
    'Sheltered & Steady': 'A little shelter seems to be making room for the weather.',
    'Finding Your Footing': 'Your page holds both weather and ways of meeting it.',
    'Weathering the Storm': 'The rain has presence, and your person is still here with it.',
    'Caught in the Downpour': 'The page feels weather-full; gentleness and support may matter here.',
  }
  const noticed: AnalysisReport['noticed'] = [
    { id: 'figure', label: 'Figure-like composition', icon: '✧', confidence: 0.68 },
    ...(rainAmount !== 'none' ? [{ id: 'rain', label: `${rainAmount[0].toUpperCase()}${rainAmount.slice(1)} rain marks`, icon: '∿', confidence: 0.74 }] : []),
    ...(umbrella ? [{ id: 'shelter', label: 'A broad shelter shape', icon: '⌒', confidence: 0.62 }] : []),
    ...(wholeFigure ? [{ id: 'whole', label: 'A fuller figure', icon: '♙', confidence: 0.61 }] : []),
    ...(company ? [{ id: 'company', label: 'Several mark clusters', icon: '♧', confidence: 0.55, possible: true }] : []),
  ].slice(0, 6)
  const protectionTiming = umbrella && strokes.findIndex((stroke) => stroke.bbox.width > stroke.bbox.height * 1.3) < Math.max(1, strokes.length * 0.45) ? 'before' : umbrella ? 'after' : 'unclear'
  const agePrefix = ageGroup === 'child' ? 'For a young artist, ' : ageGroup === 'teen' ? 'For a teen artist, ' : ageGroup === 'older' ? 'For an older artist, ' : ''
  const summary = umbrella
    ? `${agePrefix}your page includes a figure-like composition and a broad shape that may offer shelter. Some people notice that drawing a protective shape first can create a feeling of room around the weather; you might reflect on what feels supportive for you today.`
    : `${agePrefix}your page includes a figure-like composition surrounded by visible rain marks. Some people find it useful to notice how their drawn person meets the weather; you might reflect on what kind of shelter, company, or pause would feel right for you.`

  return {
    blank: false,
    supportFirst: band === 'Caught in the Downpour' && heavyRain && !umbrella,
    band,
    bandLine: bandLine[band],
    summary,
    stressScore,
    resourceScore,
    copingBalance,
    inkCoverage,
    pageUsage,
    strokeCount,
    eraseCount,
    undoCount,
    timeUsedSeconds,
    rainAmount,
    noticed,
    palette: uniqueColors(strokes),
    protectionTiming,
    prompts: umbrella
      ? ['What would make your person feel even more sheltered?', 'Who or what is your umbrella right now?', 'If the rain stopped, what would your person do next?']
      : ['What would make your person feel more sheltered?', 'Who or what could stand beside your person?', 'If the rain softened, what would your person do next?'],
    processNote: protectionTiming === 'before' ? 'A shelter-like shape appeared early in the process.' : protectionTiming === 'after' ? 'A shelter-like shape arrived later, after other marks were already present.' : 'The process did not give us a clear shelter sequence — and that is okay.',
    region: 'Singapore',
    ...readingSet(strokes, rainAmount, umbrella, wholeFigure, company, pageUsage, averageSlope),
  }
}

export const formatTime = (seconds: number) => `${Math.floor(seconds / 60).toString().padStart(2, '0')}:${Math.max(0, seconds % 60).toString().padStart(2, '0')}`

export const fitCanvas = (canvas: HTMLCanvasElement, width: number, height: number) => {
  canvas.width = width
  canvas.height = height
  canvas.style.aspectRatio = `${width} / ${height}`
}
