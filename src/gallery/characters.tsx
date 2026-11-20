import { useId, useState } from 'react'

/**
 * Original illustrated cast (vector, life-sim style). Decoration and guidance only:
 * no character interprets the drawing. Coordinates use a 120 x 224 figure box.
 */

export type FigureLook = {
  skin: string
  skinShade: string
  top: string
  topShade: string
  bottom: string
  shoe: string
  hair: 'bun' | 'bob' | 'bald' | 'cap' | 'tudung'
  hairColor: string
  glasses?: boolean
  stick?: boolean
  pose: 'paint' | 'palette' | 'stand' | 'sit' | 'frame'
}

const faceParts = (skin: string) => (
  <>
    <circle cx="46" cy="66" r="4" fill="#ff8a8a" opacity=".35" />
    <circle cx="74" cy="66" r="4" fill="#ff8a8a" opacity=".35" />
    <ellipse cx="51" cy="58" rx="2.6" ry="3" fill="#2b2b33" />
    <ellipse cx="69" cy="58" rx="2.6" ry="3" fill="#2b2b33" />
    <circle cx="52" cy="57" r=".9" fill="#fff" />
    <circle cx="70" cy="57" r=".9" fill="#fff" />
    <g className="eyelid"><rect x="47" y="54" width="9" height="8" rx="3" fill={skin} /><rect x="65" y="54" width="9" height="8" rx="3" fill={skin} /></g>
    <path d="M52 68 Q60 75 68 68" fill="none" stroke="#7a3b2e" strokeWidth="2.4" strokeLinecap="round" />
  </>
)

const Palette = ({ x, y, r = -12 }: { x: number; y: number; r?: number }) => (
  <g transform={`translate(${x} ${y}) rotate(${r})`}>
    <path d="M-16 -2 Q-16 -11 -3 -11 Q14 -11 15 -2 Q16 7 4 8 Q-2 8 -3 4 Q-5 1 -9 4 Q-16 7 -16 -2 Z" fill="#f4e3c8" stroke="#c9a978" strokeWidth="1" />
    <circle cx="-9" cy="-5" r="2.3" fill="#ff7a8a" /><circle cx="-2" cy="-7" r="2.3" fill="#ffb547" />
    <circle cx="6" cy="-6" r="2.3" fill="#4d9bff" /><circle cx="10" cy="0" r="2.3" fill="#3fd1a8" />
  </g>
)

const Brush = ({ x, y, angle = -62, tip = '#ff7a8a' }: { x: number; y: number; angle?: number; tip?: string }) => (
  <g transform={`translate(${x} ${y}) rotate(${angle})`}>
    <rect x="0" y="-1.6" width="30" height="3.2" rx="1.6" fill="#c58b4e" />
    <rect x="28" y="-2" width="5" height="4" fill="#c7cdd6" />
    <path d="M33 -2.2 Q41 0 33 2.2 Z" fill={tip} />
  </g>
)

/** Generic senior / visitor figure, drawn inside a parent <svg>. */
export function Figure({ look, uid, waving }: { look: FigureLook; uid: string; waving?: boolean }) {
  const top = `fig-top-${uid}`
  const skin = `fig-skin-${uid}`
  const sit = look.pose === 'sit'
  const legTop = 150
  const legH = sit ? 44 : 58
  const shoeY = legTop + legH + 2
  const hairBack = {
    bun: <circle cx="60" cy="31" r="11" fill={look.hairColor} />,
    bob: <path d="M34 66 Q30 30 60 30 Q90 30 86 66 Q86 80 78 82 L42 82 Q34 80 34 66 Z" fill={look.hairColor} />,
    bald: null,
    cap: null,
    tudung: <path d="M33 66 Q30 28 60 28 Q90 28 87 66 Q92 96 60 102 Q28 96 33 66 Z" fill={look.hairColor} />,
  }[look.hair]
  const hairFront = {
    bun: <path d="M36 60 Q34 36 60 34 Q86 36 84 60 Q80 46 60 44 Q40 46 36 60 Z" fill={look.hairColor} />,
    bob: <path d="M37 58 Q38 34 60 33 Q82 34 83 58 Q76 44 66 44 Q58 50 37 58 Z" fill={look.hairColor} />,
    bald: <path d="M37 56 Q36 44 42 40 L44 56 Z M83 56 Q84 44 78 40 L76 56 Z" fill={look.hairColor} />,
    cap: <g><path d="M36 52 Q38 30 60 30 Q82 30 84 52 Z" fill="#5a6b8c" /><path d="M36 52 Q62 58 94 49 L92 45 Q62 51 37 48 Z" fill="#46567a" /></g>,
    tudung: <g><path d="M37 58 Q38 36 60 35 Q82 36 83 58 Q78 42 60 42 Q42 42 37 58 Z" fill={look.hairColor} /><path d="M40 78 Q60 94 80 78 L82 90 Q60 104 38 90 Z" fill={look.hairColor} /></g>,
  }[look.hair]

  const rightArm = (() => {
    if (look.pose === 'paint') return (
      <g className="arm-wave arm-paint">
        <path d="M84 96 Q102 102 110 88" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="111" cy="86" r="6" fill={`url(#${skin})`} />
        <Brush x={110} y={86} angle={-40} />
      </g>
    )
    if (look.pose === 'palette') return (
      <g className="arm-wave arm-mix">
        <path d="M84 96 Q90 116 80 134" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="79" cy="136" r="6" fill={`url(#${skin})`} />
        <Brush x={79} y={136} angle={-150} tip="#4d9bff" />
      </g>
    )
    if (look.pose === 'frame') return (
      <g className="arm-wave">
        <path d="M84 96 Q90 116 84 132" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="84" cy="134" r="6" fill={`url(#${skin})`} />
      </g>
    )
    return (
      <g className="arm-wave">
        <path d="M84 96 Q92 120 90 146" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="90" cy="148" r="6" fill={`url(#${skin})`} />
      </g>
    )
  })()

  const leftArm = look.pose === 'palette' || look.pose === 'frame'
    ? <><path d="M36 96 Q28 118 38 134" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" /><circle cx="39" cy="136" r="6" fill={`url(#${skin})`} /></>
    : <><path d="M36 96 Q30 124 32 150" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" /><circle cx="32" cy="152" r="6" fill={`url(#${skin})`} /></>

  return (
    <g className={`char${waving ? ' wave' : ''}`}>
      <defs>
        <linearGradient id={top} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor={look.top} /><stop offset="1" stopColor={look.topShade} /></linearGradient>
        <radialGradient id={skin} cx=".4" cy=".35" r=".75"><stop offset="0" stopColor={look.skin} /><stop offset="1" stopColor={look.skinShade} /></radialGradient>
      </defs>
      <ellipse cx="60" cy={shoeY + 6} rx="34" ry="6" fill="rgba(20,40,70,.18)" />
      <g className="bob">
        {look.stick && <g><path d="M24 150 L18 212" stroke="#7a4a2a" strokeWidth="4" strokeLinecap="round" /><path d="M30 150 Q24 142 18 150" fill="none" stroke="#7a4a2a" strokeWidth="4" strokeLinecap="round" /></g>}
        <rect x="45" y={legTop} width="13" height={legH} rx="6" fill={look.bottom} />
        <rect x="62" y={legTop} width="13" height={legH} rx="6" fill={look.bottom} />
        <ellipse cx="50" cy={shoeY} rx="10" ry="5" fill={look.shoe} />
        <ellipse cx="70" cy={shoeY} rx="10" ry="5" fill={look.shoe} />
        <path d="M34 100 Q36 86 52 84 L68 84 Q84 86 86 100 L88 160 Q60 168 32 160 Z" fill={`url(#${top})`} />
        {leftArm}
        {rightArm}
        {look.pose === 'palette' && <Palette x={40} y={134} />}
        {look.pose === 'frame' && <g><rect x="34" y="118" width="54" height="40" rx="3" fill="#c99a5b" /><rect x="39" y="123" width="44" height="30" fill="#eaf4ff" /><path d="M44 148 L54 136 L62 144 L70 134 L78 148 Z" fill="#7fc9a8" /><circle cx="72" cy="130" r="3.5" fill="#ffd24d" /></g>}
        <rect x="54" y="74" width="12" height="14" rx="4" fill={look.skinShade} />
        {hairBack}
        <circle cx="60" cy="58" r="23" fill={`url(#${skin})`} />
        {hairFront}
        {faceParts(look.skin)}
        {look.glasses && <g fill="none" stroke="#6b5440" strokeWidth="2"><circle cx="51" cy="58" r="6" /><circle cx="69" cy="58" r="6" /><path d="M57 58 h6" /></g>}
      </g>
    </g>
  )
}

/** Miss Delvina See, Art Therapist: the guide. Drawn as a <g> for use inside any SVG. */
export function DelvinaArt({ uid, waving }: { uid: string; waving?: boolean }) {
  const top = `dv-top-${uid}`
  const apron = `dv-apron-${uid}`
  const skin = `dv-skin-${uid}`
  const skinTone = '#f2cba8'
  return (
    <g className={`char delvina${waving ? ' wave' : ''}`}>
      <defs>
        <linearGradient id={top} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#c7b4ee" /><stop offset="1" stopColor="#9a83d6" /></linearGradient>
        <linearGradient id={apron} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#8fd0b4" /><stop offset="1" stopColor="#5fae8e" /></linearGradient>
        <radialGradient id={skin} cx=".4" cy=".35" r=".75"><stop offset="0" stopColor={skinTone} /><stop offset="1" stopColor="#dcad86" /></radialGradient>
      </defs>
      <ellipse cx="60" cy="216" rx="34" ry="6" fill="rgba(20,40,70,.18)" />
      <g className="bob">
        <rect x="45" y="150" width="13" height="58" rx="6" fill="#2f3e66" />
        <rect x="62" y="150" width="13" height="58" rx="6" fill="#2f3e66" />
        <ellipse cx="50" cy="210" rx="10" ry="5" fill="#6b4a3a" />
        <ellipse cx="70" cy="210" rx="10" ry="5" fill="#6b4a3a" />
        <path d="M34 100 Q36 86 52 84 L68 84 Q84 86 86 100 L88 160 Q60 168 32 160 Z" fill={`url(#${top})`} />
        <path d="M46 88 L50 104 M74 88 L70 104" stroke="#5fae8e" strokeWidth="3" />
        <path d="M44 104 L76 104 L82 162 Q60 168 38 162 Z" fill={`url(#${apron})`} />
        <circle cx="50" cy="124" r="1.8" fill="#ff7a8a" /><circle cx="69" cy="140" r="2" fill="#ffb547" />
        <circle cx="56" cy="150" r="1.6" fill="#4d9bff" /><circle cx="72" cy="118" r="1.5" fill="#7b5cd6" />
        <rect x="51" y="132" width="17" height="11" rx="2" fill="#4f9c7d" />
        <path d="M55 132 L53 122 M60 132 L61 120 M64 132 L67 123" stroke="#c58b4e" strokeWidth="1.8" strokeLinecap="round" />
        <path d="M36 96 Q28 118 38 134" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" />
        <circle cx="39" cy="136" r="6" fill={`url(#${skin})`} />
        <Palette x={36} y={134} />
        <g className="arm-wave">
          <path d="M84 96 Q94 116 92 140" stroke={`url(#${top})`} strokeWidth="12" strokeLinecap="round" fill="none" />
          <circle cx="92" cy="142" r="6" fill={`url(#${skin})`} />
          <Brush x={92} y={142} angle={-70} tip="#7b5cd6" />
        </g>
        <rect x="54" y="74" width="12" height="14" rx="4" fill="#dcad86" />
        <path d="M35 64 Q32 30 60 28 Q88 30 85 64 Q86 84 78 88 L42 88 Q34 84 35 64 Z" fill="#251d2e" />
        <circle cx="60" cy="27" r="10" fill="#251d2e" />
        <g transform="translate(42 18) rotate(18)"><rect x="0" y="-1.4" width="34" height="2.8" rx="1.4" fill="#c58b4e" /><path d="M34 -2 Q41 0 34 2 Z" fill="#ff7a8a" /></g>
        <circle cx="60" cy="58" r="23" fill={`url(#${skin})`} />
        <path d="M37 58 Q37 34 60 33 Q83 34 83 54 Q72 40 56 44 Q46 48 37 58 Z" fill="#251d2e" />
        {faceParts(skinTone)}
        <g fill="none" stroke="#6b4f9e" strokeWidth="1.8"><circle cx="51" cy="58" r="6.5" /><circle cx="69" cy="58" r="6.5" /><path d="M57.5 58 h5" /></g>
        <circle cx="37.5" cy="68" r="1.8" fill="#ffd24d" /><circle cx="82.5" cy="68" r="1.8" fill="#ffd24d" />
      </g>
    </g>
  )
}

/** Stand-alone Delvina avatar. Tap to make her wave. */
export function Delvina({ className = '', title = 'Miss Delvina See, Art Therapist', crop = false }: { className?: string; title?: string; crop?: boolean }) {
  const uid = useId().replace(/[^a-zA-Z0-9]/g, '')
  const [wave, setWave] = useState(0)
  return (
    <svg
      className={`delvina-avatar ${className}`}
      viewBox={crop ? '22 6 76 104' : '0 0 120 224'}
      role="img"
      aria-label={title}
      onClick={() => setWave((n) => n + 1)}
    >
      <title>{title}</title>
      <DelvinaArt key={wave} uid={uid} waving={wave > 0} />
    </svg>
  )
}
