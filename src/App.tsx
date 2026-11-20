import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { browserStorage, parseGallery, parseSession } from './storage'
import { paintPaper } from './canvas'
import { paletteUsage, SUBJECTS, subjectOf } from './process'
import ProcessStory from './report/ProcessStory'
import initialScene, { ReflectionCards, type SceneDescription } from './report/ReflectionCards'
import PaletteStory from './report/PaletteStory'
import SceneSummary from './report/SceneSummary'
import DiscoveryActivities from './report/DiscoveryActivities'
import { activityColours, activityStorageKey, createActivityOutcome, parseActivityState, reconcileActivityState, type ActivityState } from './report/activities'
import { APP_RELEASE } from './version'
import './report/report-export.css'
import type { LabelSnapshot } from './report/bulk-selection'
import ReportRestyle from './restyle/ReportRestyle'
import ScrapbookArt from './ScrapbookArt'
import { GameHud, ReportRewards, TOOL_ICONS } from './GameHud'
import { STYLES, type RestyleStyleId } from './restyle/styles'
import {
  ArrowLeft,
  Check,
  ChevronDown,
  CloudRain,
  Download,
  Droplets,
  FileText,
  HelpCircle,
  Maximize2,
  Moon,
  Palette,
  Pipette,
  Redo2,
  RotateCcw,
  Save,
  Send,
  Share2,
  ShieldCheck,
  Sparkles,
  Sun,
  Timer,
  Undo2,
  Volume2,
  VolumeX,
  ZoomIn,
  ZoomOut,
} from 'lucide-react'
import resources from '../resources.config.json'
import {
  ageLabel,
  APP_NAME,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  developingMessages,
  DRAWING_SECONDS,
  palette,
  references,
  toolMeta,
} from './data'
import {
  analyseLocally,
  clamp,
  formatTime,
  hexToRgba,
  makeStroke,
} from './engine'
import type {
  AgeGroup,
  DrawingSubject,
  AnalysisReport,
  FillOperation,
  PersistedSession,
  Point,
  Screen,
  SessionProfile,
  StrokeRecord,
  ToolName,
} from './types'

const SESSION_KEY = 'rain-and-me-session-v1'
const GALLERY_KEY = 'rain-and-me-gallery-v1'

const blankProfile: SessionProfile = { name: '', ageGroup: 'adult', consent: false }

const makePointFromEvent = (event: React.PointerEvent<HTMLDivElement>, holder: HTMLDivElement, zoom: number, pan: { x: number; y: number }): Point => {
  const rect = holder.getBoundingClientRect()
  const centerX = rect.width / 2
  const centerY = rect.height / 2
  const displayX = event.clientX - rect.left
  const displayY = event.clientY - rect.top
  const unzoomedX = (displayX - centerX - pan.x) / zoom + centerX
  const unzoomedY = (displayY - centerY - pan.y) / zoom + centerY
  return {
    x: clamp((unzoomedX / rect.width) * CANVAS_WIDTH, 0, CANVAS_WIDTH),
    y: clamp((unzoomedY / rect.height) * CANVAS_HEIGHT, 0, CANVAS_HEIGHT),
    t: Date.now(),
    pressure: event.pressure > 0 ? event.pressure : 0.48,
  }
}

function App() {
  const [screen, setScreen] = useState<Screen>('welcome')
  const [profile, setProfile] = useState<SessionProfile>(blankProfile)
  const [strokes, setStrokes] = useState<StrokeRecord[]>([])
  const [redoStack, setRedoStack] = useState<StrokeRecord[]>([])
  const [fillOps, setFillOps] = useState<FillOperation[]>([])
  const [undoCount, setUndoCount] = useState(0)
  const [fillColor, setFillColor] = useState('#fffdf8')
  const [drawingDataUrl, setDrawingDataUrl] = useState('')
  const [beautifiedDataUrl, setBeautifiedDataUrl] = useState('')
  const [restyledArtwork, setRestyledArtwork] = useState<{ dataUrl: string; styleId: RestyleStyleId } | null>(null)
  const [restyleOpenRequest, setRestyleOpenRequest] = useState(0)
  const [artView, setArtView] = useState<'original' | 'restyle' | 'finish'>('original')
  const [scene, setScene] = useState<SceneDescription>(initialScene)
  const [startTime, setStartTime] = useState(0)
  const [remaining, setRemaining] = useState(DRAWING_SECONDS)
  const [autoSubmitted, setAutoSubmitted] = useState(false)
  const [timeUp, setTimeUp] = useState(false)
  const [report, setReport] = useState<AnalysisReport | null>(null)
  const [selectedTool, setSelectedTool] = useState<ToolName>('pencil')
  const [drawingSubject, setDrawingSubject] = useState<DrawingSubject>('unlabelled')
  const [color, setColor] = useState(palette[0])
  const [recentColors, setRecentColors] = useState<string[]>([])
  const [size, setSize] = useState(12)
  const [opacity, setOpacity] = useState(78)
  const [soundOn, setSoundOn] = useState(true)
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [panelOpen, setPanelOpen] = useState(false)
  const [zoom, setZoom] = useState(1)
  const [pan, setPan] = useState({ x: 0, y: 0 })
  const [brushCursor, setBrushCursor] = useState({ x: 0, y: 0, visible: false })
  const [developingIndex, setDevelopingIndex] = useState(0)
  const [confirm, setConfirm] = useState<'submit' | 'clear' | null>(null)
  const [toast, setToast] = useState('')
  const [restoreAvailable, setRestoreAvailable] = useState(false)
  const [showSupport, setShowSupport] = useState(false)
  const [pdfExporting, setPdfExporting] = useState(false)
  const [pdfError, setPdfError] = useState('')
  const pdfBusyRef = useRef(false)
  const activitySnapshotRef = useRef<{ sessionId: string; state: ActivityState } | null>(null)
  const captureActivityState = useCallback((sessionId: string, state: ActivityState) => { activitySnapshotRef.current = { sessionId, state } }, [])

  const canvasRef = useRef<HTMLCanvasElement>(null)
  const holderRef = useRef<HTMLDivElement>(null)
  const draftPointsRef = useRef<Point[]>([])
  const drawingRef = useRef(false)
  const panningRef = useRef(false)
  const panStartRef = useRef({ x: 0, y: 0, originX: 0, originY: 0 })
  const pointersRef = useRef(new Map<number, { x: number; y: number }>())
  const gestureRef = useRef<{ distance: number; startZoom: number; startPan: { x: number; y: number }; midpoint: { x: number; y: number } } | null>(null)
  const eyedropperRef = useRef(false)
  const lastCueRef = useRef(remaining)
  const currentOriginalRef = useRef(drawingDataUrl)
  currentOriginalRef.current = drawingDataUrl
  const mountedRef = useRef(true)
  useEffect(() => { mountedRef.current = true; return () => { mountedRef.current = false } }, [])

  const completedCanvas = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return ''
    return canvas.toDataURL('image/png')
  }, [])

  const chosenArtwork = () => artView === 'restyle' && restyledArtwork ? restyledArtwork.dataUrl : artView === 'finish' && beautifiedDataUrl ? beautifiedDataUrl : drawingDataUrl || completedCanvas()

  const beautifyArtwork = () => {
    const sourceData = drawingDataUrl || completedCanvas()
    if (!sourceData) return
    const source = new Image()
    source.onload = () => {
    const output = document.createElement('canvas')
    output.width = 1240
    output.height = 1754
    const ctx = output.getContext('2d')
    if (!ctx) return
    ctx.fillStyle = '#f4eee5'
    ctx.fillRect(0, 0, output.width, output.height)
    ctx.save()
    ctx.shadowColor = 'rgba(20, 35, 48, .18)'
    ctx.shadowBlur = 42
    ctx.shadowOffsetY = 18
    ctx.fillStyle = '#fffdf8'
    ctx.fillRect(58, 58, output.width - 116, output.height - 116)
    ctx.restore()
    ctx.save()
    ctx.filter = 'contrast(1.08) saturate(1.14)'
    ctx.drawImage(source, 72, 72, output.width - 144, output.height - 144)
    ctx.restore()
    const wash = ctx.createLinearGradient(70, 70, output.width - 70, output.height - 70)
    wash.addColorStop(0, 'rgba(180, 161, 212, .08)')
    wash.addColorStop(.5, 'rgba(255, 253, 248, 0)')
    wash.addColorStop(1, 'rgba(246, 179, 138, .11)')
    ctx.fillStyle = wash
    ctx.fillRect(72, 72, output.width - 144, output.height - 144)
    ctx.strokeStyle = 'rgba(31, 41, 55, .18)'
    ctx.lineWidth = 2
    ctx.strokeRect(72, 72, output.width - 144, output.height - 144)
    setBeautifiedDataUrl(output.toDataURL('image/png'))
    setArtView('finish')
    showToast('A quiet gallery finish was applied on this device.')
    }
    source.src = sourceData
  }

  const applyArtisticRestyle = async (blob: Blob, styleId: RestyleStyleId) => {
    const original = drawingDataUrl
    const bitmap = await createImageBitmap(blob)
    let dataUrl: string
    try {
      const canvas = document.createElement('canvas')
      canvas.width = bitmap.width
      canvas.height = bitmap.height
      const context = canvas.getContext('2d')
      if (!context) throw new Error('Artwork could not be prepared')
      context.fillStyle = '#fffdf8'
      context.fillRect(0, 0, canvas.width, canvas.height)
      context.drawImage(bitmap, 0, 0)
      dataUrl = canvas.toDataURL('image/png')
    } finally { bitmap.close() }
    if (!mountedRef.current || !original || currentOriginalRef.current !== original) return
    setRestyledArtwork({ dataUrl, styleId })
    setArtView('restyle')
    showToast('Artistic version applied. Your original and reflection are unchanged.')
  }

  const saveSession = useCallback((override?: Partial<PersistedSession>) => {
    if (!startTime && !override?.startTime) return
    const session: PersistedSession = {
      profile,
      startTime,
      drawingDataUrl: completedCanvas(),
      strokes,
      fillOps,
      undoCount,
      autoSubmitted,
      ...override,
    }
    browserStorage.setItem(SESSION_KEY, JSON.stringify(session))
  }, [autoSubmitted, completedCanvas, fillOps, profile, startTime, strokes, undoCount])

  const setPickedColor = (nextColor: string) => {
    setColor(nextColor)
    setRecentColors((current) => [nextColor, ...current.filter((item) => item !== nextColor)].slice(0, 8))
  }

  const showToast = (message: string) => {
    setToast(message)
    window.setTimeout(() => setToast(''), 2600)
  }

  const labelSelectedMarks = (strokeIds: string[], fillIndices: number[], subject: DrawingSubject) => {
    const selectedStrokes = new Set(strokeIds)
    const selectedFills = new Set(fillIndices)
    setStrokes((current) => current.map((stroke) => selectedStrokes.has(stroke.id) ? { ...stroke, subject } : stroke))
    setFillOps((current) => current.map((fill, index) => selectedFills.has(index) ? { ...fill, subject } : fill))
  }

  const restoreMarkLabels = (snapshot: LabelSnapshot) => {
    const oldStrokes = new Map(snapshot.strokes.map(({ id, subject }) => [id, subject]))
    const oldFills = new Map(snapshot.fills.map(({ index, subject }) => [index, subject]))
    setStrokes((current) => current.map((stroke) => oldStrokes.has(stroke.id) ? { ...stroke, subject: oldStrokes.get(stroke.id)! } : stroke))
    setFillOps((current) => current.map((fill, index) => oldFills.has(index) ? { ...fill, subject: oldFills.get(index)! } : fill))
  }

  const playChime = useCallback(() => {
    if (!soundOn) return
    try {
      const AudioContextClass = window.AudioContext || (window as typeof window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext
      if (!AudioContextClass) return
      const context = new AudioContextClass()
      const oscillator = context.createOscillator()
      const gain = context.createGain()
      oscillator.frequency.value = 520
      oscillator.type = 'sine'
      gain.gain.setValueAtTime(.0001, context.currentTime)
      gain.gain.exponentialRampToValueAtTime(.06, context.currentTime + .03)
      gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .55)
      oscillator.connect(gain).connect(context.destination)
      oscillator.start()
      oscillator.stop(context.currentTime + .58)
    } catch {
      // Audio is an optional delight and can be unavailable in a locked-down browser.
    }
  }, [soundOn])

  useEffect(() => {
    const savedTheme = browserStorage.getItem('rain-and-me-theme-v1')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const nextTheme = savedTheme === 'light' || savedTheme === 'dark' ? savedTheme : prefersDark ? 'dark' : 'light'
    setTheme(nextTheme)
    document.documentElement.dataset.theme = nextTheme
    const raw = browserStorage.getItem(SESSION_KEY)
    const saved = parseSession(raw)
    if (saved && !saved.submitted && Date.now() - saved.startTime < DRAWING_SECONDS * 1000) setRestoreAvailable(true)
    if (raw && !saved) browserStorage.removeItem(SESSION_KEY)
    if (import.meta.env.PROD && 'serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js', { updateViaCache: 'none' })
        .then((registration) => registration.update()).catch(() => undefined)
    }
  }, [])

  useEffect(() => {
    document.documentElement.dataset.theme = theme
    browserStorage.setItem('rain-and-me-theme-v1', theme)
  }, [theme])

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    canvas.width = CANVAS_WIDTH
    canvas.height = CANVAS_HEIGHT
    paintPaper(canvas, strokes, fillColor, undefined, fillOps)
    // Stored vectors/fills are authoritative. A stale saved bitmap must not
    // reappear when undo removes the final retained stroke.
  }, [fillColor, fillOps, screen, strokes])

  useEffect(() => {
    if (screen !== 'studio' || !startTime) return
    const update = () => {
      const nextRemaining = Math.max(0, DRAWING_SECONDS - Math.floor((Date.now() - startTime) / 1000))
      setRemaining(nextRemaining)
      if (nextRemaining <= 60 && lastCueRef.current > 60) playChime()
      if (nextRemaining <= 10 && lastCueRef.current > 10) playChime()
      lastCueRef.current = nextRemaining
      if (nextRemaining === 0 && !timeUp) {
        setAutoSubmitted(true)
        setTimeUp(true)
        setDrawingDataUrl(completedCanvas())
        window.setTimeout(() => setScreen('developing'), 1250)
      }
    }
    update()
    const timer = window.setInterval(update, 250)
    return () => window.clearInterval(timer)
  }, [completedCanvas, playChime, screen, startTime, timeUp])

  useEffect(() => {
    if (screen !== 'developing') return
    const messageTimer = window.setInterval(() => setDevelopingIndex((index) => (index + 1) % developingMessages.length), 1900)
    const reportTimer = window.setTimeout(() => {
      const nextReport = analyseLocally(strokes, Math.min(DRAWING_SECONDS, DRAWING_SECONDS - remaining), undoCount, profile.ageGroup)
      setReport(nextReport)
      setScreen('report')
      browserStorage.removeItem(SESSION_KEY)
    }, 2500)
    return () => {
      window.clearInterval(messageTimer)
      window.clearTimeout(reportTimer)
    }
  }, [completedCanvas, profile.ageGroup, remaining, screen, strokes, undoCount])

  const beginSession = () => {
    const nextStart = Date.now()
    setStartTime(nextStart)
    setRemaining(DRAWING_SECONDS)
    setStrokes([])
    setRedoStack([])
    setFillOps([])
    setUndoCount(0)
    setFillColor('#fffdf8')
    setDrawingDataUrl('')
    setAutoSubmitted(false)
    setTimeUp(false)
    setReport(null)
    setScene(initialScene)
    setArtView('original')
    setRestyledArtwork(null)
    setRestyleOpenRequest(0)
    setBeautifiedDataUrl('')
    setRestoreAvailable(false)
    setDrawingSubject('unlabelled')
    setScreen('studio')
    lastCueRef.current = DRAWING_SECONDS
    const persisted = browserStorage.setItem(SESSION_KEY, JSON.stringify({ profile, startTime: nextStart, drawingDataUrl: '', strokes: [], fillOps: [], undoCount: 0 }))
    if (!persisted) showToast('Browser storage is unavailable. Keep this tab open and download your artwork before leaving.')
  }

  const restoreSession = () => {
    const raw = browserStorage.getItem(SESSION_KEY)
    const saved = parseSession(raw)
    if (!saved) {
      browserStorage.removeItem(SESSION_KEY)
      setRestoreAvailable(false)
      showToast('The saved session could not be read. You can start a new drawing.')
      return
    }
    try {
      setProfile(saved.profile)
      setStartTime(saved.startTime)
      setRemaining(Math.max(0, DRAWING_SECONDS - Math.floor((Date.now() - saved.startTime) / 1000)))
      setStrokes(saved.strokes ?? [])
      setDrawingSubject(subjectOf(saved.strokes.at(-1) ?? {}))
      setFillOps(saved.fillOps ?? [])
      setUndoCount(saved.undoCount ?? 0)
      setDrawingDataUrl(saved.drawingDataUrl ?? '')
      setAutoSubmitted(Boolean(saved.autoSubmitted))
      setTimeUp(false)
      setRestoreAvailable(false)
      setScreen('studio')
      showToast('Your saved drawing is back on the easel.')
    } catch {
      browserStorage.removeItem(SESSION_KEY)
      setRestoreAvailable(false)
    }
  }

  const requestSubmit = () => {
    if (remaining <= 0) return
    setConfirm('submit')
  }

  const finishSession = () => {
    setConfirm(null)
    setTimeUp(false)
    setDrawingDataUrl(completedCanvas())
    setScreen('developing')
  }

  const applyClear = () => {
    setConfirm(null)
    setStrokes([])
    setRedoStack([])
    setFillOps([])
    setUndoCount(0)
    setFillColor('#fffdf8')
    setDrawingDataUrl('')
    saveSession({ strokes: [], fillOps: [], undoCount: 0, drawingDataUrl: '' })
    showToast('The paper is clear again.')
  }

  const renderDraft = (points: Point[]) => {
    const canvas = canvasRef.current
    if (!canvas || points.length === 0) return
    const draft = makeStroke(selectedTool, color, size, opacity, points)
    paintPaper(canvas, strokes, fillColor, draft, fillOps)
  }

  const handlePointerDown = (event: React.PointerEvent<HTMLDivElement>) => {
    if (timeUp) return
    const holder = holderRef.current
    const canvas = canvasRef.current
    if (!holder || !canvas) return
    pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    if (pointersRef.current.size === 2) {
      const points = Array.from(pointersRef.current.values())
      gestureRef.current = {
        distance: Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y),
        startZoom: zoom,
        startPan: pan,
        midpoint: { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 },
      }
      drawingRef.current = false
      return
    }
    if (event.button === 1 || event.shiftKey) {
      panningRef.current = true
      panStartRef.current = { x: event.clientX, y: event.clientY, originX: pan.x, originY: pan.y }
      holder.setPointerCapture(event.pointerId)
      return
    }
    const point = makePointFromEvent(event, holder, zoom, pan)
    if (eyedropperRef.current) {
      const ctx = canvas.getContext('2d')
      if (ctx) {
        const pixel = ctx.getImageData(point.x, point.y, 1, 1).data
        setPickedColor(`#${[pixel[0], pixel[1], pixel[2]].map((value) => value.toString(16).padStart(2, '0')).join('')}`)
      }
      eyedropperRef.current = false
      showToast('Colour picked from your artwork.')
      return
    }
    if (selectedTool === 'fill') {
      const operation: FillOperation = { x: point.x, y: point.y, color, tolerance: 32, t: point.t, subject: drawingSubject }
      const nextFillOps = [...fillOps, operation]
      setFillOps(nextFillOps)
      setPickedColor(color)
      window.setTimeout(() => saveSession({ fillOps: nextFillOps, drawingDataUrl: canvas.toDataURL('image/png') }), 0)
      showToast('The paper drank in that colour.')
      return
    }
    drawingRef.current = true
    draftPointsRef.current = [point]
    holder.setPointerCapture(event.pointerId)
    setBrushCursor({ x: event.clientX - holder.getBoundingClientRect().left, y: event.clientY - holder.getBoundingClientRect().top, visible: true })
    renderDraft(draftPointsRef.current)
  }

  const handlePointerMove = (event: React.PointerEvent<HTMLDivElement>) => {
    if (timeUp) return
    const holder = holderRef.current
    if (!holder) return
    if (pointersRef.current.has(event.pointerId)) pointersRef.current.set(event.pointerId, { x: event.clientX, y: event.clientY })
    const rect = holder.getBoundingClientRect()
    setBrushCursor({ x: event.clientX - rect.left, y: event.clientY - rect.top, visible: true })
    if (gestureRef.current && pointersRef.current.size >= 2) {
      const points = Array.from(pointersRef.current.values())
      const gesture = gestureRef.current
      const distanceNow = Math.max(1, Math.hypot(points[1].x - points[0].x, points[1].y - points[0].y))
      const midpointNow = { x: (points[0].x + points[1].x) / 2, y: (points[0].y + points[1].y) / 2 }
      setZoom(clamp(gesture.startZoom * (distanceNow / Math.max(1, gesture.distance)), .65, 2.6))
      setPan({ x: gesture.startPan.x + midpointNow.x - gesture.midpoint.x, y: gesture.startPan.y + midpointNow.y - gesture.midpoint.y })
      return
    }
    if (panningRef.current) {
      const start = panStartRef.current
      setPan({ x: start.originX + event.clientX - start.x, y: start.originY + event.clientY - start.y })
      return
    }
    if (!drawingRef.current) return
    const point = makePointFromEvent(event, holder, zoom, pan)
    const lastPoint = draftPointsRef.current.at(-1)
    if (!lastPoint || Math.hypot(point.x - lastPoint.x, point.y - lastPoint.y) > 1.5) {
      draftPointsRef.current = [...draftPointsRef.current, point]
      renderDraft(draftPointsRef.current)
    }
  }

  const endPointer = (event: React.PointerEvent<HTMLDivElement>) => {
    const holder = holderRef.current
    if (holder?.hasPointerCapture(event.pointerId)) holder.releasePointerCapture(event.pointerId)
    pointersRef.current.delete(event.pointerId)
    if (gestureRef.current) {
      gestureRef.current = pointersRef.current.size >= 2 ? gestureRef.current : null
      if (!gestureRef.current) return
    }
    if (panningRef.current) {
      panningRef.current = false
      return
    }
    if (!drawingRef.current) return
    drawingRef.current = false
    const points = draftPointsRef.current
    draftPointsRef.current = []
    if (points.length === 0) return
    const record = { ...makeStroke(selectedTool, color, size, opacity, points), subject: drawingSubject }
    const next = [...strokes, record]
    setStrokes(next)
    setRedoStack([])
    setPickedColor(color)
    const canvas = canvasRef.current
    if (canvas) paintPaper(canvas, next, fillColor, undefined, fillOps)
    window.setTimeout(() => saveSession({ strokes: next, drawingDataUrl: canvas?.toDataURL('image/png') ?? '' }), 0)
  }

  const undo = () => {
    if (!strokes.length) return
    const last = strokes.at(-1)!
    const next = strokes.slice(0, -1)
    setStrokes(next)
    setRedoStack((current) => [...current, last])
    const nextUndoCount = undoCount + 1
    setUndoCount(nextUndoCount)
    window.setTimeout(() => saveSession({ strokes: next, undoCount: nextUndoCount, drawingDataUrl: canvasRef.current?.toDataURL('image/png') ?? '' }), 0)
    showToast('One mark gently lifted away.')
  }

  const redo = () => {
    const next = redoStack.at(-1)
    if (!next) return
    setRedoStack((current) => current.slice(0, -1))
    setStrokes((current) => [...current, next])
    const restored = [...strokes, next]
    window.setTimeout(() => saveSession({ strokes: restored, drawingDataUrl: canvasRef.current?.toDataURL('image/png') ?? '' }), 0)
  }

  const exportPng = (original = false) => {
    const data = original ? drawingDataUrl || completedCanvas() : chosenArtwork()
    const link = document.createElement('a')
    link.download = `${profile.name || 'my'}-rain-${original ? 'original' : artView}.png`
    link.href = data
    link.click()
    showToast('Your artwork is ready to keep.')
  }

  const exportPdf = async () => {
    if (pdfBusyRef.current || !report) return
    pdfBusyRef.current = true
    setPdfExporting(true)
    setPdfError('')
    try {
      const sessionId = String(startTime)
      const raw = activitySnapshotRef.current?.sessionId === sessionId ? activitySnapshotRef.current.state : parseActivityState(browserStorage.getItem(activityStorageKey(sessionId)))
      const colors = Array.from(new Set([...paletteUsage(strokes).map((entry) => entry.color), ...fillOps.map((fill) => fill.color.toLowerCase())]))
      const available = activityColours(colors, raw.personalPalette)
      const activity = createActivityOutcome(reconcileActivityState(raw, available), available)
      const snapshot = {
        originalImage: drawingDataUrl || completedCanvas(), title: profile.name ? `${profile.name}'s Rain` : 'My Rain',
        styledArtwork: restyledArtwork ? {
          image: restyledArtwork.dataUrl,
          styleName: STYLES.find((style) => style.id === restyledArtwork.styleId)?.name ?? 'Artistic restyle',
        } : undefined,
        startTime, timeUsedSeconds: report.timeUsedSeconds, undoCount,
        strokes: structuredClone(strokes), fills: structuredClone(fillOps), scene: structuredClone(scene), activity, release: APP_RELEASE,
      }
      const { createReflectionPdf } = await import('./report/reflection-pdf')
      const pdf = await createReflectionPdf(snapshot)
      pdf.save('rain-and-me-reflection-report.pdf')
      showToast('Your reflection report download is ready.')
    } catch (error) {
      setPdfError(error instanceof Error ? `Report could not be prepared: ${error.message}` : 'Report could not be prepared. Please retry; your drawing is unchanged.')
    } finally {
      pdfBusyRef.current = false
      if (mountedRef.current) setPdfExporting(false)
    }
  }

  const shareArtwork = async () => {
    const data = chosenArtwork()
    try {
      const blob = await (await fetch(data)).blob()
      const file = new File([blob], `${profile.name || 'my'}-rain-art.png`, { type: 'image/png' })
      if (navigator.share && (!navigator.canShare || navigator.canShare({ files: [file] }))) await navigator.share({ files: [file], title: "Rain & Me artwork" })
      else exportPng()
    } catch {
      exportPng()
    }
  }

  const saveToGallery = () => {
    const existing = parseGallery(browserStorage.getItem(GALLERY_KEY))
    existing.unshift({ image: chosenArtwork(), title: `${profile.name || 'My'}'s Rain`, savedAt: Date.now() })
    const persisted = browserStorage.setItem(GALLERY_KEY, JSON.stringify(existing.slice(0, 12)))
    showToast(persisted ? 'Saved to your local gallery on this device.' : 'The gallery could not be saved. Download a PNG to keep your artwork.')
  }

  const drawAgain = () => {
    setRestyledArtwork(null)
    setRestyleOpenRequest(0)
    setArtView('original')
    setScene(initialScene)
    browserStorage.removeItem(SESSION_KEY)
    setProfile(blankProfile)
    setReport(null)
    setDrawingDataUrl('')
    setBeautifiedDataUrl('')
    setStrokes([])
    setScreen('welcome')
  }

  const timerTone = remaining <= 10 ? 'var(--coral)' : remaining <= 60 ? 'var(--peach)' : 'var(--teal)'
  const completionPercent = clamp((remaining / DRAWING_SECONDS) * 100, 0, 100)
  const selectedToolMeta = toolMeta.find((tool) => tool.id === selectedTool)
  const reportDate = useMemo(() => new Intl.DateTimeFormat('en', { month: 'short', day: 'numeric', year: 'numeric' }).format(new Date()), [])
  const displayedArtwork = chosenArtwork()

  if (screen === 'welcome') return (
    <div className="app-shell">
      <div className="ambient-wash" />
      <div className="rain-field" />
      <main className="welcome-page">
        <header className="top-nav">
          <a className="wordmark" href="./" aria-label="Rain & Me home"><span className="mark"><CloudRain size={22} /></span><span>Rain & Me</span></a>
          <div className="nav-actions">
            <button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle dark mode">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button>
            <button className="icon-button" onClick={() => setShowSupport(!showSupport)} aria-label="Show support resources"><HelpCircle size={18} /></button>
          </div>
        </header>
        <section className="hero">
          <div className="hero-copy">
            <div className="eyebrow">A quiet rain-room for making</div>
            <h1 className="display-title">Every storm has <em>a story.</em></h1>
            <p className="lede">Draw a person in the rain, then take a little longer with what you made. There is no right or wrong way to fill the page.</p>
            <ol className="quest-strip" aria-label="How it works">
              <li><span className="quest-icon"><Palette size={18} /></span><b>Draw</b><small>5 minute quest</small></li>
              <li><span className="quest-icon"><Sparkles size={18} /></span><b>Reflect</b><small>Notice the story</small></li>
              <li><span className="quest-icon"><Save size={18} /></span><b>Keep</b><small>Restyle &amp; save</small></li>
            </ol>
            <div className="instruction-card"><div className="instruction-icon"><Timer size={18} /></div><p>Draw a person in the rain. You have 5 minutes. There&apos;s no right or wrong — just draw whatever comes to mind. Tap Submit when you&apos;re done; when time runs out, your drawing will be submitted automatically.</p></div>
            <div className="profile-card">
              <div className="profile-grid">
                <label className="field-label">Name or nickname <input className="text-input" value={profile.name} onChange={(event) => setProfile({ ...profile, name: event.target.value })} placeholder="Optional" /></label>
                <label className="field-label">Age group <select className="select-input" value={profile.ageGroup} onChange={(event) => setProfile({ ...profile, ageGroup: event.target.value as AgeGroup })}><option value="child">{ageLabel.child}</option><option value="teen">{ageLabel.teen}</option><option value="adult">{ageLabel.adult}</option><option value="older">{ageLabel.older}</option></select></label>
              </div>
              <label className="consent" style={{ marginTop: 17 }}><input type="checkbox" checked={profile.consent} onChange={(event) => setProfile({ ...profile, consent: event.target.checked })} /><span>I understand this is a reflective art activity, not a psychological diagnosis.</span></label>
              <div className="hero-actions">
                <button className="primary-button" disabled={!profile.consent} onClick={beginSession}>Start drawing <Send size={16} /></button>
                {restoreAvailable && <button className="ghost-button" onClick={restoreSession}>Resume saved drawing <RotateCcw size={16} /></button>}
              </div>
              <div className="privacy-note"><ShieldCheck size={15} /> Your drawing stays on this device by default.</div>
            </div>
            {showSupport && <div className="support-box" style={{ marginTop: 14 }}><div><strong>Need support?</strong><span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>Singapore resources are here if the weather feels heavy.</span></div><a className="support-link" href="tel:1767">SOS 24-hour · 1767</a><a className="support-link" href="tel:995">Emergency · 995</a></div>}
          </div>
          <ScrapbookArt />
        </section>
        <footer className="scrapbook-footer"><p>A page for your weather. A little space for you.</p><span>01 · make / 02 · notice / 03 · keep</span></footer>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )

  if (screen === 'studio') return (
    <div className={`studio-shell ${panelOpen ? 'panel-open' : ''}`}>
      <header className="studio-topbar">
        <a className="wordmark" href="./" aria-label="Back to welcome"><span className="mark"><CloudRain size={20} /></span><span>Rain & Me</span></a>
        <div className="timer-block" aria-live="polite"><div className="timer" style={{ color: timerTone }}>{formatTime(remaining)}</div><div className="timer-meta">real-time weather window</div><div className="timer-bar"><span style={{ width: `${completionPercent}%`, background: timerTone }} /></div></div>
        <div className="studio-submit"><button className="icon-button" onClick={() => setSoundOn(!soundOn)} aria-label={soundOn ? 'Turn sound off' : 'Turn sound on'}>{soundOn ? <Volume2 size={17} /> : <VolumeX size={17} />}</button><button className="primary-button" onClick={requestSubmit}><Check size={16} /> <span className="submit-label">Submit</span></button></div>
      </header>
      <aside className="toolbar" aria-label="Drawing tools">
        {toolMeta.map((tool) => { const ToolIcon = TOOL_ICONS[tool.id]; return <button key={tool.id} className={`tool-button ${selectedTool === tool.id ? 'selected' : ''}`} onClick={() => setSelectedTool(tool.id)} aria-label={`${tool.label}: ${tool.hint}`} aria-pressed={selectedTool === tool.id}><span aria-hidden="true"><ToolIcon size={22} strokeWidth={2} /></span></button> })}
        <div className="tool-divider" />
        <button className="tool-button" onClick={undo} aria-label="Undo"><Undo2 size={19} /></button>
        <button className="tool-button" onClick={redo} aria-label="Redo"><Redo2 size={19} /></button>
        <button className="tool-button" onClick={() => setConfirm('clear')} aria-label="Clear canvas"><RotateCcw size={19} /></button>
        <button className="tool-button" onClick={() => setPanelOpen(!panelOpen)} aria-label="Open art controls"><Palette size={19} /></button>
      </aside>
      <section className="canvas-zone">
        <div className="focus-ribbon"><label>Drawing focus <select aria-label="Drawing focus" value={drawingSubject} onChange={(e) => setDrawingSubject(e.target.value as DrawingSubject)}>{SUBJECTS.map((subject) => <option key={subject.id} value={subject.id}>{subject.label}</option>)}</select></label><p>Optional: name what you are drawing to get an accurate element timeline. You can correct labels after submission.</p></div>
        <GameHud strokes={strokes} fills={fillOps} />
        <div className="paper-wrap">
          <div className="paper-shell">
            <div className="canvas-holder" ref={holderRef} onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={endPointer} onPointerCancel={endPointer} onPointerLeave={() => setBrushCursor((current) => ({ ...current, visible: false }))} onWheel={(event) => { event.preventDefault(); setZoom((value) => clamp(value + (event.deltaY > 0 ? -.08 : .08), .65, 2.6)) }}>
              <canvas ref={canvasRef} style={{ transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`, transformOrigin: 'center center' }} aria-label="Drawing paper" />
              <div className="canvas-overlay" />
              {brushCursor.visible && <div className="brush-cursor" style={{ left: brushCursor.x, top: brushCursor.y, width: size * .8, height: size * .8 }} />}
            </div>
          </div>
        </div>
        <aside className={`controls-panel ${panelOpen ? 'open' : ''}`} aria-label="Art controls">
          <div className="panel-heading"><div><div className="mini-label">Studio controls</div><h2>Make a mark</h2></div><button className="icon-button" onClick={() => setPanelOpen(false)} aria-label="Close controls"><ChevronDown size={17} /></button></div>
          <div className="control-section"><div className="tool-summary"><span style={{ fontSize: '1.35rem' }}>{selectedToolMeta?.glyph}</span><span><strong>{selectedToolMeta?.label}</strong><br /><small>{selectedToolMeta?.hint}</small></span></div><div className="range-row"><div><span>Size</span><span>{size}px</span></div><input type="range" min="1" max="80" value={size} onChange={(event) => setSize(Number(event.target.value))} /></div><div className="range-row"><div><span>Opacity</span><span>{opacity}%</span></div><input type="range" min="5" max="100" value={opacity} onChange={(event) => setOpacity(Number(event.target.value))} /></div></div>
          <div className="control-section"><div className="panel-heading"><span className="mini-label">Colour palette</span><button className="text-button" onClick={() => { eyedropperRef.current = true; showToast('Tap the paper to pick a colour.') }}><Pipette size={14} /> pick</button></div><div className="palette-grid">{palette.map((swatch) => <button key={swatch} className={`swatch ${color === swatch ? 'selected' : ''}`} style={{ background: swatch }} onClick={() => setPickedColor(swatch)} aria-label={`Choose ${swatch}`} />)}</div><div className="recent-row">{recentColors.map((swatch) => <button key={swatch} className="swatch" style={{ background: swatch }} onClick={() => setPickedColor(swatch)} aria-label={`Use recent ${swatch}`} />)}<label className="swatch" style={{ background: color, position: 'relative', overflow: 'hidden' }} aria-label="Custom color"><input type="color" value={color} onChange={(event) => setPickedColor(event.target.value)} style={{ position: 'absolute', inset: 0, opacity: 0, cursor: 'pointer' }} /></label></div></div>
          <div className="control-section"><div className="mini-label">View</div><div className="action-grid" style={{ marginTop: 11 }}><button className="small-button" onClick={() => setZoom((value) => clamp(value - .12, .65, 2.6))}><ZoomOut size={15} /> Zoom out</button><button className="small-button" onClick={() => setZoom((value) => clamp(value + .12, .65, 2.6))}><ZoomIn size={15} /> Zoom in</button><button className="small-button" onClick={() => { setZoom(1); setPan({ x: 0, y: 0 }) }}><Maximize2 size={15} /> Fit paper</button><button className="small-button" onClick={() => { eyedropperRef.current = true; showToast('Tap the paper to sample.') }}><Pipette size={15} /> Eyedropper</button></div><p className="helper-note">Tip: hold Shift or the middle mouse button to pan. The canvas also responds to trackpad or mouse-wheel zoom.</p></div>
          <div className="control-section"><div className="mini-label">A quiet reminder</div><p className="helper-note" style={{ fontSize: '.9rem', marginTop: 8 }}>There is no right or wrong. Let your hand decide where the rain goes.</p></div>
        </aside>
      </section>
      {timeUp && <div className="time-up-overlay"><div className="time-up-card"><CloudRain size={30} /><div><strong>Time’s up</strong><span>Your artwork is being collected gently.</span></div></div></div>}
      {confirm && <div className="modal-backdrop"><div className="modal" role="dialog" aria-modal="true"><h2>{confirm === 'submit' ? 'Finish your artwork?' : 'Clear the page?'}</h2><p>{confirm === 'submit' ? 'You can still keep what you made and return to it later in your local gallery.' : 'This will remove the current marks from the paper. Your saved session will be replaced.'}</p><div className="modal-actions"><button className="ghost-button" onClick={() => setConfirm(null)}>Keep drawing</button><button className="primary-button" onClick={confirm === 'submit' ? finishSession : applyClear}>{confirm === 'submit' ? 'Yes, collect it' : 'Clear paper'}</button></div></div></div>}
      {toast && <div className="toast">{toast}</div>}
    </div>
  )

  if (screen === 'developing') return <div className="loading-screen"><div className="ambient-wash" /><div className="loading-card"><div className="drop-bloom"><i /><i /><i /></div><div className="eyebrow">Developing your artwork</div><h1>{developingMessages[developingIndex]}</h1><p>Taking a gentle, exploratory look at the marks you chose.</p></div></div>

  if (!report) return null
  const supportFirst = report.supportFirst
  const title = profile.name ? `${profile.name}'s Rain` : 'Your Rain'
  return (
    <div className="app-shell">
      <div className="ambient-wash" />
      <div className="rain-field" />
      <main className="report-page">
        <header className="top-nav"><a className="wordmark" href="./" aria-label="Rain & Me home"><span className="mark"><CloudRain size={22} /></span><span>Rain & Me</span></a><div className="nav-actions"><button className="icon-button" onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')} aria-label="Toggle dark mode">{theme === 'light' ? <Moon size={18} /> : <Sun size={18} />}</button></div></header>
        <section className="report-header"><div><div className="eyebrow">A small reflection, not a verdict</div><h1>Take a little longer<br />with what you made.</h1></div><p>Meet the character, name the weather, and notice what offers protection. Use the short cues below as conversation starters—not conclusions about you.</p></section>
        {supportFirst && <div className="paper-card disclaimer" style={{ marginBottom: 18 }}><h2>First, a little support</h2><p>The page carries a lot of weather and no clear shelter shape. That is not a diagnosis or a judgement. If the drawing reflects how you feel right now, consider reaching out to someone you trust or a professional.</p><div className="support-box" style={{ marginTop: 15 }}><a className="support-link" href="tel:1767">SOS 24-hour hotline · 1767</a><a className="support-link" href="tel:995">Emergency services · 995</a></div></div>}
        <div className="report-grid">
          <figure className="artwork-card"><img src={displayedArtwork} alt={artView === 'restyle' ? 'Your AI-restyled artwork; original retained separately' : 'Your person-in-the-rain artwork'} /><figcaption className="artwork-caption"><strong>{title}</strong><span>{reportDate}</span></figcaption><div className="art-comparison"><button aria-pressed={artView === 'original'} onClick={() => setArtView('original')}>Original</button>{restyledArtwork && <button aria-pressed={artView === 'restyle'} onClick={() => setArtView('restyle')}>{STYLES.find((style) => style.id === restyledArtwork.styleId)?.name} version</button>}{beautifiedDataUrl && <button aria-pressed={artView === 'finish'} onClick={() => setArtView('finish')}>Gallery finish</button>}</div><button className="art-original-link" onClick={() => setRestyleOpenRequest((value) => value + 1)}><Sparkles size={15} /> Restyle drawing</button><button className="art-original-link" onClick={() => exportPng(true)}>Download full-size original</button></figure>
          <div className="report-stack">
            <section className="weather-card"><div className="weather-card-top"><div><div className="eyebrow eyebrow-on-dark">Your reflection notebook</div><h2>A story, not a score</h2><p>Short cues. Your meaning. One small next step.</p></div><div className="weather-icon"><CloudRain size={38} /></div></div></section>
            <ReportRewards strokes={strokes} fills={fillOps} timeUsedSeconds={report.timeUsedSeconds} />
            <ReportRestyle drawingDataUrl={drawingDataUrl} title={title} openRequest={restyleOpenRequest} onUse={applyArtisticRestyle} />
            <ReflectionCards scene={scene} onChange={setScene} />
            <SceneSummary scene={scene} />
            {report.blank && <section className="paper-card"><h2>A small first sketch</h2><p>The local reader cannot confirm a person from these marks. You can still describe your picture above and use the reflection cues—or draw again.</p></section>}
            <PaletteStory entries={paletteUsage(strokes)} />
            {fillOps.length > 0 && <div className="fill-colours"><span>Also used in fills (area not measured):</span>{Array.from(new Set(fillOps.map((f) => f.color))).map((colour) => <span key={colour}><i style={{ background: colour, display: 'inline-block', verticalAlign: 'middle' }} /> {colour}</span>)}</div>}
            <ProcessStory strokes={strokes} fills={fillOps} startTime={startTime} timeUsedSeconds={report.timeUsedSeconds} undoCount={undoCount} onRelabelMany={labelSelectedMarks} onRestoreLabels={restoreMarkLabels} onRelabel={(id, subject) => setStrokes((current) => current.map((stroke) => stroke.id === id ? { ...stroke, subject } : stroke))} onRelabelFill={(index, subject) => setFillOps((current) => current.map((fill, i) => i === index ? { ...fill, subject } : fill))} />
            <DiscoveryActivities onStateChange={captureActivityState} sessionId={String(startTime)} colors={Array.from(new Set([...paletteUsage(strokes).map((entry) => entry.color), ...fillOps.map((fill) => fill.color.toLowerCase())]))} />
            <section className="paper-card"><h2>The science behind this</h2><p>Person-in-the-Rain drawings are used in some art-therapy and assessment contexts, but interpretations are mixed and should be made by trained professionals alongside other information.</p><details><summary>Read the nine references used in this activity</summary><ol className="reference-list">{references.map((reference) => <li key={reference}>{reference.includes('https://doi.org/') ? <>{reference.split('https://doi.org/')[0]}<a href={`https://doi.org/${reference.split('https://doi.org/')[1]}`} target="_blank" rel="noreferrer">https://doi.org/{reference.split('https://doi.org/')[1]}</a></> : reference}</li>)}</ol></details></section>
            <section className="paper-card disclaimer"><h2>A note about care</h2><p>This is a reflective art activity, not a psychological test or diagnosis. Person-in-the-Rain drawings are a projective technique; research on their reliability and validity is mixed, and interpretations should only be made by a trained art therapist or psychologist alongside other information. If you are feeling distressed, please reach out to someone you trust or a mental health professional.</p><div className="support-box" style={{ marginTop: 15 }}><div><strong>Need support?</strong><span style={{ color: 'var(--muted)', fontSize: '.82rem' }}>{resources.region} resources</span></div>{resources.support.map((item) => <a key={item.value} className="support-link" href={item.href}>{item.label} · {item.value}</a>)}</div></section>
            <section className="beautify-card"><div><div className="section-kicker">Make a keepsake</div><h2>Give your drawing a gallery finish</h2><p>This optional local framing effect adds a paper border and a gentle colour lift. It is separate from artistic AI restyling and does not redraw your picture.</p></div><button className="primary-button" onClick={beautifyArtwork}><Sparkles size={16} /> {beautifiedDataUrl ? 'Refresh finish' : 'Gallery finish'}</button></section>
            <section className="report-export-card" aria-labelledby="reflection-pdf-title">
              <div><div className="section-kicker">A report to keep</div><h2 id="reflection-pdf-title">Your personal reflection report</h2><p>Your original and applied styled artwork, measured process, confirmed details and chosen next step. A refined, illustrated PDF—not a diagnosis.</p><small>{restyledArtwork ? `Includes the original + your applied ${STYLES.find((style) => style.id === restyledArtwork.styleId)?.name ?? 'artistic'} version, whichever artwork tab is selected.` : 'To include a styled version, choose a style and select “Use this artwork in report” before downloading.'} Includes personal choices; share thoughtfully.</small></div>
              <button className="primary-button" onClick={() => void exportPdf()} disabled={pdfExporting}><FileText size={18} /> {pdfExporting ? 'Preparing report…' : 'Download reflection report PDF'}</button>
              {pdfError && <p className="report-export-error" role="alert">{pdfError}</p>}
            </section>
            <div className="report-actions"><button className="primary-button" onClick={() => exportPng()}><Download size={16} /> Download PNG</button><button className="ghost-button" onClick={saveToGallery}><Save size={16} /> Save to gallery</button><button className="ghost-button" onClick={shareArtwork}><Share2 size={16} /> Share image</button><button className="ghost-button" onClick={drawAgain}><ArrowLeft size={16} /> Draw again</button></div>
            <p className="helper-note"><Sparkles size={13} /> Exploratory local reading · visible marks and process metrics only · no server upload by default.</p>
          </div>
        </div>
      </main>
      {toast && <div className="toast">{toast}</div>}
    </div>
  )
}

export default App
