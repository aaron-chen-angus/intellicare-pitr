import { useEffect, useRef, useState } from 'react'
import { ArrowLeft, ArrowRight, Check, Download, ImagePlus, LoaderCircle, Maximize2, Palette, ShieldCheck, Sparkles, Unplug, X } from 'lucide-react'
import { STYLES, buildRestylePrompt, type RestyleStyleId, type RestyleMode } from './styles'
import { restyleImage } from './client'
import { useProviderConnection } from './auth'
import './restyle.css'

const asset = (name: string) => `${import.meta.env.BASE_URL}restyle/${name}`
const MAX_FILE_BYTES = 8 * 1024 * 1024
const ACCEPTED_TYPES = ['image/png', 'image/jpeg', 'image/webp']
const modeDescriptions: Record<RestyleMode, string> = {
  faithful: 'Stay close to your composition, expression, objects and colours.',
  balanced: 'Keep the story intact while refining proportions, light and detail.',
  imaginative: 'Give the atmosphere more room to grow while keeping the core scene.',
}

type Source = { file: File; url: string; name: string }
type Result = { url: string; styleId: RestyleStyleId; mimeType: string }
type View = 'compare' | 'original' | 'styled'

type StyleLabProps = {
  initialDrawing?: { dataUrl: string; name: string }
  initialStyleId?: RestyleStyleId
  onUse?: (blob: Blob, styleId: RestyleStyleId) => Promise<void>
  onExit?: () => void
  active?: boolean
  selectionRequest?: number
}

function drawingFile(dataUrl: string, name: string) {
  const match = /^data:(image\/(?:png|jpeg|webp));base64,([A-Za-z0-9+/=\r\n]+)$/.exec(dataUrl)
  if (!match || dataUrl.length > 16_000_000) throw new Error('The original drawing could not be loaded safely.')
  const raw = atob(match[2])
  return new File([Uint8Array.from(raw, (character) => character.charCodeAt(0))], name, { type: match[1] })
}

export default function StyleLab({ initialDrawing, initialStyleId = 'anime', onUse, onExit, active = true, selectionRequest = 0 }: StyleLabProps = {}) {
  const [styleId, setStyleId] = useState<RestyleStyleId>(initialStyleId)
  const [mode, setMode] = useState<RestyleMode>('faithful')
  const [notes, setNotes] = useState('')
  const [source, setSource] = useState<Source | null>(null)
  const [sourceReady, setSourceReady] = useState(false)
  const [sourceLoading, setSourceLoading] = useState(false)
  const [result, setResult] = useState<Result | null>(null)
  const [consent, setConsent] = useState(false)
  const [pending, setPending] = useState(false)
  const [status, setStatus] = useState('Explore the samples, or upload a drawing to make it your own.')
  const [error, setError] = useState('')
  const [view, setView] = useState<View>('compare')
  const [enlarged, setEnlarged] = useState<'original' | 'styled' | null>(null)
  const [applying, setApplying] = useState(false)
  const requestId = useRef(0)
  const sourceRequestId = useRef(0)
  const controller = useRef<AbortController | null>(null)
  const fileInput = useRef<HTMLInputElement>(null)
  const dialog = useRef<HTMLDialogElement>(null)
  const { token, connecting, configured, error: connectionError, connect, disconnect } = useProviderConnection()

  const selectedStyle = STYLES.find((style) => style.id === styleId) ?? STYLES[0]
  const displayedStyle = STYLES.find((style) => style.id === result?.styleId) ?? selectedStyle
  const isExample = source === null && !initialDrawing
  const originalUrl = source?.url ?? initialDrawing?.dataUrl ?? asset('original.webp')
  // A sample is only ever shown alongside the example drawing, never an uploaded source.
  const styledUrl = isExample ? asset(`${styleId}.webp`) : result?.url
  const canGenerate = Boolean(source && sourceReady && token && consent && !pending && !sourceLoading)
  const showingDifferentStyle = Boolean(result && result.styleId !== styleId)

  useEffect(() => {
    const url = source?.url
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [source?.url])

  useEffect(() => {
    const url = result?.url
    return () => { if (url) URL.revokeObjectURL(url) }
  }, [result?.url])

  useEffect(() => () => {
    requestId.current += 1
    sourceRequestId.current += 1
    controller.current?.abort()
  }, [])

  useEffect(() => { setStyleId(initialStyleId); setConsent(false) }, [initialStyleId, selectionRequest])
  useEffect(() => { if (!active) { stopRequest(); setConsent(false) } }, [active])
  useEffect(() => {
    if (!initialDrawing) return
    try { void chooseSource(drawingFile(initialDrawing.dataUrl, initialDrawing.name)) }
    catch (failure) { setError(failure instanceof Error ? failure.message : 'The report drawing could not load.') }
  }, [initialDrawing?.dataUrl])

  useEffect(() => {
    if (!enlarged || !dialog.current) return
    const element = dialog.current
    element.showModal()
    return () => { if (element.open) element.close() }
  }, [enlarged])

  function stopRequest() {
    requestId.current += 1
    controller.current?.abort()
    controller.current = null
    setPending(false)
  }

  async function chooseSource(file: File | undefined) {
    if (!file) return
    const allowed = ACCEPTED_TYPES.includes(file.type) || (!file.type && /\.(png|jpe?g|webp)$/i.test(file.name))
    if (!allowed || !file.size || file.size > MAX_FILE_BYTES) {
      setError(!allowed ? 'Please choose a PNG, JPG or WebP image.' : !file.size ? 'This file is empty. Please choose another drawing.' : 'This image is larger than 8 MB. Please choose a smaller PNG, JPG or WebP.')
      return
    }
    stopRequest()
    const id = ++sourceRequestId.current
    const nextSource = { file, url: URL.createObjectURL(file), name: file.name }
    setSource(nextSource)
    setSourceReady(false)
    setSourceLoading(true)
    setResult(null)
    setEnlarged(null)
    setConsent(false)
    setError('')
    setView('compare')
    setStatus('Opening your drawing locally. Nothing is being sent to a provider.')
    try {
      const image = new Image()
      image.src = nextSource.url
      await image.decode()
      if (id !== sourceRequestId.current) return
      setSourceReady(true)
      setStatus('Your original is ready. It stays on this device until you choose to restyle it.')
    } catch {
      if (id !== sourceRequestId.current) return
      setError('We could not open this image. Please choose a valid PNG, JPG or WebP drawing.')
      setStatus('This drawing could not be opened. No image has been sent.')
    } finally {
      if (id === sourceRequestId.current) setSourceLoading(false)
    }
  }

  function useExample() {
    sourceRequestId.current += 1
    stopRequest()
    setSource(null)
    setSourceReady(false)
    setSourceLoading(false)
    setResult(null)
    setEnlarged(null)
    setConsent(false)
    setError('')
    setView('compare')
    setStatus('Viewing pre-generated samples. No account or new generation is needed.')
    if (fileInput.current) fileInput.current.value = ''
  }

  async function generate() {
    // Check again at the action boundary; selecting a source or style never calls the provider.
    if (!canGenerate || !source || controller.current) return
    stopRequest()
    const id = requestId.current
    const abort = new AbortController()
    controller.current = abort
    const requestedStyle = styleId
    const requestedPrompt = buildRestylePrompt(requestedStyle, mode, notes)
    const sourceFile = source.file
    const providerToken = token
    setPending(true)
    setConsent(false)
    setResult(null)
    setEnlarged(null)
    setError('')
    setView('compare')
    setStatus(`Sending your drawing to Pollinations for ${selectedStyle.name} restyling…`)
    try {
      const blob = await restyleImage({ image: sourceFile, prompt: requestedPrompt, token: providerToken, signal: abort.signal }, (message) => {
        if (id === requestId.current && !abort.signal.aborted) setStatus(message)
      })
      if (id !== requestId.current || abort.signal.aborted) return
      if (!blob.size || !blob.type.startsWith('image/')) throw new Error('The provider did not return a usable image. Please try again.')
      setResult({ url: URL.createObjectURL(blob), styleId: requestedStyle, mimeType: blob.type })
      const name = STYLES.find((style) => style.id === requestedStyle)?.name ?? requestedStyle
      setStatus(`Your ${name} artwork is ready. Your original drawing is unchanged.`)
    } catch (cause) {
      if (id !== requestId.current || abort.signal.aborted) return
      setError(cause instanceof Error ? cause.message : 'Restyling could not finish. Please check your provider connection and try again.')
      setStatus('Restyling did not finish. No sample has been substituted for your drawing.')
    } finally {
      if (id === requestId.current) {
        controller.current = null
        setPending(false)
      }
    }
  }

  function cancel() {
    stopRequest()
    setConsent(false)
    setStatus('Restyling cancelled here. A request already received by the provider may still use your allowance.')
  }

  async function useInReport() {
    if (!result || !onUse || !initialDrawing || applying) return
    const currentRequest = requestId.current
    const currentResult = result
    setApplying(true)
    try {
      const blob = await (await fetch(currentResult.url)).blob()
      if (currentRequest !== requestId.current) return
      await onUse(blob, currentResult.styleId)
    } catch { setError('This artwork could not be applied. The report original is unchanged.') }
    finally { setApplying(false) }
  }

  function exit() { cancel(); onExit?.() }

  function downloadStyled() {
    if (!styledUrl) return
    const extension = result?.mimeType === 'image/webp' ? 'webp' : result?.mimeType === 'image/jpeg' ? 'jpg' : 'png'
    const anchor = document.createElement('a')
    anchor.href = isExample ? asset(`${styleId}.png`) : styledUrl
    anchor.download = `rain-and-me-${displayedStyle.id}${isExample ? '-sample' : ''}.${extension}`
    document.body.appendChild(anchor)
    anchor.click()
    anchor.remove()
  }

  return (
    <main className="restyle-lab">
      <div className="restyle-shell">
        <header className="restyle-nav">
          {onExit ? <button type="button" className="restyle-inline-link" onClick={exit}><ArrowLeft size={17} aria-hidden="true" /> Back to your report</button> : <a href="./" className="restyle-back"><ArrowLeft size={17} aria-hidden="true" /> Back to Rain &amp; Me</a>}
          <span className="restyle-wordmark"><Palette size={19} aria-hidden="true" /> The art-style studio</span>
          <span className="restyle-nav-note">A little room to reimagine.</span>
        </header>

        <section className="restyle-intro" aria-labelledby="restyle-title">
          <div>
            <p className="restyle-eyebrow">Your drawing, reimagined</p>
            <h1 id="restyle-title">Same story.<br />A different <em>art style.</em></h1>
          </div>
          <div className="restyle-intro-copy">
            <p>From a few honest marks to a whole new visual world. Keep the feeling of your drawing; explore a different way to bring it to life.</p>
            <button type="button" className="restyle-inline-link" onClick={() => document.getElementById('restyle-workspace')?.scrollIntoView({ behavior: 'smooth' })}>Try it with your drawing <ArrowRight size={17} aria-hidden="true" /></button>
          </div>
        </section>

        <section className="restyle-gallery" aria-labelledby="restyle-gallery-title">
          <div className="restyle-section-heading">
            <h2 id="restyle-gallery-title">Four ways to tell the same story</h2>
            <span>Choose an art style</span>
          </div>
          <div className="restyle-style-grid" role="group" aria-label="Choose an art style">
            {STYLES.map((style, index) => (
              <button key={style.id} type="button" className={`restylestylecard${style.id === styleId ? ' is-selected' : ''}`} data-style-id={style.id}
                aria-label={`${style.name} art style`} aria-pressed={style.id === styleId}
                onClick={() => { setStyleId(style.id); setConsent(false) }}>
                <span className="restyle-card-art">
                  <img src={asset(`${style.id}.webp`)} alt={`Pre-generated ${style.name} version of the same example drawing`} decoding="async" />
                  <span className="restyle-card-number">0{index + 1}</span>
                  {style.id === styleId && <span className="restyle-card-check"><Check size={16} aria-hidden="true" /><span className="restyle-sr-only">Selected</span></span>}
                </span>
                <span className="restyle-card-text"><span className="restyle-card-title">{style.name}</span><span className="restyle-card-tag">{style.tag}</span><span className="restyle-card-description">{style.description}</span></span>
              </button>
            ))}
          </div>
          <p className="restyle-gallery-note"><Sparkles size={14} aria-hidden="true" /> All four artworks were generated from the same example drawing using Manus image editing. These are pre-generated samples, not filters or a live preview of your upload. New restyles use Pollinations; results will vary.</p>
        </section>

        <section id="restyle-workspace" className="restyle-workspace" aria-labelledby="restyle-workspace-title">
          <div className="restyle-workspace-heading">
            <div><p className="restyle-eyebrow">Make it your own</p><h2 id="restyle-workspace-title">A new look. Still your story.</h2></div>
            <span className={`restyle-source-badge${isExample ? '' : ' is-upload'}`}>{isExample ? 'Exploring the example' : 'Your own drawing'}</span>
          </div>

          <div className="restyle-editor-grid">
            <div className="restyle-preview">
              <div className="restyle-preview-toolbar">
                <div className="restyle-view-toggle" role="group" aria-label="Artwork view">
                  {(['compare', 'original', 'styled'] as const).map((option) => <button type="button" key={option} aria-pressed={view === option} onClick={() => setView(option)}>{option === 'compare' ? 'Compare' : option === 'original' ? 'Original' : 'Styled'}</button>)}
                </div>
                <span className="restyle-preview-type">{isExample ? 'Sample pair' : result ? 'Your artwork' : 'Original kept intact'}</span>
              </div>
              <div className="restyle-comparison" data-view={view} aria-busy={pending || sourceLoading}>
                <figure className="restyle-before">
                  <figcaption><span>Original</span><button type="button" className="restyle-icon-button" aria-label="Enlarge original drawing" onClick={() => setEnlarged('original')} disabled={sourceLoading || (!isExample && !sourceReady)}><Maximize2 size={16} aria-hidden="true" /></button></figcaption>
                  <div className="restyle-image-mat"><img src={originalUrl} alt={isExample ? 'Original example drawing used for all four art styles' : 'Your exact original uploaded drawing'} /></div>
                  <p className="restyle-image-caption">{isExample ? 'The same starting point for every style' : source?.name ?? initialDrawing?.name}</p>
                </figure>
                <figure className="restyle-after">
                  <figcaption><span>{styledUrl ? displayedStyle.name : selectedStyle.name} <span className="restyle-caption-qualifier">{isExample ? 'sample' : 'restyle'}</span></span><button type="button" className="restyle-icon-button" aria-label="Enlarge styled artwork" onClick={() => setEnlarged('styled')} disabled={!styledUrl}><Maximize2 size={16} aria-hidden="true" /></button></figcaption>
                  <div className="restyle-image-mat">
                    {styledUrl ? <img src={styledUrl} alt={`${isExample ? 'Pre-generated example' : 'Your generated drawing'} in ${displayedStyle.name} style`} /> : <div className="restyle-empty-art">
                      {pending ? <LoaderCircle size={30} className="restyle-spinning" aria-hidden="true" /> : <Sparkles size={30} aria-hidden="true" />}
                      <strong>{pending ? 'A new artwork is taking shape' : 'Your new artwork belongs here'}</strong>
                      <p>{pending ? 'Real image-to-image restyling can take a little time.' : 'Connect your provider, give your permission and choose “Restyle my drawing”.'}</p>
                    </div>}
                  </div>
                  <p className="restyle-image-caption">{isExample ? 'Pre-generated sample · not a new generation' : result ? `Generated in ${displayedStyle.name} · original unchanged` : 'No generated result yet'}</p>
                </figure>
              </div>
              {showingDifferentStyle && <p className="restyle-result-note">Showing your <strong>{displayedStyle.name}</strong> result. <strong>{selectedStyle.name}</strong> is selected for your next restyle.</p>}
              <div className="restyle-preview-footer">
                <p>{isExample ? 'Browse without an account. Upload to create something personal.' : 'Your exact source image is retained. Art restyling may change details.'}</p>
                <button type="button" className="restyle-download" onClick={downloadStyled} disabled={!styledUrl}><Download size={16} aria-hidden="true" /> Download styled image</button>
                {initialDrawing && onUse && result && <button type="button" className="restyle-download" onClick={() => void useInReport()} disabled={applying}>{applying ? 'Applying…' : 'Use this artwork in report'}</button>}
              </div>
              <div className={`restyle-status${error ? ' has-error' : ''}`} role="status" aria-live="polite" aria-atomic="true">{pending && <LoaderCircle size={16} className="restyle-spinning" aria-hidden="true" />}<span>{status}</span></div>
              {error && <p className="restyle-error" role="alert">{error}</p>}
            </div>

            <aside className="restyle-controls" aria-label="Restyling controls">
              <div className="restyle-control-section">
                <h3><span className="restyle-step">1</span> Bring your drawing</h3>
                {initialDrawing ? <div className="restyle-upload"><ShieldCheck size={24} aria-hidden="true" /><strong>Your report drawing is loaded</strong><span>No re-upload needed · original kept intact</span></div> : <label className="restyle-upload" htmlFor="restyle-source-file">
                  <ImagePlus size={24} aria-hidden="true" />
                  <strong>{source ? 'Choose another drawing' : 'Upload a drawing'}</strong>
                  <span>PNG, JPG or WebP · up to 8 MB</span>
                  <input ref={fileInput} id="restyle-source-file" type="file" accept="image/png,image/jpeg,image/webp" aria-label="Upload a drawing" onChange={(event) => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ''; void chooseSource(file) }} />
                </label>}
                <p className="restyle-helper"><ShieldCheck size={14} aria-hidden="true" /> Opening a file is local. No provider upload happens yet.</p>
                {!isExample && !initialDrawing && <button type="button" className="restyle-inline-link" onClick={useExample}>Remove drawing &amp; use example</button>}
              </div>

              <div className="restyle-control-section">
                <h3><span className="restyle-step">2</span> Shape the new look</h3>
                <p className="restyle-selected-line">Selected style <strong>{selectedStyle.name}</strong></p>
                <label className="restyle-field" htmlFor="restyle-freedom">Creative freedom</label>
                <select id="restyle-freedom" aria-label="Creative freedom" value={mode} onChange={(event) => { setMode(event.target.value as RestyleMode); setConsent(false) }}>
                  <option value="faithful">Faithful — close to the original</option>
                  <option value="balanced">Balanced — a little more detail</option>
                  <option value="imaginative">Imaginative — room to explore</option>
                </select>
                <p className="restyle-helper restyle-mode-help">{modeDescriptions[mode]} This is prompt guidance, not a numerical strength or denoise setting.</p>
                <label className="restyle-field" htmlFor="restyle-notes">Describe what should stay <span>Optional</span></label>
                <textarea id="restyle-notes" aria-label="Describe what should stay" maxLength={600} rows={3} value={notes} onChange={(event) => { setNotes(event.target.value.slice(0, 600)); setConsent(false) }} placeholder="Keep the yellow umbrella, quiet expression and rainy setting…" />
                <span className="restyle-character-count">{notes.length} / 600</span>
              </div>

              <div className="restyle-control-section restyle-provider-section">
                <h3><span className="restyle-step">3</span> Connect &amp; create</h3>
                <div className="restyle-provider-heading"><strong>Pollinations</strong><span className={token ? 'is-connected' : ''}>{token ? <><Check size={12} aria-hidden="true" /> Free-only connected</> : configured ? 'Account required' : 'Setup pending'}</span></div>
                <p className="restyle-helper">Examples need no account. New restyles need a connected Pollinations account with earned Quest credits and a Quest-only key; no paid balance will be used. Available earned credits vary—this is not unlimited free generation.</p>
                {!token && <p className="restyle-helper" id="restyle-free-connection"><strong>In the Pollinations popup, tick “Quest pollen only” before “Allow access”.</strong> This prevents paid spending. The app checks this before accepting the connection; it cannot tick the provider’s checkbox for you.</p>}
                {token ? <button type="button" className="restyle-connect" onClick={() => { stopRequest(); setConsent(false); disconnect(); setStatus('Provider disconnected. You can still explore the samples.') }}><Unplug size={16} aria-hidden="true" /> Disconnect Pollinations</button> : <button type="button" className="restyle-connect" onClick={connect} disabled={connecting || !configured}>{connecting ? <LoaderCircle size={16} className="restyle-spinning" aria-hidden="true" /> : <ArrowRight size={16} aria-hidden="true" />}{connecting ? 'Connecting…' : 'Connect Pollinations'}</button>}
                {connectionError && <p className="restyle-error" role="alert">{connectionError}</p>}
                <p className="restyle-helper" id="restyle-provider-privacy">The connection token is held in memory only. Pollinations receives your drawing and instructions only when you click Restyle, and may store them. Each generation uses your earned Quest credits; a non-Quest-only key is blocked.</p>
                <label className="restyle-consent"><input type="checkbox" checked={consent} aria-describedby="restyle-provider-privacy" disabled={pending || isExample || !sourceReady} onChange={(event) => setConsent(event.target.checked)} /><span>I agree to send this drawing for AI restyling using earned Quest credits only. Paid balance must not be used.</span></label>
                {pending ? <button type="button" className="restyle-generate restyle-cancel" onClick={cancel}><X size={17} aria-hidden="true" /> Cancel restyling</button> : <button type="button" className="restyle-generate" onClick={() => void generate()} disabled={!canGenerate}><Sparkles size={17} aria-hidden="true" /> Restyle my drawing</button>}
                <p className="restyle-generation-hint">{isExample ? 'Samples are ready to explore. Upload your own drawing to generate.' : !sourceReady ? 'Choose a readable drawing first.' : !token ? 'Connect your provider, then tick the permission box.' : !consent ? 'Permission is required again for every generation.' : `Ready to create in ${selectedStyle.name}.`}</p>
              </div>
            </aside>
          </div>
        </section>

        <footer className="restyle-page-footer"><span>Rain &amp; Me <span aria-hidden="true">/</span> The art-style studio</span><p>New art, not an interpretation of you.</p></footer>
      </div>
      {enlarged && <dialog ref={dialog} className="restyle-enlarged" aria-labelledby="restyle-enlarged-title" onCancel={() => setEnlarged(null)} onClose={() => setEnlarged(null)}>
        <div className="restyle-enlarged-toolbar"><h2 id="restyle-enlarged-title">{enlarged === 'original' ? 'Original drawing' : `${displayedStyle.name}${isExample ? ' sample' : ' artwork'}`}</h2><button type="button" className="restyle-icon-button" aria-label="Close enlarged artwork" autoFocus onClick={() => setEnlarged(null)}><X size={22} aria-hidden="true" /></button></div>
        <img src={enlarged === 'original' ? originalUrl : styledUrl} alt={enlarged === 'original' ? 'Full original drawing, uncropped' : `Full ${displayedStyle.name} artwork, uncropped`} />
        {enlarged === 'styled' && <div className="restyle-enlarged-footer"><p>{isExample ? 'Pre-generated sample · not a new generation' : 'Your AI-restyled artwork'}</p><button type="button" className="restyle-download" onClick={downloadStyled}><Download size={16} aria-hidden="true" /> Download styled image</button></div>}
      </dialog>}
    </main>
  )
}
