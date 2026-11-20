import type { ActivityOutcome } from './activities'

export function downloadActivityBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  document.body.appendChild(anchor)
  anchor.click()
  anchor.remove()
  window.setTimeout(() => URL.revokeObjectURL(url), 10000)
}
export function exportActivityJSON(outcome: ActivityOutcome) {
  if (outcome.status !== 'complete') throw new Error('Complete all three activities before downloading.')
  downloadActivityBlob(new Blob([JSON.stringify(outcome, null, 2)], { type: 'application/json' }), 'my-reflection-choices.json')
}
/** Break overlong tokens too; every subsequent block is placed after the measured text. */
export function wrapActivityText(context: CanvasRenderingContext2D, text: string, maxWidth: number): string[] {
  const lines: string[] = []
  let line = ''
  for (const word of text.split(/\s+/)) {
    if (context.measureText(word).width > maxWidth) {
      if (line) { lines.push(line); line = '' }
      let chunk = ''
      for (const character of word) {
        if (chunk && context.measureText(chunk + character).width > maxWidth) { lines.push(chunk); chunk = character } else chunk += character
      }
      line = chunk
    } else if (line && context.measureText(`${line} ${word}`).width > maxWidth) { lines.push(line); line = word } else line = line ? `${line} ${word}` : word
  }
  if (line) lines.push(line)
  return lines
}
export async function exportActivityPNG(outcome: ActivityOutcome) {
  if (outcome.status !== 'complete') throw new Error('Complete all three activities before downloading.')
  const canvas = document.createElement('canvas')
  canvas.width = 1100
  const context = canvas.getContext('2d')
  if (!context) throw new Error('PNG export is unavailable in this browser. Try JSON instead.')
  const draw: Array<() => void> = []
  let y = 68
  const text = (content: string, size = 24, colour = '#334542', weight = '400', x = 64, width = 972) => {
    const font = `${weight} ${size}px system-ui, sans-serif`
    context.font = font
    const lines = wrapActivityText(context, content, width)
    const top = y
    draw.push(() => {
      context.font = font; context.fillStyle = colour; context.textBaseline = 'top'
      lines.forEach((line, index) => context.fillText(line, x, top + index * size * 1.45))
    })
    y += lines.length * size * 1.45
  }
  const heading = (content: string) => { y += 30; text(content, 29, '#253d39', '700'); y += 16 }
  text('MY CHOICES / MY NEXT STEP', 17, '#526762', '700')
  y += 14
  text(outcome.title, 40, '#253d39', '700')
  y += 12
  text('A personal reflection, not a personality assessment or diagnosis.', 21)
  heading('01 / What I am feeling')
  text('Word size reflects only the intensity I chose: 1 a little, 2 somewhat, 3 strongly.', 19)
  y += 20
  let cloudX = 64
  let cloudY = y
  let rowHeight = 0
  outcome.feelings.forEach((feeling) => {
    const size = [26, 36, 46][feeling.intensity - 1]
    const font = `600 ${size}px system-ui, sans-serif`
    context.font = font
    const width = context.measureText(feeling.word).width + 38
    const height = size * 1.45 + 20
    if (cloudX + width > 1036) { cloudX = 64; cloudY += rowHeight + 14; rowHeight = 0 }
    const x = cloudX; const top = cloudY
    draw.push(() => {
      context.fillStyle = '#e5eee9'; context.fillRect(x, top, width, height)
      context.fillStyle = '#253d39'; context.font = font; context.textBaseline = 'top'; context.fillText(feeling.word, x + 19, top + 10)
    })
    cloudX += width + 14; rowHeight = Math.max(rowHeight, height)
  })
  y = cloudY + rowHeight + 18
  text(outcome.feelings.map((feeling) => `${feeling.word}: ${feeling.intensity}/3 (${feeling.intensityLabel.toLowerCase()})`).join(' · '), 19)
  heading('02 / The colour meanings I chose')
  for (const link of outcome.colourLinks) {
    const top = y + 4
    draw.push(() => { context.fillStyle = '#ffffff'; context.fillRect(64, top, 28, 28); context.fillStyle = link.colour; context.fillRect(64, top, 28, 28); context.strokeStyle = '#64756f'; context.strokeRect(64, top, 28, 28) })
    text(`${link.meaning} (${link.source === 'drawing' ? 'Colour used in my drawing' : 'Optional personal palette; not a drawing colour'})`, 22, '#334542', '400', 108, 928)
    y += 14
  }
  text('These are my associations today, not universal colour meanings.', 19)
  heading('03 / My available supports')
  const umbrellaY = y
  draw.push(() => {
    context.beginPath(); context.moveTo(430, umbrellaY + 70); context.quadraticCurveTo(550, umbrellaY - 55, 670, umbrellaY + 70)
    context.quadraticCurveTo(640, umbrellaY + 43, 610, umbrellaY + 70); context.quadraticCurveTo(580, umbrellaY + 43, 550, umbrellaY + 70)
    context.quadraticCurveTo(520, umbrellaY + 43, 490, umbrellaY + 70); context.quadraticCurveTo(460, umbrellaY + 43, 430, umbrellaY + 70)
    context.fillStyle = '#dce8e1'; context.fill(); context.strokeStyle = '#3c5b50'; context.lineWidth = 3; context.stroke()
    context.beginPath(); context.moveTo(550, umbrellaY + 70); context.lineTo(550, umbrellaY + 100); context.quadraticCurveTo(550, umbrellaY + 124, 528, umbrellaY + 112); context.stroke()
  })
  y += 140
  for (const resource of outcome.resources) { text(`${resource.category} / ${resource.label}`, 23, '#334542', '600'); y += 12 }
  text('Availability is confirmed by me, not checked by the app.', 19)
  heading('My if/when–then plan')
  const planTop = y - 12
  text(outcome.plan!.statement, 29, '#253d39', '700', 86, 928)
  const planBottom = y + 16
  draw.unshift(() => { context.fillStyle = '#e5eee9'; context.fillRect(64, planTop, 972, planBottom - planTop) })
  y = planBottom + 24
  text(`Resource for this step: ${outcome.resources.find((resource) => resource.id === outcome.plan!.resourceId)?.label ?? ''}`, 21)
  y += 14
  text('This is an intention to try, not a scheduled reminder or automatic action.', 19)
  y += 35
  text('Custom reflection activities; not clinically validated treatment. Exported locally from my actual choices.', 18)
  y += 14
  text(`Created ${outcome.exportedAt.slice(0, 10)} · 3/3 activities complete`, 18)
  canvas.height = Math.ceil(y + 60)
  context.fillStyle = '#fbf7ed'; context.fillRect(0, 0, canvas.width, canvas.height)
  context.strokeStyle = '#c5cec4'; context.lineWidth = 2; context.strokeRect(30, 30, canvas.width - 60, canvas.height - 60)
  draw.forEach((command) => command())
  const blob = await new Promise<Blob>((resolve, reject) => canvas.toBlob((value) => value ? resolve(value) : reject(new Error('Could not create a PNG. Try JSON instead.')), 'image/png'))
  downloadActivityBlob(blob, 'my-reflection-keepsake.png')
}
