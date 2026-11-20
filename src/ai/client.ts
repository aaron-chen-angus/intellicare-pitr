import {
  DEFAULT_TIMEOUT_MS,
  MAX_INPUT_SIDE,
  PREVIEW_DISCLOSURE,
  QUICK_INPUT_SIDE,
  STANDARD_INPUT_SIDE,
  type EnhanceErrorCode,
  type EnhanceOptions,
  type EnhanceProgress,
  type EnhanceResult,
  type EnhanceWorkerRequest,
  type EnhanceWorkerResponse,
} from './types'

export type { EnhanceOptions, EnhanceProgress, EnhanceResult, ImageSize } from './types'

export class LocalEnhancementError extends Error {
  constructor(public readonly code: EnhanceErrorCode, message: string) {
    super(message)
    this.name = 'LocalEnhancementError'
  }
}

/**
 * Local Swin2SR 2× super-resolution of a bounded preview, NOT generative AI or
 * full-resolution processing. Keep result.originalDataUrl/drawing state separate.
 * A fresh worker is terminated on every result, failure, abort, or timeout;
 * browser HTTP/Cache API caching can still reuse downloaded model files.
 */
export function enhanceLocal(
  sourceDataUrl: string,
  onProgress?: (progress: EnhanceProgress) => void,
  options: EnhanceOptions = {},
): Promise<EnhanceResult> {
  if (options.signal?.aborted) return Promise.reject(new DOMException('Local enhancement cancelled.', 'AbortError'))
  if (typeof Worker === 'undefined' || typeof document === 'undefined') {
    return Promise.reject(new LocalEnhancementError('unsupported', 'Local super-resolution needs a recent browser with Web Worker support.'))
  }
  if (typeof sourceDataUrl !== 'string' || !/^data:image\/(png|jpeg|webp|avif|gif);base64,/i.test(sourceDataUrl) || sourceDataUrl.length > 32_000_000) {
    return Promise.reject(new LocalEnhancementError('invalid-input', 'Use a local PNG, JPEG, or WebP drawing under 24 MB. Your original is unchanged.'))
  }

  return new Promise<EnhanceResult>((resolve, reject) => {
    let worker: Worker | undefined
    let timer: ReturnType<typeof setTimeout> | undefined
    let settled = false
    const signal = options.signal
    const requestedTimeout = options.timeoutMs ?? DEFAULT_TIMEOUT_MS
    const timeoutMs = Number.isFinite(requestedTimeout)
      ? Math.max(1_000, Math.min(900_000, requestedTimeout))
      : DEFAULT_TIMEOUT_MS

    const notify = (progress: EnhanceProgress) => {
      // Consumer rendering errors must not interrupt worker cleanup or settlement.
      try { onProgress?.(progress) } catch { /* Optional UI observer. */ }
    }
    const cleanup = () => {
      if (timer !== undefined) clearTimeout(timer)
      signal?.removeEventListener('abort', abort)
      if (worker) {
        worker.onmessage = null
        worker.onerror = null
        worker.onmessageerror = null
        worker.terminate()
        worker = undefined
      }
    }
    const fail = (error: Error) => {
      if (settled) return
      settled = true
      cleanup()
      reject(error)
    }
    const abort = () => fail(new DOMException('Local enhancement cancelled. Your original is unchanged.', 'AbortError'))

    try {
      // Vite recognizes this exact static URL form and hashes the worker chunk.
      // It respects base: './', including a repository-subpath GitHub Pages deploy.
      worker = new Worker(new URL('./worker.ts', import.meta.url), { type: 'module', name: 'rain-me-swin2sr' })
      worker.onerror = (event) => {
        event.preventDefault()
        fail(new LocalEnhancementError('worker', 'The local model worker could not start. Reload or try a recent desktop browser.'))
      }
      worker.onmessageerror = () => fail(new LocalEnhancementError('worker', 'The local preview could not be received. Reload and try again.'))
      worker.onmessage = (event: MessageEvent<EnhanceWorkerResponse>) => {
        if (settled) return
        const message = event.data
        if (message.type === 'progress') {
          notify(message.progress)
          return
        }
        if (message.type === 'error') {
          fail(new LocalEnhancementError(message.code, message.message))
          return
        }
        if (message.type !== 'result') return
        let canvas: HTMLCanvasElement | undefined
        try {
          const { outputSize, inputSize, originalSize, pixels, tiles } = message
          if (
            !Number.isInteger(outputSize.width) || !Number.isInteger(outputSize.height) ||
            outputSize.width < 1 || outputSize.height < 1 ||
            outputSize.width > MAX_INPUT_SIDE * 2 || outputSize.height > MAX_INPUT_SIDE * 2 ||
            !(pixels instanceof Uint8Array) || pixels.length !== outputSize.width * outputSize.height * 3
          ) throw new Error('Invalid preview pixels')
          // Release the entire WASM model/session before PNG encoding on the UI thread.
          cleanup()
          canvas = document.createElement('canvas')
          canvas.width = outputSize.width
          canvas.height = outputSize.height
          const context = canvas.getContext('2d')
          if (!context) throw new Error('Canvas unavailable')
          const rgba = new Uint8ClampedArray(outputSize.width * outputSize.height * 4)
          for (let i = 0; i < outputSize.width * outputSize.height; i += 1) {
            rgba[i * 4] = pixels[i * 3]
            rgba[i * 4 + 1] = pixels[i * 3 + 1]
            rgba[i * 4 + 2] = pixels[i * 3 + 2]
            rgba[i * 4 + 3] = 255
          }
          context.putImageData(new ImageData(rgba, outputSize.width, outputSize.height), 0, 0)
          const dataUrl = canvas.toDataURL('image/png')
          if (!dataUrl.startsWith('data:image/png')) throw new Error('PNG encoding unavailable')
          settled = true
          notify({
            stage: 'complete',
            message: `${outputSize.width} × ${outputSize.height} super-resolution preview ready. Your original is unchanged.`,
            percent: 100, completedTiles: tiles, totalTiles: tiles,
            inputSize, outputSize, originalSize,
          })
          resolve({ dataUrl, inputSize, outputSize, tiles, originalSize, originalDataUrl: sourceDataUrl, preview: true, disclosure: PREVIEW_DISCLOSURE })
        } catch {
          fail(new LocalEnhancementError('output', 'The preview could not be saved. Close other tabs and retry; your original is unchanged.'))
        } finally {
          if (canvas) { canvas.width = 1; canvas.height = 1 }
        }
      }
      signal?.addEventListener('abort', abort, { once: true })
      if (signal?.aborted) { abort(); return }
      timer = setTimeout(() => fail(new LocalEnhancementError('timeout', 'Local enhancement timed out. Check your connection or retry the 256-pixel preview. Your original is unchanged.')), timeoutMs)
      const request: EnhanceWorkerRequest = {
        type: 'enhance', sourceDataUrl,
        maxInputSide: options.maxInputSide === MAX_INPUT_SIDE ? MAX_INPUT_SIDE : options.maxInputSide === QUICK_INPUT_SIDE ? QUICK_INPUT_SIDE : STANDARD_INPUT_SIDE,
      }
      worker.postMessage(request)
    } catch {
      fail(new LocalEnhancementError('worker', 'Local model workers are blocked in this browser. Reload or try a recent desktop browser.'))
    }
  })
}
