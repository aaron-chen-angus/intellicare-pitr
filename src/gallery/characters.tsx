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

/**
 * Miss Delvina See, Art Therapist: the guide, a young woman in her 20s.
 * Long straight black hair with a side part, white off-shoulder ruffle top,
 * black choker, silver hoops, high-waisted navy denim skirt with a tan
 * lace-up front, black platform sandals. Her raised hand waves when tapped.
 * Drawn as a <g> for use inside any SVG.
 */
export function DelvinaArt({ uid, waving }: { uid: string; waving?: boolean }) {
  const skin = `dv-skin-${uid}`
  const leg = `dv-leg-${uid}`
  const denim = `dv-denim-${uid}`
  const hair = `dv-hair-${uid}`
  const top = `dv-top-${uid}`
  const skinTone = '#f8dcc4'
  return (
    <g className={`char delvina${waving ? ' wave' : ''}`}>
      <defs>
        <radialGradient id={skin} cx=".4" cy=".35" r=".8"><stop offset="0" stopColor={skinTone} /><stop offset="1" stopColor="#ecc3a2" /></radialGradient>
        <linearGradient id={leg} x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="#f6d6bc" /><stop offset="1" stopColor="#e8bd9b" /></linearGradient>
        <linearGradient id={denim} x1="0" y1="0" x2="1" y2="1"><stop offset="0" stopColor="#34489a" /><stop offset="1" stopColor="#1d2b66" /></linearGradient>
        <linearGradient id={hair} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#2a2430" /><stop offset="1" stopColor="#141118" /></linearGradient>
        <linearGradient id={top} x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#eef1f6" /></linearGradient>
      </defs>
      <ellipse cx="60" cy="216" rx="30" ry="5.5" fill="rgba(20,40,70,.18)" />
      <g className="bob">
        {/* long hair, back layer */}
        <path d="M35 54 Q32 24 60 24 Q88 24 85 54 L88 92 Q90 116 84 124 Q78 118 76 104 L44 104 Q42 118 36 124 Q30 116 32 92 Z" fill={`url(#${hair})`} />
        {/* legs + platform sandals */}
        <rect x="48" y="146" width="9" height="56" rx="4.5" fill={`url(#${leg})`} />
        <rect x="63" y="146" width="9" height="56" rx="4.5" fill={`url(#${leg})`} />
        <path d="M43 204 h17 v6 q0 3 -3 3 h-11 q-3 0 -3 -3 z" fill="#15151a" />
        <path d="M60 204 h17 v6 q0 3 -3 3 h-11 q-3 0 -3 -3 z" fill="#15151a" />
        <path d="M47 199 l9 5 M56 199 l-9 5 M64 199 l9 5 M73 199 l-9 5" stroke="#15151a" strokeWidth="2.2" strokeLinecap="round" />
        {/* left arm, relaxed, with black bracelets */}
        <path d="M38 92 Q31 116 34 140" stroke={`url(#${skin})`} strokeWidth="9" strokeLinecap="round" fill="none" />
        <circle cx="34" cy="143" r="4.6" fill={`url(#${skin})`} />
        <path d="M30 132 q4 1.6 8 0 M30 135.5 q4 1.6 8 0" stroke="#1c1c22" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        {/* high-waisted A-line denim skirt with lace-up front */}
        <path d="M44 104 L76 104 L90 150 Q60 158 30 150 Z" fill={`url(#${denim})`} />
        <path d="M44 104 L76 104 L77 116 L43 116 Z" fill="#26377c" />
        <path d="M43.5 116 h33 M33 147 Q60 154 87 147" stroke="#6f86d6" strokeWidth=".9" strokeDasharray="2 1.6" fill="none" />
        <path d="M48 106 l5 3 l-5 3 l5 3 M53 106 l-5 3 l5 3 l-5 3" stroke="#b07a4a" strokeWidth="1.1" fill="none" />
        <path d="M50 118 q-2 8 -1 16 M51 118 q2 7 2 13" stroke="#b07a4a" strokeWidth="1" fill="none" strokeLinecap="round" />
        {/* bare shoulders, neck and choker */}
        <path d="M36 96 Q38 86 52 84 L68 84 Q82 86 84 96 Z" fill={`url(#${skin})`} />
        <rect x="55" y="70" width="10" height="16" rx="4" fill="#ecc3a2" />
        <rect x="54.5" y="77" width="11" height="2.6" rx="1.3" fill="#1c1c22" />
        {/* white off-shoulder ruffle top */}
        <path d="M40 96 L80 96 L77 105 L43 105 Z" fill={`url(#${top})`} />
        <path d="M34 92 Q39 96 44 92 Q49 97 54 92 Q59 97 64 92 Q69 97 74 92 Q79 96 86 92 L87 99 Q81 103 75 99 Q70 104 64 99 Q59 104 54 99 Q49 104 44 99 Q39 103 33 99 Z" fill="#ffffff" stroke="#dfe4ec" strokeWidth=".8" />
        {/* raised right hand near her hair (waves when tapped) */}
        <g className="arm-wave">
          <path d="M83 95 Q97 88 92 68" stroke={`url(#${skin})`} strokeWidth="9" strokeLinecap="round" fill="none" />
          <ellipse cx="91.5" cy="64" rx="5" ry="6" fill={`url(#${skin})`} />
          <rect x="88" y="73" width="8" height="3" rx="1.5" fill="#2b3446" transform="rotate(-14 92 74.5)" />
        </g>
        {/* face */}
        <ellipse cx="60" cy="54" rx="20" ry="22" fill={`url(#${skin})`} />
        {/* side-parted fringe and long front strands over the shoulders */}
        <path d="M39 56 Q37 30 58 29 Q83 29 82 52 Q76 38 64 37 Q50 38 45 50 Q42 56 39 62 Z" fill={`url(#${hair})`} />
        <path d="M40 50 Q35 74 38 96 Q40 108 44 112 Q44 92 45 74 Q45 60 42 52 Z" fill={`url(#${hair})`} />
        <path d="M80 50 Q85 74 82 96 Q80 106 76 110 Q76 92 76 74 Q76 60 78 52 Z" fill={`url(#${hair})`} />
        {/* young, smiling features */}
        <path d="M46.5 48 q4.5 -2.6 9 -.6 M64.5 47.4 q4.5 -2 9 .6" stroke="#2a2430" strokeWidth="1.4" fill="none" strokeLinecap="round" />
        <ellipse cx="51" cy="55" rx="2.5" ry="2.9" fill="#231c24" />
        <ellipse cx="69" cy="55" rx="2.5" ry="2.9" fill="#231c24" />
        <circle cx="52" cy="54" r=".9" fill="#fff" /><circle cx="70" cy="54" r=".9" fill="#fff" />
        <path d="M47.8 53 q3 -2.4 6.6 -.6 M65.6 52.4 q3.6 -1.8 6.6 .6" stroke="#231c24" strokeWidth="1.3" fill="none" strokeLinecap="round" />
        <g className="eyelid"><rect x="47.5" y="51.5" width="7.5" height="7" rx="3" fill={skinTone} /><rect x="65.5" y="51.5" width="7.5" height="7" rx="3" fill={skinTone} /></g>
        <circle cx="45.5" cy="63" r="3.6" fill="#ff8f9c" opacity=".35" /><circle cx="74.5" cy="63" r="3.6" fill="#ff8f9c" opacity=".35" />
        <path d="M59 58 q1 2.4 -.4 3.4" stroke="#d9a687" strokeWidth="1.1" fill="none" strokeLinecap="round" />
        <path d="M53.5 65 Q60 71.5 66.5 65 Q60 67.6 53.5 65 Z" fill="#ffffff" stroke="#d76f7d" strokeWidth="1.5" strokeLinejoin="round" />
        {/* silver hoop earrings */}
        <circle cx="40.5" cy="64" r="2.8" fill="none" stroke="#c7cdd6" strokeWidth="1.1" />
        <circle cx="79.5" cy="64" r="2.8" fill="none" stroke="#c7cdd6" strokeWidth="1.1" />
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
