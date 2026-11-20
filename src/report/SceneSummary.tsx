import { CloudRain, ShieldCheck, Sprout } from 'lucide-react'
import type { SceneDescription } from './ReflectionCards'

export default function SceneSummary({ scene }: { scene: SceneDescription }) {
  const weather = scene.rain === 'heavy' ? ['Persistent pressure', 'Heavy rain may represent challenges that feel harder to ignore.']
    : scene.rain === 'personal' ? ['A personal burden', 'Rain centred on the person may represent feeling singled out.']
      : scene.rain === 'moderate' ? ['Noticeable challenges', 'Repeated rain can be a cue to name what is taking your energy.']
        : scene.rain === 'light' ? ['Manageable pressure', 'Drizzle may represent challenges that feel more manageable.']
          : ['Name the weather', 'Choose the rain above to connect it with a reflection cue.']
  const protection = scene.umbrella === 'covering' ? ['A source of protection', 'A covering umbrella may represent coping tools or supportive relationships.']
    : scene.umbrella === 'partial' ? ['Room for more support', 'Partial cover can be a cue to notice where more support would help.']
      : scene.umbrella === 'broken' ? ['Feeling exposed', 'A broken umbrella may represent protection that feels less reliable.']
        : scene.umbrella === 'none' ? ['Imagine some shelter', 'No umbrella invites a question about support; it does not prove support is absent.']
          : ['Name the shelter', 'Choose the umbrella above to reflect on protection and coping.']
  const balance = scene.umbrella === 'covering' && scene.rain === 'heavy' ? ['Pressure + protection', 'Difficult weather and reliable support can exist together.']
    : scene.posture === 'upright' || scene.expression === 'smiling' ? ['Notice your strengths', 'A steady stance or smile may represent determination or a hopeful outlook.']
      : ['One helpful next step', 'What person, place or action would make your weather easier to meet?']
  return <section className="paper-card scene-summary"><div className="section-kicker">A short reflection, not a score</div><h2>Weather, support & coping</h2><div className="scene-summary-grid">
    {[{ icon: CloudRain, label: 'The weather', text: weather }, { icon: ShieldCheck, label: 'Your shelter', text: protection }, { icon: Sprout, label: 'Your next step', text: balance }].map(({ icon: Icon, label, text }) => <article key={label}><Icon size={23} aria-hidden="true" /><span>{label}</span><h3>{text[0]}</h3><p>{text[1]}</p></article>)}
  </div></section>
}
