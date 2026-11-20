import { useState, type KeyboardEvent, type ReactNode } from 'react'
import { DelvinaArt, Figure, type FigureLook } from './characters'

const BASE = import.meta.env.BASE_URL

export type RoomId = 'studio' | 'colour' | 'lounge' | 'hall' | 'restyle'

export type RoomInfo = {
  id: RoomId
  step: number
  name: string
  welcome: string
  report: string
  target: string
}

/** Guidance text only. Nothing here reads, scores or interprets a drawing. */
export const ROOMS: RoomInfo[] = [
  { id: 'studio', step: 1, name: 'Drawing Studio', target: 'report-process',
    welcome: 'This is the Drawing Studio. You will have five quiet minutes and a full set of brushes to draw a person in the rain. There is no right or wrong way to do it.',
    report: 'In the Drawing Studio you can replay how your picture took shape, stroke by stroke, and correct any labels.' },
  { id: 'lounge', step: 2, name: 'Reflection Lounge', target: 'report-reflect',
    welcome: 'Afterwards we sit together in the Reflection Lounge. Short cards help you notice the person, the umbrella and the weather in your picture.',
    report: 'In the Reflection Lounge you describe your scene and read gentle cues. They are conversation starters, never conclusions about you.' },
  { id: 'colour', step: 3, name: 'Colour Room', target: 'report-colour',
    welcome: 'The Colour Room shows the colours you chose. What they mean is up to you, not a rulebook.',
    report: 'The Colour Room shows the colours you used. You can add what each one means to you.' },
  { id: 'restyle', step: 4, name: 'Restyle Wing', target: 'report-restyle',
    welcome: 'In the Restyle Wing your drawing can be turned into Anime, Realistic, Watercolour or Graphic Novel art. Your original always stays safe.',
    report: 'The Restyle Wing turns your drawing into finished art. Choose a style and your original is kept unchanged.' },
  { id: 'hall', step: 5, name: 'Keepsake Hall', target: 'report-keepsake',
    welcome: 'Finally, the Keepsake Hall. Here you can download your artwork and a beautiful reflection report to keep.',
    report: 'In the Keepsake Hall you can download your reflection report PDF, save the image or share it.' },
]

type Resident = { id: string; room: RoomId; x: number; y: number; look?: FigureLook; delvina?: boolean; line: string; bx: number; by: number }

const RESIDENTS: Resident[] = [
  { id: 'mei', room: 'studio', x: 196, y: 217, line: 'I always start with the umbrella!', bx: 232, by: 206,
    look: { skin: '#f3cfb0', skinShade: '#e2b38f', top: '#ff8fa3', topShade: '#e36c84', bottom: '#6c7a96', shoe: '#7a4a3a', hair: 'bun', hairColor: '#d9d9de', glasses: true, pose: 'paint' } },
  { id: 'ravi', room: 'colour', x: 452, y: 217, line: 'Blue with a little grey makes lovely rain.', bx: 485, by: 206,
    look: { skin: '#b9825a', skinShade: '#9f6c47', top: '#2fbf9a', topShade: '#1f9c7c', bottom: '#5a5f6e', shoe: '#3a2a20', hair: 'bald', hairColor: '#e6e6e6', glasses: true, pose: 'palette' } },
  { id: 'siti', room: 'lounge', x: 150, y: 396, line: 'Every painting here tells its own story.', bx: 183, by: 386,
    look: { skin: '#d9a47c', skinShade: '#c08a62', top: '#b48ee0', topShade: '#9370c8', bottom: '#4a5578', shoe: '#5a3a2a', hair: 'tudung', hairColor: '#5aa7d6', pose: 'sit' } },
  { id: 'delvina', room: 'hall', x: 318, y: 389, delvina: true, line: 'Hello! Tap any room to look around.', bx: 380, by: 378 },
  { id: 'lim', room: 'restyle', x: 676, y: 389, line: 'Same picture, four new looks. Wonderful!', bx: 690, by: 378,
    look: { skin: '#f0c9a4', skinShade: '#dcae86', top: '#4d9bff', topShade: '#1f6fe0', bottom: '#3f4a5c', shoe: '#2b2b33', hair: 'cap', hairColor: '#e6e6e6', glasses: true, stick: true, pose: 'stand' } },
]

const BOX: Record<RoomId, { x: number; y: number; w: number; h: number; wall: string }> = {
  studio: { x: 50, y: 170, w: 346, h: 170, wall: '#fff4e6' },
  colour: { x: 404, y: 170, w: 346, h: 170, wall: '#fdeef5' },
  lounge: { x: 50, y: 352, w: 256, h: 160, wall: '#eef5ff' },
  hall: { x: 314, y: 352, w: 172, h: 160, wall: '#f4f0ff' },
  restyle: { x: 494, y: 352, w: 256, h: 160, wall: '#effaf4' },
}

// Deterministic rain streaks, repeated every 140 units so the loop is seamless.
const RAIN = Array.from({ length: 46 }, (_, index) => ({ x: (index * 97) % 800, y: (index * 53) % 140 }))

const Floor = ({ x, w, y }: { x: number; w: number; y: number }) => (
  <g><rect x={x} y={y - 14} width={w} height="14" fill="#e3b88a" /><path d={`M${x} ${y - 14} h${w}`} stroke="#c9976a" strokeWidth="2" /></g>
)

function StudioRoom() {
  return (
    <g>
      <rect x="74" y="194" width="92" height="84" rx="4" fill="#ffffff" />
      <rect x="80" y="200" width="80" height="72" fill="#bfe0ff" />
      <g clipPath="url(#g-window)" className="g-rain-in">
        {Array.from({ length: 12 }, (_, i) => <path key={i} d={`M${84 + i * 7} ${190 + (i * 13) % 40} l-4 14`} stroke="#ffffff" strokeWidth="1.6" strokeLinecap="round" />)}
      </g>
      <path d="M120 200 v72 M80 236 h80" stroke="#ffffff" strokeWidth="4" />
      <rect x="186" y="198" width="44" height="34" fill="#c99a5b" /><rect x="190" y="202" width="36" height="26" fill="#ffe2c4" /><circle cx="214" cy="212" r="6" fill="#ff8a65" /><path d="M190 228 l12 -10 l10 8 l14 -8 v10 z" fill="#7fc9a8" />
      <g stroke="#9a6b3e" strokeWidth="4" strokeLinecap="round"><path d="M300 248 L284 336" /><path d="M300 248 L318 336" /><path d="M300 250 L300 336" /></g>
      <rect x="266" y="226" width="70" height="62" fill="#ffffff" stroke="#9a6b3e" strokeWidth="3" />
      <g stroke="#7fabc1" strokeWidth="1.4">{[0, 1, 2, 3, 4, 5].map((i) => <path key={i} d={`M${274 + i * 10} ${232 + (i % 2) * 6} l-3 9`} />)}</g>
      <path d="M286 262 Q301 244 316 262 Z" fill="#e5484d" /><path d="M301 262 v16" stroke="#3a3a46" strokeWidth="2" /><circle cx="301" cy="270" r="3" fill="#f3cfb0" />
      <rect x="282" y="288" width="40" height="5" rx="2" fill="#9a6b3e" />
      <rect x="352" y="300" width="26" height="26" rx="4" fill="#ff9e6b" />
      <g fill="#4fb382"><ellipse cx="358" cy="292" rx="7" ry="14" transform="rotate(-20 358 292)" /><ellipse cx="372" cy="290" rx="7" ry="15" transform="rotate(18 372 290)" /><ellipse cx="365" cy="284" rx="6" ry="15" /></g>
    </g>
  )
}

function ColourRoom() {
  const wedges = ['#ff7a8a', '#ffb547', '#ffd24d', '#3fd1a8', '#4d9bff', '#7b5cd6']
  return (
    <g>
      <g transform="translate(436 226)">
        {wedges.map((colour, i) => {
          const a1 = (i / 6) * Math.PI * 2 - Math.PI / 2
          const a2 = ((i + 1) / 6) * Math.PI * 2 - Math.PI / 2
          return <path key={colour} d={`M0 0 L${Math.cos(a1) * 26} ${Math.sin(a1) * 26} A26 26 0 0 1 ${Math.cos(a2) * 26} ${Math.sin(a2) * 26} Z`} fill={colour} />
        })}
        <circle r="9" fill="#ffffff" />
      </g>
      {[['#ff7a8a', 0], ['#ffb547', 1], ['#4d9bff', 2], ['#3fd1a8', 3]].map(([colour, i]) => <rect key={colour as string} x={536 + (i as number) * 20} y={200} width="15" height="22" rx="2" fill={colour as string} transform={`rotate(${((i as number) - 1.5) * 6} ${543 + (i as number) * 20} 211)`} />)}
      <g><path d="M636 214 h100 M636 254 h100" stroke="#c9976a" strokeWidth="4" />
        {['#e5484d', '#ffb547', '#12a37f', '#1f6fe0', '#7b5cd6', '#ff8fa3'].map((colour, i) => <rect key={colour} x={642 + (i % 3) * 32} y={i < 3 ? 192 : 232} width="20" height="22" rx="4" fill={colour} />)}
      </g>
      <rect x="560" y="294" width="76" height="8" rx="3" fill="#c9976a" /><path d="M566 302 v24 M630 302 v24" stroke="#a9794c" strokeWidth="4" />
      <circle cx="580" cy="288" r="6" fill="#4d9bff" /><circle cx="598" cy="288" r="6" fill="#ffd24d" /><circle cx="616" cy="288" r="6" fill="#ff7a8a" />
    </g>
  )
}

function LoungeRoom() {
  return (
    <g>
      <path d="M140 356 l26 14 h8 l26 -14" fill="#ffd24d" opacity=".25" />
      <rect x="92" y="368" width="146" height="84" rx="3" fill="#b88442" />
      <rect x="99" y="375" width="132" height="70" fill="#ffffff" />
      <image href={`${BASE}scrapbook/rain-collage.webp`} x="102" y="378" width="126" height="64" preserveAspectRatio="xMidYMid slice" />
      <rect x="146" y="456" width="38" height="8" rx="2" fill="#ffffff" stroke="#d8cfea" />
      <rect x="112" y="478" width="122" height="10" rx="4" fill="#8c6c9e" /><path d="M120 488 v20 M226 488 v20" stroke="#6f5480" strokeWidth="4" />
      <rect x="262" y="476" width="30" height="5" rx="2" fill="#c9976a" /><path d="M277 481 v27" stroke="#a9794c" strokeWidth="3" />
      <path d="M270 476 h12 v-8 h-12 z" fill="#ffffff" stroke="#9fb3c8" /><path d="M282 470 q5 2 0 5" fill="none" stroke="#9fb3c8" />
    </g>
  )
}

function HallRoom() {
  return (
    <g>
      <rect x="352" y="360" width="96" height="18" rx="9" fill="#ffffff" stroke="#d8cfea" />
      <text x="400" y="373" textAnchor="middle" className="g-sign">Keepsakes</text>
      <rect x="406" y="392" width="56" height="44" rx="2" fill="#c99a5b" /><rect x="410" y="396" width="48" height="36" fill="#ffffff" />
      <path d="M416 404 h28 M416 411 h36 M416 418 h22 M416 425 h30" stroke="#b9c9dc" strokeWidth="2.5" strokeLinecap="round" />
      <rect x="396" y="470" width="84" height="40" rx="4" fill="#7b5cd6" /><rect x="396" y="466" width="84" height="8" rx="3" fill="#9a83d6" />
      <rect x="412" y="480" width="52" height="10" rx="3" fill="#ffffff" opacity=".9" />
    </g>
  )
}

function RestyleRoom() {
  const styles = [['anime', 'Anime'], ['realistic', 'Realistic'], ['watercolour', 'Watercolour'], ['graphic-novel', 'Graphic']]
  return (
    <g>
      {styles.map(([id], i) => <path key={`l-${id}`} d={`M${530 + i * 46} 352 l-16 60 h32 z`} fill="#ffd24d" opacity=".18" />)}
      {styles.map(([id, name], i) => (
        <g key={id}>
          <rect x={510 + i * 46} y="366" width="40" height="50" rx="2" fill="#b88442" />
          <image href={`${BASE}restyle/${id}.webp`} x={513 + i * 46} y="369" width="34" height="44" preserveAspectRatio="xMidYMid slice" />
          <text x={530 + i * 46} y="428" textAnchor="middle" className="g-mini">{name}</text>
        </g>
      ))}
      <rect x="540" y="486" width="70" height="22" rx="4" fill="#ffffff" stroke="#cfe3d6" /><rect x="548" y="470" width="54" height="18" rx="3" fill="#dff3e8" />
    </g>
  )
}

const CONTENT: Record<RoomId, () => ReactNode> = {
  studio: StudioRoom, colour: ColourRoom, lounge: LoungeRoom, hall: HallRoom, restyle: RestyleRoom,
}

export default function Gallery({ mode, active, onSelect }: { mode: 'welcome' | 'report'; active: RoomId | null; onSelect: (room: RoomInfo) => void }) {
  const [wave, setWave] = useState<{ id: string; n: number }>({ id: '', n: 0 })
  const [talk, setTalk] = useState<{ id: string; text: string; x: number; y: number } | null>(null)

  const pick = (room: RoomInfo) => onSelect(room)
  const keyPick = (event: KeyboardEvent, room: RoomInfo) => {
    if (event.key === 'Enter' || event.key === ' ') { event.preventDefault(); pick(room) }
  }
  const greet = (resident: Resident) => {
    setWave((value) => ({ id: resident.id, n: value.n + 1 }))
    setTalk({ id: resident.id, text: resident.line, x: resident.bx, y: resident.by })
    window.setTimeout(() => setTalk((value) => (value?.id === resident.id ? null : value)), 2800)
  }

  return (
    <figure className={`gallery gallery-${mode}`}>
      <svg className="gallery-art" viewBox="0 0 800 560" role="group" aria-label="intelliCARE Art Gallery. Choose a room to learn about each step.">
        <defs>
          <linearGradient id="g-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a9d6f5" /><stop offset="1" stopColor="#e6f4ff" /></linearGradient>
          <linearGradient id="g-roof" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#ffffff" /><stop offset="1" stopColor="#ece6f8" /></linearGradient>
          <linearGradient id="g-grass" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#a6dfb2" /><stop offset="1" stopColor="#7cc791" /></linearGradient>
          <clipPath id="g-window"><rect x="80" y="200" width="80" height="72" /></clipPath>
          <clipPath id="g-scene"><rect width="800" height="560" rx="26" /></clipPath>
        </defs>
        <g clipPath="url(#g-scene)">
          <rect width="800" height="560" fill="url(#g-sky)" />
          <g className="g-clouds">
            <g className="g-cloud g-cloud-a"><ellipse cx="120" cy="60" rx="56" ry="18" fill="#ffffff" opacity=".9" /><ellipse cx="146" cy="48" rx="30" ry="20" fill="#ffffff" opacity=".9" /></g>
            <g className="g-cloud g-cloud-b"><ellipse cx="660" cy="44" rx="62" ry="18" fill="#ffffff" opacity=".85" /><ellipse cx="632" cy="34" rx="30" ry="18" fill="#ffffff" opacity=".85" /></g>
          </g>
          <g className="g-rain">
            {[0, 140, 280, 420, 560].map((offset) => RAIN.map((drop, i) => <path key={`${offset}-${i}`} d={`M${drop.x} ${drop.y + offset - 140} l-5 16`} stroke="#6aa4cf" strokeOpacity=".45" strokeWidth="1.6" strokeLinecap="round" />))}
          </g>
          <rect y="526" width="800" height="34" fill="url(#g-grass)" />
          <path d="M360 560 Q380 540 400 526 L420 526 Q430 540 460 560 Z" fill="#e8dcc8" />
          <g className="g-puddles"><ellipse cx="140" cy="545" rx="34" ry="6" fill="#bfe0ff" /><ellipse className="g-ripple" cx="140" cy="545" rx="10" ry="2" fill="none" stroke="#ffffff" strokeWidth="1.4" />
            <ellipse cx="640" cy="548" rx="40" ry="6" fill="#bfe0ff" /><ellipse className="g-ripple g-ripple-b" cx="640" cy="548" rx="10" ry="2" fill="none" stroke="#ffffff" strokeWidth="1.4" /></g>
          <g fill="#5fbf86"><circle cx="20" cy="520" r="22" /><circle cx="44" cy="528" r="16" /><circle cx="780" cy="520" r="22" /><circle cx="756" cy="528" r="16" /></g>

          <polygon points="30,144 400,54 770,144" fill="url(#g-roof)" stroke="#d6cceb" strokeWidth="3" />
          <polygon points="96,136 400,72 704,136" fill="none" stroke="#e2daf2" strokeWidth="2" />
          <circle cx="400" cy="108" r="20" fill="#ffffff" stroke="#d6cceb" strokeWidth="3" />
          <g transform="translate(400 108)"><circle cx="-6" cy="-5" r="3.5" fill="#ff7a8a" /><circle cx="5" cy="-6" r="3.5" fill="#ffb547" /><circle cx="7" cy="5" r="3.5" fill="#4d9bff" /><circle cx="-5" cy="6" r="3.5" fill="#3fd1a8" /></g>
          <rect x="40" y="142" width="720" height="28" fill="#ffffff" stroke="#d6cceb" strokeWidth="2" />
          <text x="400" y="161" textAnchor="middle" className="g-frieze">intelliCARE · ART GALLERY · PERSON IN THE RAIN</text>
          <rect x="40" y="170" width="720" height="356" fill="#e6dff4" />
          <rect x="40" y="340" width="720" height="12" fill="#d6cceb" />
          <rect x="34" y="512" width="732" height="14" rx="3" fill="#cdc2e2" />

          {ROOMS.map((room) => {
            const box = BOX[room.id]
            const Content = CONTENT[room.id]
            const isActive = active === room.id
            const label = mode === 'welcome' ? `${room.step} · ${room.name}` : room.name
            const tagW = label.length * 7.2 + 30
            return (
              <g
                key={room.id}
                className={`g-room${isActive ? ' is-active' : ''}`}
                role="button"
                tabIndex={0}
                aria-pressed={isActive}
                aria-label={`${room.name}. ${mode === 'welcome' ? room.welcome : room.report}`}
                onClick={() => pick(room)}
                onKeyDown={(event) => keyPick(event, room)}
              >
                <rect x={box.x} y={box.y} width={box.w} height={box.h} fill={box.wall} />
                <Floor x={box.x} w={box.w} y={box.y + box.h} />
                <Content />
                {RESIDENTS.filter((resident) => resident.room === room.id).map((resident) => (
                  <g
                    key={wave.id === resident.id ? `${resident.id}-${wave.n}` : resident.id}
                    className="g-resident"
                    transform={`translate(${resident.x} ${resident.y}) scale(.55)`}
                    onClick={() => greet(resident)}
                  >
                    {resident.delvina
                      ? <DelvinaArt uid={`g-${resident.id}`} waving={wave.id === resident.id} />
                      : <Figure look={resident.look!} uid={`g-${resident.id}`} waving={wave.id === resident.id} />}
                  </g>
                ))}
                <rect className="g-hot" x={box.x + 3} y={box.y + 3} width={box.w - 6} height={box.h - 6} rx="10" />
                <g className="g-tag" transform={`translate(${box.x + box.w / 2} ${box.y + 16})`}>
                  <rect x={-tagW / 2} y="-12" width={tagW} height="24" rx="12" />
                  <circle cx={-tagW / 2 + 14} cy="0" r="4.5" className="g-tag-dot" />
                  <text x={8} y="4.5" textAnchor="middle">{label}</text>
                </g>
              </g>
            )
          })}

          {talk && (() => {
            const width = Math.min(300, talk.text.length * 6.3 + 24)
            const x = Math.max(8, Math.min(792 - width, talk.x - width / 2))
            return (
              <g className="g-talk" pointerEvents="none">
                <rect x={x} y={talk.y - 30} width={width} height="26" rx="13" />
                <path d={`M${talk.x - 6} ${talk.y - 5} l6 8 l6 -8 z`} />
                <text x={x + width / 2} y={talk.y - 13} textAnchor="middle">{talk.text}</text>
              </g>
            )
          })()}
        </g>
      </svg>
      <figcaption className="gallery-caption">{mode === 'welcome' ? 'Tap a room to explore. Tap a painter to say hello.' : 'Tap a room to jump to that part of your report.'}</figcaption>
    </figure>
  )
}
