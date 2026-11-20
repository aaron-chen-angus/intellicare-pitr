export const RESTYLE_MODEL = 'black-forest-labs/flux.2-klein-4b'
const BASE = 'https://gen.pollinations.ai'

export type RestyleRequest = { image: Blob; prompt: string; token: string; signal: AbortSignal }

function abortIfNeeded(signal: AbortSignal) {
  if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
}

function messageFor(status: number) {
  if (status === 401 || status === 403) return 'Your provider connection expired or does not allow this model. Reconnect to Pollinations.'
  if (status === 402) return 'Your earned Quest credits or authorised budget are exhausted. No paid balance will be used by this feature.'
  if (status === 429) return 'The provider is busy or rate-limited. Wait a little before trying again.'
  if (status === 400 || status === 422) return 'The provider could not accept this image or request. Try a smaller PNG or JPEG drawing.'
  return 'The image provider could not finish this request. Your original is unchanged.'
}

export async function verifyQuestOnlyConnection(token: string, signal: AbortSignal) {
  if (!/^sk_[A-Za-z0-9_-]+$/.test(token)) throw new Error('Connect your Pollinations account first.')
  const response = await fetch(`${BASE}/account/key`, {
    headers: { Authorization: `Bearer ${token}` }, signal, credentials: 'omit', cache: 'no-store',
  })
  if (!response.ok) throw new Error(messageFor(response.status))
  const key: unknown = await response.json()
  if (!key || typeof key !== 'object' || !('valid' in key) || key.valid !== true) throw new Error('This provider connection is not valid. Reconnect before trying again.')
  if (!('questPollenOnly' in key) || key.questPollenOnly !== true) {
    throw new Error('Free-only connection was not selected. Reconnect and tick “Quest pollen only” in the Pollinations window before Allow access. No payment is required for this setting, and no drawing was uploaded.')
  }
  if ('pollenBudget' in key && typeof key.pollenBudget === 'number' && key.pollenBudget <= 0) throw new Error(messageFor(402))
}

async function prepareDrawing(blob: Blob, signal: AbortSignal) {
  if (!['image/png', 'image/jpeg', 'image/webp'].includes(blob.type) || blob.size > 8 * 1024 * 1024) throw new Error('Use a PNG, JPEG or WebP drawing smaller than 8 MB.')
  abortIfNeeded(signal)
  const bitmap = await createImageBitmap(blob)
  try {
    abortIfNeeded(signal)
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 40_000_000) throw new Error('This drawing is too large to decode safely. Use an image under 40 megapixels.')
    const scale = Math.min(1, 1536 / Math.max(bitmap.width, bitmap.height))
    const canvas = document.createElement('canvas')
    canvas.width = Math.max(1, Math.round(bitmap.width * scale))
    canvas.height = Math.max(1, Math.round(bitmap.height * scale))
    const context = canvas.getContext('2d')
    if (!context) throw new Error('This browser cannot prepare an image. Try a recent desktop browser.')
    context.fillStyle = '#fffdf8'
    context.fillRect(0, 0, canvas.width, canvas.height)
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
    // Re-encoding strips source metadata and prevents public URL pre-hosting.
    const dataUri = canvas.toDataURL('image/png')
    if (dataUri.length > 12_000_000) throw new Error('The prepared image is too large. Try a smaller drawing.')
    return { dataUri, size: bitmap.width > bitmap.height ? '1536x1024' : bitmap.width === bitmap.height ? '1024x1024' : '1024x1536' }
  } finally { bitmap.close() }
}

export async function restyleImage(request: RestyleRequest, onStatus: (message: string) => void): Promise<Blob> {
  const { image, prompt, token, signal } = request
  if (!/^sk_[A-Za-z0-9_-]+$/.test(token)) throw new Error('Connect your own Pollinations account first. App identifiers cannot generate images.')
  if (!prompt.trim() || prompt.length > 6000) throw new Error('Please use a shorter style description.')
  const timeout = new AbortController()
  const timer = window.setTimeout(() => timeout.abort(), 240_000)
  const relay = () => timeout.abort()
  signal.addEventListener('abort', relay, { once: true })
  try {
    abortIfNeeded(signal)
    onStatus('Checking that this connection can use earned Quest credits only…')
    await verifyQuestOnlyConnection(token, timeout.signal)
    const prepared = await prepareDrawing(image, signal)
    abortIfNeeded(signal)
    onStatus('Sending your drawing and chosen style for genuine AI redrawing…')
    const response = await fetch(`${BASE}/v1/images/edits`, {
      method: 'POST', headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
      credentials: 'omit', cache: 'no-store', signal: timeout.signal,
      body: JSON.stringify({ model: RESTYLE_MODEL, prompt, image: [{ image_url: prepared.dataUri }], size: prepared.size, n: 1, response_format: 'b64_json' }),
    })
    if (!response.ok) throw new Error(messageFor(response.status))
    const body: unknown = await response.json()
    abortIfNeeded(signal)
    if (!body || typeof body !== 'object' || !('data' in body) || !Array.isArray(body.data)) throw new Error('The provider returned no image. Your original is unchanged.')
    const entry = body.data[0]
    if (!entry || typeof entry.b64_json !== 'string' || entry.b64_json.length > 32_000_000) throw new Error('The provider returned no usable inline image. Your original is unchanged.')
    const mime = ['image/png', 'image/jpeg', 'image/webp'].includes(entry.media_type) ? entry.media_type : 'image/png'
    let binary: string
    try { binary = atob(entry.b64_json) } catch { throw new Error('The returned image could not be decoded. Your original is unchanged.') }
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0))
    const output = new Blob([bytes], { type: mime })
    const check = await createImageBitmap(output).catch(() => { throw new Error('The provider response was not a valid image. Your original is unchanged.') })
    check.close()
    abortIfNeeded(signal)
    onStatus('Your artistic restyle is ready. The original drawing is unchanged.')
    return output
  } catch (error) {
    if (signal.aborted) throw new DOMException('Cancelled', 'AbortError')
    if (timeout.signal.aborted) throw new Error('This request timed out. Your original is unchanged; a submitted provider job may still use earned Quest credits.')
    if (error instanceof TypeError) throw new Error('The provider could not be reached. Check your connection; do not disable browser security.')
    throw error
  } finally {
    window.clearTimeout(timer)
    signal.removeEventListener('abort', relay)
  }
}
