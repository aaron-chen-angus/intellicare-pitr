import { clamp, floodFill } from './engine'
import type { FillOperation, StrokeRecord } from './types'

export const drawRecord = (ctx: CanvasRenderingContext2D, record: StrokeRecord) => {
  if (record.points.length === 0) return
  ctx.save()
  const isEraser = record.tool === 'eraser'
  ctx.globalCompositeOperation = isEraser ? 'destination-out' : record.tool === 'highlighter' ? 'multiply' : 'source-over'
  const toolAlpha = record.tool === 'watercolour' ? .3 : record.tool === 'highlighter' ? .24 : record.opacity / 100
  ctx.globalAlpha = isEraser ? 1 : toolAlpha
  ctx.lineCap = 'round'
  ctx.lineJoin = 'round'
  ctx.strokeStyle = isEraser ? 'rgba(0,0,0,1)' : record.color
  if (record.tool === 'airbrush') ctx.shadowBlur = Math.max(8, record.size * 1.8)
  if (record.tool === 'watercolour') ctx.shadowBlur = Math.max(4, record.size * .65)
  if (record.tool === 'pencil') ctx.globalAlpha *= .78
  if (record.tool === 'crayon') ctx.setLineDash([1.5, 3])
  for (let index = 1; index < record.points.length; index += 1) {
    const previous = record.points[index - 1]
    const current = record.points[index]
    const speed = Math.max(.1, Math.hypot(current.x - previous.x, current.y - previous.y) / Math.max(1, current.t - previous.t))
    let width = record.size * (.55 + current.pressure * .9)
    if (record.tool === 'calligraphy') width *= .5 + Math.abs(Math.sin(Math.atan2(current.y - previous.y, current.x - previous.x)))
    if (record.tool === 'airbrush') width *= 1.25
    if (record.tool === 'watercolour') width *= 1.35
    if (record.tool === 'crayon') width *= 1.08
    width *= clamp(1.12 - speed * .12, .72, 1.12)
    ctx.lineWidth = Math.max(1, width)
    ctx.beginPath()
    ctx.moveTo(previous.x, previous.y)
    ctx.lineTo(current.x, current.y)
    ctx.stroke()
    if (record.tool === 'airbrush' && index % 3 === 0) {
      ctx.globalAlpha = Math.max(.04, toolAlpha * .16)
      ctx.fillStyle = record.color
      ctx.beginPath()
      ctx.arc(current.x, current.y, width * 1.8, 0, Math.PI * 2)
      ctx.fill()
      ctx.globalAlpha = toolAlpha
    }
  }
  if (record.points.length === 1) {
    const point = record.points[0]
    ctx.lineWidth = record.size * (.55 + point.pressure * .9)
    ctx.beginPath()
    ctx.arc(point.x, point.y, Math.max(1, ctx.lineWidth / 2), 0, Math.PI * 2)
    ctx.stroke()
  }
  ctx.restore()
}

export const paintPaper = (canvas: HTMLCanvasElement, strokes: StrokeRecord[], fillColor: string, draft?: StrokeRecord, fillOps: FillOperation[] = []) => {
  const ctx = canvas.getContext('2d')
  if (!ctx) return
  ctx.clearRect(0, 0, canvas.width, canvas.height)
  ctx.fillStyle = fillColor
  ctx.fillRect(0, 0, canvas.width, canvas.height)
  ctx.save()
  ctx.globalAlpha = .055
  ctx.strokeStyle = '#6b7280'
  ctx.lineWidth = 1
  for (let y = 36; y < canvas.height; y += 46) {
    ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(canvas.width, y + 2); ctx.stroke()
  }
  ctx.restore()
  const operations = [
    ...strokes.map((stroke) => ({ time: stroke.start, stroke, fill: null as FillOperation | null })),
    ...fillOps.map((fill) => ({ time: fill.t ?? Number.MAX_SAFE_INTEGER, fill, stroke: null as StrokeRecord | null })),
  ].sort((a, b) => a.time - b.time)
  operations.forEach((operation) => {
    if (operation.stroke) drawRecord(ctx, operation.stroke)
    if (operation.fill) floodFill(canvas, operation.fill)
  })
  if (draft) drawRecord(ctx, draft)
  // Erasure reveals paper rather than a transparent PNG.
  ctx.save(); ctx.globalCompositeOperation = 'destination-over'; ctx.fillStyle = fillColor
  ctx.fillRect(0, 0, canvas.width, canvas.height); ctx.restore()
}

export const loadDataUrlIntoCanvas = (canvas: HTMLCanvasElement, dataUrl: string) => {
  if (!dataUrl) return
  const image = new Image()
  image.onload = () => {
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height)
  }
  image.src = dataUrl
}
