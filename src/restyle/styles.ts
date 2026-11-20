export type RestyleStyleId = 'anime' | 'realistic' | 'watercolour' | 'graphic-novel'
export type RestyleMode = 'faithful' | 'balanced' | 'imaginative'

export const STYLES: { id: RestyleStyleId; name: string; description: string; tag: string; prompt: string }[] = [
  { id: 'anime', name: 'Anime', description: 'Expressive eyes, clean ink and cinematic cel shading.', tag: 'Expressive · cinematic', prompt: 'A beautifully finished contemporary anime illustration, precise line art, expressive character design and refined cel shading. Natural anatomy, elegant lighting and a thoughtfully illustrated environment.' },
  { id: 'realistic', name: 'Realistic', description: 'Natural anatomy, textured fabric and believable light.', tag: 'Natural · lifelike', prompt: 'A realistic cinematic fine-art illustration with believable human anatomy, natural fabric textures, soft realistic lighting and a convincing rainy setting. Not a cartoon, plastic doll or an enlarged crayon drawing.' },
  { id: 'watercolour', name: 'Watercolour', description: 'Transparent pigment, soft rain and a storybook finish.', tag: 'Soft · painterly', prompt: 'A sophisticated watercolour book illustration, transparent pigment blooms, delicate graphite or ink accents, controlled edges, soft misty washes and subtle textured art paper. Not blurry crayon enlargement.' },
  { id: 'graphic-novel', name: 'Graphic Novel', description: 'Decisive contours, rich shadows and editorial drama.', tag: 'Bold · illustrated', prompt: 'A premium contemporary graphic-novel illustration with confident ink contours, restrained crosshatching, crisp limited-colour shapes and cinematic editorial composition. No panels, speech bubbles, captions or words.' },
]

export function buildRestylePrompt(styleId: RestyleStyleId, mode: RestyleMode, notes: string) {
  const style = STYLES.find((item) => item.id === styleId) ?? STYLES[0]
  const freedom = mode === 'faithful'
    ? 'Stay close to the source composition, pose, facial expression, number of people, important objects, umbrella position and main colours. Do not turn a worried face into a smiling face or invent extra figures. Improve artistic rendering, not the underlying story.'
    : mode === 'imaginative'
      ? 'Use creative freedom to develop the environment, lighting and material detail, but preserve the core scene, number of people, main pose, expression and important shelter objects. Do not change the story into a happy or heroic scene unless explicitly requested.'
      : 'Preserve the source story, number of people, main pose, expression, umbrella or shelter and main colours. Refine proportions and enrich the environment in a balanced way without adding unrelated subjects.'
  return [
    'Restyle the provided source drawing into a polished finished artwork. Use the actual source image as the scene reference, not just the text prompt. This is artistic image-to-image redrawing, not sharpening, resizing or a simple filter.',
    style.prompt,
    freedom,
    'Translate crude marks into intentional artistic details while keeping the drawing recognisable. Preserve the full composition without cutting off feet, heads or the umbrella. No interface, screenshot frame, border, captions, logos or watermark. The result is artistic, not a psychological interpretation.',
    notes.trim() ? `Artist instructions: ${notes.trim().slice(0, 600)}` : '',
  ].filter(Boolean).join('\n\n')
}
