import { lazy, Suspense, useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { ArrowUpRight, Check, Palette } from 'lucide-react'
import { STYLES, type RestyleStyleId } from './styles'
import './report-restyle.css'

const StyleLab = lazy(() => import('./StyleLab'))
const BASE = import.meta.env.BASE_URL

type ReportRestyleProps = {
  drawingDataUrl: string
  title: string
  openRequest: number
  onUse: (blob: Blob, styleId: RestyleStyleId) => Promise<void>
}

export default function ReportRestyle({ drawingDataUrl, title, openRequest, onUse }: ReportRestyleProps) {
  const [selectedStyleId, setSelectedStyleId] = useState<RestyleStyleId>('anime')
  const [launched, setLaunched] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [selectionRequest, setSelectionRequest] = useState(0)
  const dialog = useRef<HTMLDialogElement>(null)
  const styleButtons = useRef<Partial<Record<RestyleStyleId, HTMLButtonElement>>>({})
  const returnFocus = useRef<HTMLElement | null>(null)
  const wantsOpen = useRef(false)
  const lastOpenRequest = useRef(0)
  const previousDrawing = useRef(drawingDataUrl)
  const initialDrawing = useMemo(() => ({ dataUrl: drawingDataUrl, name: `${title}.png` }), [drawingDataUrl, title])

  const restoreFocus = useCallback(() => {
    const target = returnFocus.current
    window.requestAnimationFrame(() => {
      if (!wantsOpen.current && !dialog.current?.open && target?.isConnected) {
        target.focus({ preventScroll: true })
      }
    })
  }, [])

  const closeStudio = useCallback(() => {
    wantsOpen.current = false
    setDialogOpen(false)
    if (dialog.current?.open) dialog.current.close()
    else restoreFocus()
  }, [restoreFocus])

  const openStudio = useCallback((styleId: RestyleStyleId = selectedStyleId, trigger?: HTMLElement) => {
    const active = document.activeElement
    returnFocus.current = trigger ?? (
      active instanceof HTMLElement && active !== document.body && !dialog.current?.contains(active)
        ? active
        : styleButtons.current[styleId] ?? null
    )
    setSelectedStyleId(styleId)
    setSelectionRequest((value) => value + 1)
    setLaunched(true)
    wantsOpen.current = true
    setDialogOpen(true)
  }, [selectedStyleId])

  // Zero is the initial, unopened report. The ref also guards Strict Mode replays.
  useEffect(() => {
    if (openRequest === lastOpenRequest.current) return
    const previousRequest = lastOpenRequest.current
    lastOpenRequest.current = openRequest
    if (openRequest > previousRequest) openStudio()
  }, [openRequest, openStudio])

  // Keep the studio mounted (and its connection in memory), but never leave a
  // different drawing's studio open. StyleLab resets/cancels when its source changes.
  useEffect(() => {
    if (previousDrawing.current === drawingDataUrl) return
    previousDrawing.current = drawingDataUrl
    closeStudio()
  }, [drawingDataUrl, closeStudio])

  useEffect(() => {
    const element = dialog.current
    if (!element) return
    if (dialogOpen && !element.open) element.showModal()
    else if (!dialogOpen && element.open) element.close()
  }, [dialogOpen])

  async function useArtwork(blob: Blob, styleId: RestyleStyleId) {
    await onUse(blob, styleId)
    setSelectedStyleId(styleId)
    closeStudio()
  }

  return (
    <section id="report-restyle" className="report-restyle-section" aria-labelledby="report-restyle-heading">
      <div className="report-restyle-card">
        <div className="report-restyle-heading-row">
          <div>
            <p className="report-restyle-eyebrow"><Palette size={15} aria-hidden="true" /> A different finish. The same story.</p>
            <h2 id="report-restyle-heading">Restyle your drawing</h2>
            <p className="report-restyle-intro">Choose a finished-art style. Your original is kept.</p>
          </div>
          <span className="report-restyle-count" aria-hidden="true">04 styles</span>
        </div>
        <p id="report-restyle-examples" className="report-restyle-examples">Style examples · not generated versions of your drawing</p>
        <div className="report-restyle-grid" role="group" aria-label="Choose a finished-art style" aria-describedby="report-restyle-examples">
          {STYLES.map((style, index) => (
            <button
              key={style.id}
              ref={(element) => { if (element) styleButtons.current[style.id] = element; else delete styleButtons.current[style.id] }}
              type="button"
              className={`report-restyle-style${selectedStyleId === style.id ? ' is-selected' : ''}`}
              data-style-id={style.id}
              aria-label={`Restyle as ${style.name}`}
              aria-pressed={selectedStyleId === style.id}
              aria-haspopup="dialog"
              aria-controls="report-restyle-studio"
              onClick={(event) => openStudio(style.id, event.currentTarget)}
            >
              <span className="report-restyle-thumbnail">
                <img src={`${BASE}restyle/${style.id}.webp`} alt={`${style.name} style example, not your drawing`} decoding="async" />
                <span className="report-restyle-number" aria-hidden="true">0{index + 1}</span>
                {selectedStyleId === style.id && <span className="report-restyle-selected"><Check size={14} aria-hidden="true" /><span className="report-restyle-sr-only">Selected</span></span>}
              </span>
              <span className="report-restyle-style-copy">
                <span className="report-restyle-style-title">{style.name}<ArrowUpRight size={16} aria-hidden="true" /></span>
                <span className="report-restyle-style-tag">{style.tag}</span>
              </span>
            </button>
          ))}
        </div>
      </div>
      <dialog
        id="report-restyle-studio"
        ref={dialog}
        className="report-restyle-dialog"
        aria-label="Restyle your drawing"
        onCancel={(event) => { event.preventDefault(); closeStudio() }}
        onClose={() => {
          // Ignore a delayed close event if a newer action has already reopened it.
          if (dialog.current?.open) return
          wantsOpen.current = false
          setDialogOpen(false)
          restoreFocus()
        }}
      >
        {launched && (
          <Suspense fallback={<div className="report-restyle-loading" role="status" aria-live="polite"><Palette size={28} aria-hidden="true" /><h2>Opening your style studio…</h2><p>Your original is kept. Nothing is being sent to a provider.</p><button type="button" onClick={closeStudio}>Back to report</button></div>}>
            <StyleLab initialDrawing={initialDrawing} initialStyleId={selectedStyleId} onUse={useArtwork} onExit={closeStudio} active={dialogOpen} selectionRequest={selectionRequest} />
          </Suspense>
        )}
      </dialog>
    </section>
  )
}
