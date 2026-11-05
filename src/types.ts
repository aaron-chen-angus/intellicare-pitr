export type Screen = 'welcome' | 'studio' | 'developing' | 'report'
export type AgeGroup = 'child' | 'teen' | 'adult' | 'older'
export type ToolName = 'pencil' | 'ink' | 'marker' | 'watercolour' | 'crayon' | 'airbrush' | 'calligraphy' | 'highlighter' | 'eraser' | 'fill'

export type Point = { x: number; y: number; t: number; pressure: number }

export type StrokeRecord = {
  id: string
  start: number
  end: number
  tool: ToolName
  color: string
  size: number
  opacity: number
  points: Point[]
  bbox: { x: number; y: number; width: number; height: number }
  averagePressure: number
}

export type FillOperation = {
  x: number
  y: number
  color: string
  tolerance: number
}

export type SessionProfile = {
  name: string
  ageGroup: AgeGroup
  consent: boolean
}

export type AnalysisReport = {
  blank: boolean
  supportFirst: boolean
  band: 'Sheltered & Steady' | 'Finding Your Footing' | 'Weathering the Storm' | 'Caught in the Downpour'
  bandLine: string
  summary: string
  stressScore: number
  resourceScore: number
  copingBalance: number
  inkCoverage: number
  pageUsage: number
  strokeCount: number
  eraseCount: number
  undoCount: number
  timeUsedSeconds: number
  rainAmount: 'none' | 'light' | 'moderate' | 'heavy'
  noticed: Array<{ id: string; label: string; icon: string; confidence: number; possible?: boolean }>
  palette: string[]
  protectionTiming: 'before' | 'after' | 'unclear'
  prompts: string[]
  processNote: string
  region: string
  expressionReading: { title: string; body: string; confidence: number }
  postureReading: { title: string; body: string; confidence: number }
  figureReading: { title: string; body: string; confidence: number }
  umbrellaReading: { title: string; body: string; confidence: number }
  rainReading: { title: string; body: string; confidence: number }
  additionalReading: { title: string; body: string; confidence: number }
  compositionReading: { title: string; body: string; confidence: number }
  colourReading: { title: string; body: string; confidence: number }
}

export type PersistedSession = {
  profile: SessionProfile
  startTime: number
  submitted?: boolean
  autoSubmitted?: boolean
  drawingDataUrl: string
  strokes: StrokeRecord[]
  fillOps?: FillOperation[]
  undoCount: number
  timerCue60?: boolean
  timerCue10?: boolean
}
