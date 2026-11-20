import { useEffect, useMemo, useRef, useState, type ComponentType } from 'react'
import {
  Brush,
  CloudRain,
  Eraser,
  Feather,
  Flame,
  Highlighter,
  Droplets,
  Paintbrush,
  PaintBucket,
  Palette,
  Pencil,
  PenTool,
  SprayCan,
  Star,
  Trophy,
  Umbrella,
  User,
  Sparkles,
} from 'lucide-react'
import type { FillOperation, StrokeRecord, ToolName } from './types'

/**
 * Presentation-only game layer. Everything here is derived from the marks the
 * person has already made. It never changes strokes, fills, scoring or reports.
 */

type IconType = ComponentType<{ size?: number; strokeWidth?: number }>

export const TOOL_ICONS: Record<ToolName, IconType> = {
  pencil: Pencil,
  ink: PenTool,
  marker: Brush,
  watercolour: Droplets,
  crayon: Paintbrush,
  airbrush: SprayCan,
  calligraphy: Feather,
  highlighter: Highlighter,
  eraser: Eraser,
  fill: PaintBucket,
}

type Stats = {
  marks: number
  colours: number
  tools: number
  person: boolean
  umbrella: boolean
  rain: boolean
}

type Achievement = { id: string; title: string; hint: string; icon: IconType; earned: (s: Stats) => boolean }

const ACHIEVEMENTS: Achievement[] = [
  { id: 'first-drop', title: 'First Drop', hint: 'Make your first mark', icon: CloudRain, earned: (s) => s.marks >= 1 },
  { id: 'colour-splash', title: 'Colour Splash', hint: 'Use 3 colours', icon: Palette, earned: (s) => s.colours >= 3 },
  { id: 'explorer', title: 'Tool Explorer', hint: 'Try 3 different tools', icon: Brush, earned: (s) => s.tools >= 3 },
  { id: 'character', title: 'Character Born', hint: 'Label a mark as Person', icon: User, earned: (s) => s.person },
  { id: 'shelter', title: 'Shelter Found', hint: 'Label a mark as Umbrella', icon: Umbrella, earned: (s) => s.umbrella },
  { id: 'downpour', title: 'Let It Pour', hint: 'Label a mark as Rain', icon: Droplets, earned: (s) => s.rain },
  { id: 'steady', title: 'Steady Hand', hint: 'Make 20 marks', icon: Flame, earned: (s) => s.marks >= 20 },
  { id: 'palette-keeper', title: 'Palette Keeper', hint: 'Use 6 colours', icon: Sparkles, earned: (s) => s.colours >= 6 },
]

const XP_PER_LEVEL = 100

function computeStats(strokes: StrokeRecord[], fills: FillOperation[]): Stats {
  const colours = new Set<string>()
  const tools = new Set<string>()
  let person = false
  let umbrella = false
  let rain = false
  for (const stroke of strokes) {
    if (stroke.tool !== 'eraser') colours.add(stroke.color.toLowerCase())
    tools.add(stroke.tool)
    if (stroke.subject === 'person') person = true
    if (stroke.subject === 'umbrella') umbrella = true
    if (stroke.subject === 'rain') rain = true
  }
  for (const fill of fills) {
    colours.add(fill.color.toLowerCase())
    tools.add('fill')
    if (fill.subject === 'person') person = true
    if (fill.subject === 'umbrella') umbrella = true
    if (fill.subject === 'rain') rain = true
  }
  return { marks: strokes.length + fills.length, colours: colours.size, tools: tools.size, person, umbrella, rain }
}

function useProgress(strokes: StrokeRecord[], fills: FillOperation[]) {
  return useMemo(() => {
    const stats = computeStats(strokes, fills)
    const earned = ACHIEVEMENTS.filter((a) => a.earned(stats))
    const xp = Math.min(stats.marks, 60) * 5 + stats.colours * 20 + stats.tools * 15 + earned.length * 40
    return { stats, earned, xp, level: Math.floor(xp / XP_PER_LEVEL) + 1, into: xp % XP_PER_LEVEL }
  }, [strokes, fills])
}

export function GameHud({ strokes, fills }: { strokes: StrokeRecord[]; fills: FillOperation[] }) {
  const { stats, earned, xp, level, into } = useProgress(strokes, fills)
  const seen = useRef<Set<string> | null>(null)
  const [popup, setPopup] = useState<Achievement | null>(null)

  useEffect(() => {
    const ids = new Set(earned.map((a) => a.id))
    if (seen.current === null) { seen.current = ids; return }
    const fresh = earned.find((a) => !seen.current!.has(a.id))
    seen.current = ids
    if (fresh) setPopup(fresh)
  }, [earned])

  useEffect(() => {
    if (!popup) return
    const timer = window.setTimeout(() => setPopup(null), 3200)
    return () => window.clearTimeout(timer)
  }, [popup])

  return (
    <section className="game-hud" aria-label="Studio progress">
      <div className="hud-level" aria-label={`Level ${level}, ${xp} experience points`}>
        <span className="hud-level-badge"><Star size={14} strokeWidth={2.4} /> Lv {level}</span>
        <span className="hud-xp" role="presentation"><span style={{ width: `${into}%` }} /></span>
        <span className="hud-xp-text">{xp} XP</span>
      </div>
      <ul className="hud-stats">
        <li><b>{stats.marks}</b><span>marks</span></li>
        <li><b>{stats.colours}</b><span>colours</span></li>
        <li><b>{stats.tools}</b><span>tools</span></li>
      </ul>
      <ul className="hud-badges" aria-label="Achievements">
        {ACHIEVEMENTS.map((a) => {
          const Icon = a.icon
          const got = earned.some((e) => e.id === a.id)
          return <li key={a.id} className={got ? 'is-earned' : ''} title={`${a.title}: ${a.hint}`}><Icon size={16} strokeWidth={2.2} /><span className="hud-sr">{a.title}{got ? ' earned' : ' locked'}</span></li>
        })}
      </ul>
      {popup && <div className="hud-popup" role="status"><Trophy size={20} /><div><small>Achievement unlocked</small><strong>{popup.title}</strong></div></div>}
    </section>
  )
}

export function ReportRewards({ strokes, fills, timeUsedSeconds }: { strokes: StrokeRecord[]; fills: FillOperation[]; timeUsedSeconds: number }) {
  const { stats, earned, xp, level, into } = useProgress(strokes, fills)
  const minutes = Math.floor(timeUsedSeconds / 60)
  const seconds = Math.round(timeUsedSeconds % 60)
  return (
    <section className="rewards-card" aria-label="Your studio rewards">
      <div className="rewards-top">
        <div className="rewards-medal" aria-hidden="true"><Trophy size={30} strokeWidth={1.8} /><span>Lv {level}</span></div>
        <div className="rewards-copy">
          <div className="section-kicker">Studio rewards</div>
          <h2>Quest complete</h2>
          <p>{xp} XP earned from {stats.marks} marks, {stats.colours} colours and {stats.tools} tools in {minutes}m {String(seconds).padStart(2, '0')}s. Just for fun. It is not a score of you or your drawing.</p>
          <div className="rewards-xp" role="presentation"><span style={{ width: `${into}%` }} /></div>
        </div>
      </div>
      <ul className="rewards-grid">
        {ACHIEVEMENTS.map((a) => {
          const Icon = a.icon
          const got = earned.some((e) => e.id === a.id)
          return <li key={a.id} className={got ? 'is-earned' : ''}><span className="rewards-icon"><Icon size={20} strokeWidth={2} /></span><strong>{a.title}</strong><small>{got ? 'Unlocked' : a.hint}</small></li>
        })}
      </ul>
    </section>
  )
}
