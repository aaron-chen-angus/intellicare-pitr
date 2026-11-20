import { jsPDF } from 'jspdf'
import type { FillOperation, StrokeRecord } from '../types'
import type { SceneDescription } from './ReflectionCards'
import type { ActivityOutcome } from './activities'
import { SUBJECTS, subjectOf, paletteUsage } from '../process'
import { references } from '../data'
import resources from '../../resources.config.json'
import { parseColour } from './colour'
import { installReflectionFonts } from './pdf-fonts'
import { processInsights } from './process-insights'

export type ReflectionPdfInput = {
  originalImage: string
  styledArtwork?: { image: string; styleName: string }
  title: string
  startTime: number
  timeUsedSeconds: number
  undoCount: number
  strokes: StrokeRecord[]
  fills: FillOperation[]
  scene: SceneDescription
  activity: ActivityOutcome
  release: string
}

// Keep identical to the care disclaimer at the bottom of App.tsx.
const CARE_DISCLAIMER = 'This is a reflective art activity, not a psychological test or diagnosis. Person-in-the-Rain drawings are a projective technique; research on their reliability and validity is mixed, and interpretations should only be made by a trained art therapist or psychologist alongside other information. If you are feeling distressed, please reach out to someone you trust or a mental health professional.'

type RGB = [number, number, number]
const C = {
  ink: [30, 43, 43] as RGB,
  teal: [30, 75, 73] as RGB,
  muted: [94, 103, 99] as RGB,
  brass: [164, 140, 95] as RGB,
  line: [213, 208, 194] as RGB,
  paper: [248, 246, 239] as RGB,
  pale: [235, 239, 233] as RGB,
  white: [255, 255, 255] as RGB,
}
const M = 18
const W = 174
const BOTTOM = 273
const finite = (value: number) => Number.isFinite(value)
const nonnegative = (value: number) => finite(value) ? Math.max(0, value) : 0
const count = (value: number) => Math.floor(nonnegative(value)).toLocaleString('en-GB')
const seconds = (value: number) => {
  const duration = nonnegative(value)
  if (duration > 0 && duration < .01) return '<0.01 s'
  const digits = duration > 0 && duration < .1 ? 2 : 1
  return `${duration.toLocaleString('en-GB', { maximumFractionDigits: digits, minimumFractionDigits: digits })} s`
}
const clean = (value: string) => String(value ?? '').replace(/[\u0000-\u001f\u007f-\u009f]/g, ' ').replace(/\s+/g, ' ').trim()
const rgb = (value: string): RGB => {
  const colour = parseColour(value)
  return colour && colour.every(finite) ? [colour[0], colour[1], colour[2]] : C.muted
}

/**
 * Creates (but does not save) a personal reflection PDF entirely on the device.
 * Both supplied local artworks are embedded, independently of the UI's selected tab.
 * Styled artwork is comparison-only, never an input to measurements or interpretation.
 * No rasterized UI, generation, network, or substitute artwork is used.
 */
export async function createReflectionPdf(input: ReflectionPdfInput): Promise<jsPDF> {
  const pdf = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4', compress: true, putOnlyUsedFonts: true })
  const fonts = installReflectionFonts(pdf)
  const printable = (value: string) => Array.from(clean(value)).map((character) => {
    const code = character.codePointAt(0)!
    if (fonts.supports(code)) return character
    const decomposed = character.normalize('NFKD').replace(/[\u0300-\u036f]/g, '')
    if (Array.from(decomposed).every((part) => fonts.supports(part.codePointAt(0)!))) return decomposed
    return `[U+${code.toString(16).toUpperCase().padStart(4, '0')}]`
  }).join('')
  const unsupportedTitle = Array.from(clean(input.title)).some((character) => !fonts.supports(character.codePointAt(0)!))
  pdf.setProperties({
    title: input.title || 'My Rain & Me reflection',
    subject: 'Personal art reflection: recorded drawing process and user-selected choices; not a medical record, assessment, or diagnosis.',
    author: 'Rain & Me',
    creator: 'Rain & Me · local reflection export',
    keywords: 'personal reflection, original artwork, styled artwork comparison, user choices, non-diagnostic',
  })
  const body = (size = 10, colour = C.ink, bold = false) => {
    pdf.setFont(fonts.body, bold ? 'bold' : 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(...colour)
    pdf.setCharSpace(0)
  }
  const text = (value: string, x: number, y: number, size = 10, colour = C.ink, bold = false, align: 'left' | 'center' | 'right' = 'left') => {
    body(size, colour, bold)
    pdf.text(printable(value), x, y, { align })
  }
  const line = (x1: number, y1: number, x2: number, y2: number, colour = C.line, width = .25) => {
    pdf.setDrawColor(...colour)
    pdf.setLineWidth(width)
    pdf.line(x1, y1, x2, y2)
  }
  const rect = (x: number, y: number, width: number, height: number, colour = C.white) => {
    pdf.setFillColor(...colour)
    pdf.rect(x, y, width, height, 'F')
  }
  const label = (value: string, x: number, y: number) => text(value.toUpperCase(), x, y, 8.5, C.teal, true)
  const heading = (value: string, x: number, y: number, size = 28) => {
    pdf.setFont(fonts.heading, 'normal')
    pdf.setFontSize(size)
    pdf.setTextColor(...C.teal)
    pdf.setCharSpace(0)
    pdf.text(printable(value), x, y)
  }
  const linesFor = (value: string, width: number, size = 10, bold = false): string[] => {
    body(size, C.ink, bold)
    return pdf.splitTextToSize(printable(value), width) as string[]
  }
  const paragraph = (value: string, x: number, y: number, width = W, size = 10, colour = C.ink, leading = 4.7, maxBottom = BOTTOM, bold = false) => {
    const rows = linesFor(value, width, size, bold)
    if (y + (rows.length - 1) * leading > maxBottom + .01) throw new Error('The reflection report contains more text than this layout can safely fit. Please shorten the title or reflection choices and try again; no content has been clipped.')
    body(size, colour, bold)
    rows.forEach((row, index) => pdf.text(row, x, y + index * leading))
    return y + rows.length * leading
  }
  let started = false
  const page = (section: string, title: string, subtitle: string) => {
    if (started) pdf.addPage()
    started = true
    rect(0, 0, 210, 297, C.paper)
    rect(0, 0, 210, 4, C.teal)
    label('Rain & Me / Personal reflection', M, 17)
    text(section, 192, 17, 8.5, C.muted, false, 'right')
    line(M, 24, 192, 24, C.brass, .35)
    heading(title, M, 41)
    return paragraph(subtitle, M, 51, W, 10, C.muted, 4.6, 65) + 8
  }
  // Whole paragraphs may continue on an additional page. No ellipses or silent clipping.
  const flow = (value: string, y: number, size = 10, colour = C.ink, section = 'Reflection / continued', width = W, x = M, leading = 4.6, bold = false) => {
    const rows = linesFor(value, width, size, bold)
    for (const row of rows) {
      if (y > BOTTOM) y = page(section, 'Notes, continued', 'The same local reflection record, continued without omissions.')
      text(row, x, y, size, colour, bold)
      y += leading
    }
    return y
  }
  const imageError = (styled: boolean) => styled
    ? 'The applied styled artwork could not be added to the reflection PDF. Please reapply a valid local PNG, JPEG, or WebP image and try again. It has not been silently omitted or replaced.'
    : 'The original drawing could not be added to the reflection PDF. Please try a fresh local PNG, JPEG, or WebP export; no AI image or replacement artwork will be used.'
  const inspectImage = (data: string, styled: boolean) => {
    if (!/^data:image\/(png|jpe?g|webp);base64,/i.test(data ?? '')) throw new Error(styled ? imageError(true) : 'The reflection PDF needs the original drawing as a local PNG, JPEG, or WebP data URL. Please try exporting the drawing again.')
    try {
      const image = pdf.getImageProperties(data)
      if (!finite(image.width) || !finite(image.height) || image.width <= 0 || image.height <= 0) throw new Error('Invalid image dimensions')
      return image
    } catch { throw new Error(imageError(styled)) }
  }
  const original = inspectImage(input.originalImage, false)
  const styled = input.styledArtwork ? inspectImage(input.styledArtwork.image, true) : null
  const fitImage = (data: string, image: ReturnType<jsPDF['getImageProperties']>, x: number, y: number, width: number, height: number, isStyled: boolean) => {
    const scale = Math.min(width / image.width, height / image.height)
    const iw = image.width * scale
    const ih = image.height * scale
    try { pdf.addImage(data, image.fileType, x + (width - iw) / 2, y + (height - ih) / 2, iw, ih, undefined, 'FAST') }
    catch { throw new Error(imageError(isStyled)) }
  }

  // 01 — A paired gallery. Original and applied styled images are never substituted.
  page('01 / The artworks', '', '')
  heading('A personal reflection', M, 48, 36)
  text('YOUR DRAWING, YOUR STORY', M, 61, 9, C.muted, true)
  const title = input.title || 'My Rain & Me reflection'
  let titleSize = 18
  while (titleSize > 11 && linesFor(title, W, titleSize, true).length > 3) titleSize -= 1
  const titleEnd = paragraph(title, M, 75, W, titleSize, C.ink, titleSize * .43, 112, true)
  const artY = titleEnd + 6
  const frameW = 83
  const captionRows = Math.max(2, linesFor(input.styledArtwork?.styleName || 'No styled artwork applied', frameW, 10, true).length + 1)
  const captionH = captionRows * 4.5 + 3
  const frameH = Math.min(143, 249 - artY - captionH)
  if (frameH < 90) throw new Error('The artwork title or style name is too long to leave a readable comparison. Please shorten it and export again; no title or artwork has been clipped.')
  ;[M, M + 91].forEach((x) => {
    rect(x, artY, frameW, frameH)
    pdf.setDrawColor(...C.line); pdf.setLineWidth(.3); pdf.rect(x, artY, frameW, frameH, 'S')
  })
  fitImage(input.originalImage, original, M + 4, artY + 4, frameW - 8, frameH - 8, false)
  if (styled && input.styledArtwork) fitImage(input.styledArtwork.image, styled, M + 95, artY + 4, frameW - 8, frameH - 8, true)
  else {
    const x = M + 99
    const y = artY + frameH * .38
    heading('Your original,', x, y, 20)
    heading('still yours.', x, y + 9, 20)
    line(x, y + 15, x + 28, y + 15, C.brass, .4)
    paragraph('No styled artwork applied. You can apply an artistic style in the app, then export a new comparison.', x, y + 24, 65, 10, C.muted, 4.7, artY + frameH - 6)
  }
  let cy = artY + frameH + 7
  paragraph('Original drawing', M, cy, frameW, 10, C.teal, 4.5, 258, true)
  text('Unchanged source artwork', M, cy + 5, 8.5, C.muted)
  cy = paragraph(input.styledArtwork?.styleName || 'No styled artwork applied', M + 91, cy, frameW, 10, C.teal, 4.5, 258, true)
  text(styled ? 'Applied styled artwork / comparison only' : 'No substitute or sample used', M + 91, cy, 8.5, C.muted)
  line(M, 252, 192, 252, C.brass)
  paragraph('Both artworks are fitted in full, never cropped or stretched. Scene notes, process measurements and ink estimates use the original records only; styled pixels are not analysed.', M, 259, W, 9, C.muted, 4.1)
  if (unsupportedTitle) paragraph('Title display uses Latin approximations / U+ codes; exact original title is retained in PDF metadata.', M, 272, W, 7.5, C.muted, 3.4)

  // Retained pen intervals are summed, never replaced by first-to-last spans.
  const strokes = input.strokes
  const fills = input.fills
  const pen = strokes.filter((stroke) => stroke.tool !== 'eraser')
  const validInterval = (stroke: StrokeRecord) => finite(stroke.start) && finite(stroke.end) && stroke.end >= stroke.start && finite(stroke.end - stroke.start)
  const durationOf = (stroke: StrokeRecord) => validInterval(stroke) ? (stroke.end - stroke.start) / 1000 : 0
  const insights = processInsights(strokes, fills, input.startTime)
  // Preserve every retained non-eraser interval, even imported strokes without points.
  const useShared = insights.count === pen.length && pen.every(validInterval) && finite(insights.totalSeconds)
  const groups = SUBJECTS.map((subject) => {
    const records = pen.filter((stroke) => subjectOf(stroke) === subject.id)
    const shared = insights.groups.find((group) => group.id === subject.id)
    return { ...subject, records, seconds: useShared && shared ? shared.activeSeconds : records.reduce((sum, stroke) => sum + durationOf(stroke), 0) }
  })
  const total = groups.reduce((sum, group) => sum + group.seconds, 0)
  if (!finite(total)) throw new Error('Recorded stroke durations are outside the supported range. Please try exporting the drawing again.')
  const invalidIntervals = pen.filter((stroke) => !validInterval(stroke)).length
  const zeroIntervals = pen.filter((stroke) => validInterval(stroke) && durationOf(stroke) === 0).length
  const knownEvents = [...strokes.flatMap((stroke) => validInterval(stroke) ? [stroke.start, stroke.end] : []), ...fills.flatMap((fill) => typeof fill.t === 'number' && finite(fill.t) ? [fill.t] : [])]
  const base = finite(input.startTime) && input.startTime > 0 ? input.startTime : knownEvents.length ? knownEvents.reduce((a, b) => Math.min(a, b)) : 0
  const elapsed = (time: number) => Math.max(0, (time - base) / 1000)
  const extent = knownEvents.reduce((maximum, time) => Math.max(maximum, elapsed(time)), nonnegative(input.timeUsedSeconds))
  const axisExtent = extent || 1
  const timestampedFills = fills.filter((fill) => typeof fill.t === 'number' && finite(fill.t!))
  const activity = input.activity

  // 02 — A composed 3-column / 2-row scene table and practical reflection notes.
  let y = page('02 / Scene & meaning', 'The details you described', 'Your confirmations, not automated interpretations. Unchosen details remain unknown; the meaning of the drawing remains yours.')
  const scene = input.scene
  const extras: Record<string, string> = { puddles: 'Puddles / reflections', reflections: 'Reflections', people: 'Other people / company', company: 'Company', shelter: 'House, tree or shelter', house: 'House', tree: 'Tree', none: 'None of the listed details' }
  const figure = scene.figure
  const descriptors = [
    { label: 'Expression', value: ({ smiling: 'Smiling', neutral: 'Neutral', sad: 'Frowning / sad' } as Record<string, string>)[scene.expression] || 'Not described yet' },
    { label: 'Posture', value: ({ upright: 'Upright', hunched: 'Hunched / bent over', moving: 'Walking / moving', small: 'Small figure' } as Record<string, string>)[scene.posture] || 'Not described yet' },
    { label: 'Umbrella', value: ({ covering: 'Covering the figure', partial: 'Partial cover', broken: 'Broken umbrella', none: 'No umbrella' } as Record<string, string>)[scene.umbrella] || 'Not described yet' },
    { label: 'Rain', value: ({ light: 'Light rain', moderate: 'Moderate rain', heavy: 'Heavy rain', personal: 'Rain only on the figure' } as Record<string, string>)[scene.rain] || 'Not described yet' },
    { label: 'Additional elements', value: scene.extras.length ? scene.extras.map((extra) => extras[extra] || clean(extra)).join('; ') : 'Not described yet' },
    { label: 'Figure / composition', value: `${figure?.size && figure.size !== 'unspecified' ? `${figure.size} size` : 'Size not described'}; ${figure?.position && figure.position !== 'unspecified' ? `${figure.position.replace(/-/g, ' ')} position` : 'position not described'}` },
  ]
  label('You described / six scene details', M, y)
  y += 6
  for (let row = 0; row < 2; row++) {
    const items = descriptors.slice(row * 3, row * 3 + 3)
    const rh = Math.max(24, ...items.map((item) => linesFor(item.value, 48, 10).length * 4.5 + 14))
    rect(M, y, W, rh, C.white)
    items.forEach((item, column) => {
      const x = M + column * 58
      if (column) line(x, y + 4, x, y + rh - 4)
      label(item.label, x + 5, y + 7)
      paragraph(item.value, x + 5, y + 14, 48, 10, C.ink, 4.5)
    })
    line(M, y + rh, 192, y + rh)
    y += rh
  }
  y += 13
  label('Putting the record to use', M, y)
  y += 7
  const guide = [
    ['What the record shows', insights.guidance.observation.replace(/\b1 strokes remain\b/g, '1 stroke remains')],
    ['One question to explore', insights.guidance.question],
    ['Your chosen next step', activity.plan?.statement || 'No action chosen yet. Name a feeling, choose a genuinely available support, then make a small when–then plan in the app.'],
  ]
  guide.forEach(([name, value]) => {
    const rows = linesFor(value, 121, 10)
    const height = Math.max(14, rows.length * 4.5 + 9)
    if (y + height > 214) y = page('Scene & meaning / continued', 'Your own meanings', 'Reflection guidance from original retained records and your actual choices.')
    paragraph(name, M, y, 43, 9, C.teal, 4.2, BOTTOM, true)
    const rowEnd = paragraph(value, M + 53, y, 121, 10, C.ink, 4.5)
    line(M, rowEnd + 2, 192, rowEnd + 2)
    y = rowEnd + 9
  })
  if (insights.revisits) y = flow(`Returns after another subject: ${insights.revisits}. This can be detail work or revision; it is not a symptom.`, y + 2, 8.5, C.muted) + 5
  if (y > 211) y = page('Ink / continued', 'Colour, without conclusions', 'Estimates of retained original stroke ink, not a reading of styled pixels.')
  label('Measured / estimated ink distribution', M, y)
  y += 6
  const ink = paletteUsage(strokes).filter((item) => finite(item.share) && item.share > 0)
  if (!ink.length) y = paragraph('No usable retained ink colours to compare.', M, y + 4, W, 10, C.muted) + 3
  else {
    let inkX = M
    ink.forEach((item) => { const width = W * item.share / 100; rect(inkX, y, width, 8, rgb(item.color)); inkX += width })
    y += 17
    ink.slice(0, 6).forEach((item, index) => {
      const x = M + index % 3 * 59
      const iy = y + Math.floor(index / 3) * 9
      rect(x, iy - 3, 3.5, 3.5, rgb(item.color))
      text(`${item.color}  /  ${item.share.toFixed(1)}%`, x + 6, iy, 9)
    })
    y += Math.ceil(Math.min(6, ink.length) / 3) * 9
    if (ink.length > 6) y = flow(`Six largest colours labelled; the bar includes all ${count(ink.length)} retained ink colours.`, y, 8.5, C.muted) + 2
  }
  flow('Ink shares are estimates weighted by stroke length, brush width and opacity—not final pixel area. Eraser, fills, background and AI restyling are excluded. They do not diagnose mood or personality; your colour–feeling links are your personal meanings.', y + 2, 9, C.muted, 'Ink method / continued', W, M, 4.1)

  // 03 — Numeric hierarchy, share chart and genuine timestamp lanes.
  y = page('03 / Recorded process', 'How the page took shape', 'Measured from retained marks and timestamps. Time, revisits and colour are not stress or personality indicators.')
  const metricY = y
  rect(M, metricY - 3, W, 27, C.teal)
  const metrics = [
    ['SESSION ELAPSED', seconds(input.timeUsedSeconds)],
    ['PEN ACTIVE', seconds(total)],
    ['PEN STROKES', count(pen.length)],
    ['FILLS / UNDOS', `${count(fills.length)} / ${count(input.undoCount)}`],
  ]
  metrics.forEach(([name, value], index) => {
    const x = M + 5 + index * 43
    text(name, x, metricY + 4, 8.5, C.white, true)
    let size = 18
    body(size, C.white, true)
    while (size > 10 && pdf.getTextWidth(value) > 37) { size--; body(size, C.white, true) }
    text(value, x, metricY + 16, size, C.white, true)
    if (index) line(x - 3, metricY + 2, x - 3, metricY + 18, [93, 123, 116], .2)
  })
  y = metricY + 32
  label('Measured / share of retained pen-active time', M, y)
  y = paragraph(`Denominator: ${seconds(total)} · all non-eraser strokes, including unlabelled`, M, y + 7, W, 9, C.muted, 4.2) + 5
  const chartX = 62
  const chartW = 78
  text('ACTIVE TIME', 167, y - 2, 8.5, C.muted, true, 'right')
  text('SHARE', 192, y - 2, 8.5, C.muted, true, 'right')
  groups.forEach((group, index) => {
    const gy = y + 8 + index * 10
    const share = total > 0 ? group.seconds / total * 100 : null
    text(group.label, M, gy, 9.5)
    rect(chartX, gy - 3.4, chartW, 4.5, C.pale)
    if (share !== null && share > 0) rect(chartX, gy - 3.4, chartW * share / 100, 4.5, rgb(group.color))
    text(seconds(group.seconds), 167, gy, 10, C.ink, true, 'right')
    text(share === null ? 'n/a' : `${share.toFixed(1)}%`, 192, gy, 10, C.teal, true, 'right')
    line(M, gy + 4.5, 192, gy + 4.5, C.line, .15)
  })
  y += 8 + groups.length * 10 + 3
  y = paragraph(total > 0
    ? `Labelled coverage: ${((total - (groups.find((group) => group.id === 'unlabelled')?.seconds || 0)) / total * 100).toFixed(1)}% of pen-active time. Fills have no duration and are excluded; erasing is also excluded. Displayed numbers are rounded.`
    : 'No positive pen duration is recorded, so time shares and labelled-time coverage are unavailable (n/a). Fills and erasing are excluded from the share chart.', M, y, W, 9, C.muted, 4.2) + 8
  label('Measured / real timeline lanes', M, y)
  y = paragraph('Seconds since session start · bars = stroke intervals · dots = timestamped fills', M, y + 6, W, 9, C.muted, 4.2) + 5
  const tx = 53
  const tw = 139
  const top = y
  const bottom = top + 35
  rect(tx, top - 4, tw, 43, C.white)
  for (let tick = 0; tick <= 4; tick++) {
    const x = tx + tw * tick / 4
    line(x, top - 4, x, bottom + 4, C.line, .2)
    if (extent > 0 || tick === 0) text(`${(extent * tick / 4).toLocaleString('en-GB', { maximumFractionDigits: 1 })} s`, x, bottom + 10, 8.5, C.muted, false, tick === 0 ? 'left' : tick === 4 ? 'right' : 'center')
  }
  const lanes = [...SUBJECTS, { id: 'eraser', label: 'Eraser', color: '#9d6874' }]
  lanes.forEach((lane, index) => {
    const ly = top + index * 7
    text(lane.id === 'scene' ? 'Other' : lane.label, M, ly + 1, 9)
    line(tx, ly, tx + tw, ly, C.line, .18)
    const records = strokes.filter((stroke) => lane.id === 'eraser' ? stroke.tool === 'eraser' : stroke.tool !== 'eraser' && subjectOf(stroke) === lane.id)
    records.filter(validInterval).forEach((stroke) => {
      const x1 = tx + Math.min(1, elapsed(stroke.start) / axisExtent) * tw
      const x2 = tx + Math.min(1, elapsed(stroke.end) / axisExtent) * tw
      if (x2 > x1) line(x1, ly, x2, ly, rgb(lane.color), 1.8)
      else line(x1, ly - 1, x1, ly + 1, rgb(lane.color), .3)
    })
    if (lane.id !== 'eraser') timestampedFills.filter((fill) => subjectOf(fill) === lane.id).forEach((fill) => {
      const x = tx + Math.min(1, elapsed(fill.t!) / axisExtent) * tw
      pdf.setFillColor(...rgb(lane.color)); pdf.circle(x, ly, .85, 'F')
    })
  })
  const beforeStart = knownEvents.filter((event) => event < base).length
  flow(`${count(strokes.filter(validInterval).length)}/${count(strokes.length)} stroke intervals plotted; ${count(timestampedFills.length)}/${count(fills.length)} fills timestamped. ${count(zeroIntervals)} zero-duration pen strokes; ${count(invalidIntervals)} invalid pen intervals omitted from duration.${beforeStart ? ` ${count(beforeStart)} event endpoints precede the start and appear at 0 s.` : ''}`, bottom + 16, 8.5, C.muted, 'Process method / continued', W, M, 4)

  // 04 — Every actual choice, with self-reported intensity, not clinical ratings.
  y = page('04 / Your choices', 'What you chose to carry', `You chose these reflection responses. ${activity.status === 'complete' ? 'This reflection is complete (3 of 3 activities completed).' : `This reflection is unfinished (${count(activity.completedActivities)} of 3 activities completed); the choices already made are kept.`}`)
  label('You chose / feelings & intensity', M, y)
  y += 7
  const feelings = activity.feelings
  if (!feelings.length) {
    rect(M, y, W, 31, C.white)
    heading('No feelings selected yet.', M + 6, y + 13, 21)
    text('This space is open; nothing has been inferred.', M + 6, y + 23, 10, C.muted)
    y += 39
  }
  for (let row = 0; row < Math.ceil(feelings.length / 3); row++) {
    const entries = feelings.slice(row * 3, row * 3 + 3)
    const sizes = entries.map((feeling) => {
      let size = 15 + ([1, 2, 3].includes(feeling.intensity) ? feeling.intensity : 1) * 3
      while (size > 12 && linesFor(feeling.word, 46, size, true).length > 1) size--
      return size
    })
    const rh = Math.max(28, ...entries.map((feeling, index) => linesFor(feeling.word, 46, sizes[index], true).length * sizes[index] * .42 + 18))
    if (y + rh > 160) y = page('Your choices / continued', 'Your selected feelings', 'Each intensity is your own response, not a clinical rating.')
    entries.forEach((feeling, index) => {
      const x = M + index * 59
      const intensity = [1, 2, 3].includes(feeling.intensity) ? feeling.intensity : null
      rect(x, y, 56, rh, C.white)
      line(x, y, x + 56, y, C.brass, .4)
      const end = paragraph(feeling.word, x + 5, y + 12, 46, sizes[index], C.teal, sizes[index] * .42, y + rh - 10, true)
      // Exactly the selected 1/2/3 segments; absent intensity leaves all unfilled.
      for (let step = 0; step < 3; step++) rect(x + 5 + step * 6, end + 1, 4.5, 1.6, intensity && step < intensity ? C.teal : C.line)
      paragraph(intensity ? `${intensity}/3 · ${feeling.intensityLabel}` : 'Intensity not selected', x + 25, end + 3, 26, 8.5, C.muted, 3.8, y + rh - 1)
    })
    y += rh + 4
  }
  y = flow('Word size and filled segments show only your self-reported intensity: 1 A little · 2 Somewhat · 3 Strongly. Not a diagnostic scale.', y + 1, 8.5, C.muted, 'Your choices / continued', W, M, 4) + 5
  label('You chose / personal colour connections', M, y)
  y += 7
  if (!feelings.length) y = flow('No selected feelings or colour connections yet.', y, 10, C.muted)
  feelings.forEach((feeling) => {
    const match = activity.colourLinks.find((item) => item.feeling === feeling.id)
    const value = match ? `${feeling.word} — ${match.colourName} / ${match.colour} · ${match.source === 'drawing' ? 'drawing colour' : 'personal palette (not a drawing colour)'}` : `${feeling.word} — no colour match chosen; no meaning assigned.`
    if (y + linesFor(value, W - 8, 9.5).length * 4.3 > BOTTOM - 8) y = page('Your choices / continued', 'Your colour connections', 'Personal associations, never universal colour rules.')
    if (match) { rect(M, y - 3, 4, 4, rgb(match.colour)); pdf.setDrawColor(...C.line); pdf.rect(M, y - 3, 4, 4, 'S') }
    y = flow(value, y, 9.5, match ? C.ink : C.muted, 'Your choices / continued', W - 8, M + 8, 4.3) + 1
  })
  y = flow('These are your associations, not universal colour rules or an analysis of the drawing.', y + 1, 8.5, C.muted, 'Your choices / continued', W, M, 4) + 5
  if (y > 214) y = page('Your choices / continued', 'Support & a small step', 'Only your self-confirmed available supports and chosen intention.')
  label('You chose / available supports', M, y)
  y += 7
  if (!activity.resources.length) y = flow('No available supports selected yet.', y, 10, C.muted)
  activity.resources.forEach((resource) => { y = flow(`${resource.category} / ${resource.label}`, y, 10, C.ink, 'Your supports / continued') + 1 })
  y += 5
  const plan = activity.plan?.statement || 'No when–then action chosen yet. Your next step remains open; no action has been invented.'
  const planHeight = linesFor(plan, W - 12, 11, true).length * 4.8 + 20
  if (y + planHeight > BOTTOM - 8) y = page('Your choices / continued', 'Your when–then intention', 'A chosen small step, not a prescription or automatic action.')
  if (planHeight <= BOTTOM - y) {
    rect(M, y - 3, W, planHeight, C.pale)
    label('You chose / one when–then intention', M + 6, y + 5)
    y = paragraph(plan, M + 6, y + 14, W - 12, 11, activity.plan ? C.teal : C.muted, 4.8, BOTTOM - 4, true) + 8
  } else {
    label('You chose / one when–then intention', M, y)
    y = flow(plan, y + 8, 11, C.teal, 'Your intention / continued', W, M, 4.8, true) + 8
  }
  flow('Supports are self-confirmed. A plan is only an intention; no reminder or automatic action is created. Optional experiment: try your chosen small step, then notice whether anything feels different.', y, 8.5, C.muted, 'Your choices / continued', W, M, 4)

  // 05 — Concise evidence boundaries, exact care text and configured contacts.
  y = page('05 / Evidence & care', 'A reflection, not a verdict', 'A personal art keepsake, not a medical record, psychological score, validated assessment or treatment.')
  const evidence = [
    { text: 'WHO practical stress skills are evidence-informed. These independently written, adapted reflection prompts have not themselves been clinically validated.', label: 'WHO / Doing What Matters in Times of Stress', url: 'https://www.who.int/publications/i/item/9789240003927' },
    { text: 'Person-in-the-Rain needs more empirical validation. Its projective interpretations are not conclusions about this drawing or its maker.', label: 'Southwestern College / Person-in-the-Rain review', url: 'https://www.swc.edu/wp-content/uploads/Draw-a-Person-in-the-Rain.pdf' },
    { text: 'A human-figure drawing study found poor discrimination by single drawing features. This is related evidence, not a direct validation study of Person-in-the-Rain.', label: 'Human-figure study / PMC9204051', url: 'https://pmc.ncbi.nlm.nih.gov/articles/PMC9204051/' },
  ]
  label('What the sources do—and do not—support', M, y)
  y += 8
  evidence.forEach((item) => {
    y = flow(item.text, y, 10)
    const rows = linesFor(item.label, W, 9, true)
    rows.forEach((row) => { body(9, C.teal, true); pdf.textWithLink(printable(row), M, y, { url: item.url }); y += 4.2 })
    line(M, y + 1, 192, y + 1, C.line, .2)
    y += 8
  })
  label('A note about care', M, y)
  y += 7
  const careHeight = linesFor(CARE_DISCLAIMER, W - 12, 10).length * 4.6 + 13
  rect(M, y - 3, W, careHeight, C.white)
  line(M, y - 3, M, y - 3 + careHeight, C.brass, .8)
  y = paragraph(CARE_DISCLAIMER, M + 6, y + 4, W - 12, 10, C.ink, 4.6) + 13
  label(`Need support? / ${resources.region} resources`, M, y)
  y += 8
  resources.support.forEach((resource) => {
    const value = `${resource.label} · ${resource.value} — ${resource.detail}`
    const rows = linesFor(value, W, 10, true)
    rows.forEach((row) => { body(10, C.teal, true); pdf.textWithLink(printable(row), M, y, { url: resource.href }); y += 4.6 })
    y += 3
  })
  y += 7
  if (y + 32 > BOTTOM) y = page('Method / continued', 'How to read these pages', 'Three clearly separated sources of information; no diagnostic inference.')
  label('How to read this report', M, y)
  y += 7
  y = flow('Measured: retained original strokes, fills and timestamps. You described: scene details you confirmed. You chose: your feelings, personal colour links, available supports and intention. Missing responses stay missing.', y, 9.5, C.muted, 'Method / continued', W, M, 4.3) + 4
  flow('The applied artistic style is shown for visual comparison only. It contributes no evidence, score, colour meaning or psychological interpretation.', y, 9.5, C.muted, 'Method / continued', W, M, 4.3)

  // 06 — Original nine references retained verbatim, with generous readable leading.
  y = page('06 / References', 'Sources & historical context', 'The original nine drawing references are retained, not endorsements of individual inference. Activity guidance sources appear separately in Evidence & care.')
  for (let index = 0; index < references.length; index++) {
    const rows = linesFor(references[index], W - 11, 10)
    const height = rows.length * 4.5 + 7
    if (y + height > BOTTOM) y = page('References / continued', 'Sources, continued', 'Original drawing bibliography. These citations do not establish a diagnosis or validate any inference about you.')
    text(`${index + 1}.`, M, y, 10, C.brass, true)
    const url = references[index].match(/https?:\/\/\S+/)?.[0]
    // Long individual citations can continue too; the text itself is never shortened.
    for (const row of rows) {
      if (y > BOTTOM - 3) y = page('References / continued', 'Sources, continued', 'The preceding citation continues below without omissions.')
      text(row, M + 11, y, 10)
      if (url) pdf.link(M + 11, y - 3, W - 11, 4.5, { url })
      y += 4.5
    }
    line(M + 11, y + 1, 192, y + 1, C.line, .15)
    y += 7
  }

  // Final page counts include any text continuations; footers never use stale totals.
  const pages = pdf.getNumberOfPages()
  for (let index = 1; index <= pages; index++) {
    pdf.setPage(index)
    line(M, 280, 192, 280, C.brass, .3)
    text('Measured / You described / You chose', M, 286, 7.5, C.muted)
    const release = input.release ? `Rain & Me · ${clean(input.release)}` : 'Rain & Me · local export'
    const releaseRows = linesFor(release, 145, 7.5)
    // The version marker is not substantive reflection content.
    if (releaseRows.length <= 2) releaseRows.forEach((row, rowIndex) => text(row, M, 290 + rowIndex * 3, 7.5, C.muted))
    else text('Rain & Me · local reflection export', M, 291, 7.5, C.muted)
    text(`${String(index).padStart(2, '0')} / ${String(pages).padStart(2, '0')}`, 192, 287, 9, C.teal, true, 'right')
  }
  return pdf
}
