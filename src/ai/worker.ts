import { env, LogLevel, pipeline, RawImage } from '@huggingface/transformers'
import {
  MAX_INPUT_SIDE,
  MODEL_ID,
  QUICK_INPUT_SIDE,
  SCALE,
  STANDARD_INPUT_SIDE,
  TILE_OVERLAP,
  TILE_SIZE,
  type EnhanceErrorCode,
  type EnhanceProgress,
  type EnhanceWorkerRequest,
  type EnhanceWorkerResponse,
  type ImageSize,
} from './types'

// A small worker-only interface avoids adding conflicting DOM/WebWorker lib declarations.
const scope = globalThis as unknown as {
  onmessage: ((event: MessageEvent<EnhanceWorkerRequest>) => void) | null
  postMessage: (message: EnhanceWorkerResponse, transfer?: Transferable[]) => void
}

const CORE_SIZE = TILE_SIZE - 2 * TILE_OVERLAP
let busy = false

class WorkerFailure extends Error {
  constructor(public code: EnhanceErrorCode, message: string) {
    super(message)
  }
}

function report(progress: EnhanceProgress) {
  scope.postMessage({ type: 'progress', progress })
}

async function prepare(sourceDataUrl: string, requestedSide: number) {
  if (typeof OffscreenCanvas === 'undefined' || typeof createImageBitmap !== 'function') {
    throw new WorkerFailure('unsupported', 'Use a recent Chrome, Edge, Firefox, or Safari with worker canvas support. Your original is unchanged.')
  }
  if (typeof sourceDataUrl !== 'string' || !/^data:image\/(png|jpeg|webp|avif|gif);base64,/i.test(sourceDataUrl) || sourceDataUrl.length > 32_000_000) {
    throw new WorkerFailure('invalid-input', 'Use a local PNG, JPEG, or WebP drawing under 24 MB. Your original is unchanged.')
  }
  const maxSide = requestedSide === MAX_INPUT_SIDE ? MAX_INPUT_SIDE : requestedSide === QUICK_INPUT_SIDE ? QUICK_INPUT_SIDE : STANDARD_INPUT_SIDE
  let bitmap: ImageBitmap | undefined
  let canvas: OffscreenCanvas | undefined
  try {
    const blob = await (await fetch(sourceDataUrl)).blob()
    bitmap = await createImageBitmap(blob)
    if (!bitmap.width || !bitmap.height || bitmap.width * bitmap.height > 64_000_000) {
      throw new WorkerFailure('invalid-input', 'The drawing is too large to decode safely. Try a smaller PNG or JPEG.')
    }
    const originalSize: ImageSize = { width: bitmap.width, height: bitmap.height }
    const ratio = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
    const inputSize: ImageSize = {
      width: Math.max(1, Math.round(bitmap.width * ratio)),
      height: Math.max(1, Math.round(bitmap.height * ratio)),
    }
    canvas = new OffscreenCanvas(inputSize.width, inputSize.height)
    const context = canvas.getContext('2d', { willReadFrequently: true })
    if (!context) throw new WorkerFailure('unsupported', 'Worker canvas is unavailable. Try another modern browser.')
    // Composite transparent artwork on white, preserving visible RGB rather than hidden colors.
    context.fillStyle = '#ffffff'
    context.fillRect(0, 0, inputSize.width, inputSize.height)
    context.imageSmoothingEnabled = true
    context.imageSmoothingQuality = 'high'
    context.drawImage(bitmap, 0, 0, inputSize.width, inputSize.height)
    const rgba = context.getImageData(0, 0, inputSize.width, inputSize.height).data
    const rgb = new Uint8Array(inputSize.width * inputSize.height * 3)
    for (let i = 0; i < inputSize.width * inputSize.height; i += 1) {
      rgb[i * 3] = rgba[i * 4]
      rgb[i * 3 + 1] = rgba[i * 4 + 1]
      rgb[i * 3 + 2] = rgba[i * 4 + 2]
    }
    return { rgb, inputSize, originalSize }
  } catch (error) {
    if (error instanceof WorkerFailure) throw error
    throw new WorkerFailure('invalid-input', 'The drawing could not be decoded. Try a PNG or JPEG; your original is unchanged.')
  } finally {
    bitmap?.close()
    if (canvas) { canvas.width = 1; canvas.height = 1 }
  }
}

// Always 64×64, including halo. Edge pixels are replicated; the model never sees
// the full working preview, much less the full-resolution source drawing.
function extractTile(rgb: Uint8Array, size: ImageSize, x: number, y: number) {
  const patch = new Uint8Array(TILE_SIZE * TILE_SIZE * 3)
  for (let py = 0; py < TILE_SIZE; py += 1) {
    const sy = Math.max(0, Math.min(size.height - 1, y + py - TILE_OVERLAP))
    for (let px = 0; px < TILE_SIZE; px += 1) {
      const sx = Math.max(0, Math.min(size.width - 1, x + px - TILE_OVERLAP))
      const from = (sy * size.width + sx) * 3
      const to = (py * TILE_SIZE + px) * 3
      patch[to] = rgb[from]
      patch[to + 1] = rgb[from + 1]
      patch[to + 2] = rgb[from + 2]
    }
  }
  return new RawImage(patch, TILE_SIZE, TILE_SIZE, 3)
}

function stitchTile(output: RawImage, pixels: Uint8Array, size: ImageSize, x: number, y: number) {
  if (output.width !== TILE_SIZE * SCALE || output.height !== TILE_SIZE * SCALE || output.channels !== 3) {
    throw new WorkerFailure('inference', 'The super-resolution model returned an unexpected patch. Reload and try again.')
  }
  const crop = TILE_OVERLAP * SCALE
  const width = Math.min(CORE_SIZE, size.width - x) * SCALE
  const height = Math.min(CORE_SIZE, size.height - y) * SCALE
  const outputWidth = size.width * SCALE
  for (let row = 0; row < height; row += 1) {
    const from = ((row + crop) * output.width + crop) * 3
    const to = ((y * SCALE + row) * outputWidth + x * SCALE) * 3
    pixels.set(output.data.subarray(from, from + width * 3), to)
  }
}

function safeFailure(error: unknown, stage: EnhanceProgress['stage']): { code: EnhanceErrorCode; message: string } {
  if (error instanceof WorkerFailure) return { code: error.code, message: error.message }
  // Inspect internally, but never send raw backend errors, stack traces, or URLs to UI.
  const detail = error instanceof Error ? error.message : String(error)
  if (/memory|allocat|buffer|out of bounds/i.test(detail)) {
    return { code: 'memory', message: 'This browser ran out of model memory. Close other tabs and choose Quick preview. Your original is unchanged.' }
  }
  if (/fetch|network|download|http|failed to load|not found|unauthorized|forbidden/i.test(detail)) {
    return { code: 'model-download', message: 'The free model could not download. Check your connection or allow Hugging Face and jsDelivr, then retry.' }
  }
  return stage === 'tiles'
    ? { code: 'inference', message: 'Local super-resolution could not finish. Try a recent desktop browser or keep your original drawing.' }
    : { code: 'model-init', message: 'The local model could not start. Reload in a recent desktop browser; your original is unchanged.' }
}

async function enhance(request: EnhanceWorkerRequest) {
  let stage: EnhanceProgress['stage'] = 'preparing'
  let upscaler: Awaited<ReturnType<typeof pipeline<'image-to-image'>>> | undefined
  try {
    report({ stage, message: 'Preparing a bounded super-resolution preview…', percent: 0, completedTiles: 0, totalTiles: 0 })
    const { rgb, inputSize, originalSize } = await prepare(request.sourceDataUrl, request.maxInputSide)
    const outputSize = { width: inputSize.width * SCALE, height: inputSize.height * SCALE }
    const totalTiles = Math.ceil(inputSize.width / CORE_SIZE) * Math.ceil(inputSize.height / CORE_SIZE)
    const sizes = { inputSize, outputSize, originalSize, totalTiles }

    // No adapter probing, WebGPU attempts, or full-image retry paths.
    env.allowLocalModels = false
    env.logLevel = LogLevel.NONE
    env.backends.onnx.setLogLevel?.(LogLevel.NONE)
    if (!env.backends.onnx.wasm) throw new WorkerFailure('unsupported', 'WASM inference is unavailable in this browser. Try a recent desktop browser.')
    env.backends.onnx.wasm.numThreads = 1
    env.backends.onnx.wasm.proxy = false // Already running inside our dedicated worker.

    stage = 'initializing'
    let downloadHighWater = 2
    report({ stage, message: 'Loading the free local super-resolution model…', percent: 2, completedTiles: 0, ...sizes })
    upscaler = await pipeline('image-to-image', MODEL_ID, {
      device: 'wasm',
      dtype: 'fp32',
      progress_callback: (event) => {
        const file = 'file' in event ? event.file : undefined
        const isProgress = event.status === 'progress'
        const downloadPercent = isProgress && Number.isFinite(event.progress) ? Math.max(0, Math.min(100, event.progress)) : event.status === 'done' ? 100 : null
        // Config files must not fill the bar before the large model download.
        // A high-water mark prevents retries/multiple file callbacks regressing it.
        if (file?.includes('.onnx') && downloadPercent !== null) {
          downloadHighWater = Math.max(downloadHighWater, Math.min(29, 2 + downloadPercent * .27))
        }
        report({
          stage: 'download',
          message: event.status === 'done' ? 'Model file ready; preparing local inference…' : 'Downloading the free model (first run only; your drawing stays local)…',
          percent: downloadHighWater, downloadPercent, file,
          loadedBytes: isProgress ? event.loaded : undefined,
          totalBytes: isProgress ? event.total : undefined,
          completedTiles: 0, ...sizes,
        })
      },
    })

    stage = 'tiles'
    const pixels = new Uint8Array(outputSize.width * outputSize.height * 3)
    let completedTiles = 0
    report({ stage, message: `Enhancing preview patch 0 of ${totalTiles}…`, percent: 30, completedTiles, ...sizes })
    for (let y = 0; y < inputSize.height; y += CORE_SIZE) {
      for (let x = 0; x < inputSize.width; x += CORE_SIZE) {
        // One inference at a time. Tile inputs/output are block-scoped and not retained.
        const input = extractTile(rgb, inputSize, x, y)
        const output = await upscaler(input)
        stitchTile(output, pixels, inputSize, x, y)
        completedTiles += 1
        report({ stage, message: `Enhancing preview patch ${completedTiles} of ${totalTiles}…`, percent: 30 + completedTiles / totalTiles * 70, completedTiles, ...sizes })
        // Yield between patches; cancelling from the main thread terminates even an in-flight model call.
        await new Promise<void>((resolve) => setTimeout(resolve, 0))
      }
    }
    await upscaler.dispose()
    upscaler = undefined
    scope.postMessage({ type: 'result', pixels, inputSize, outputSize, originalSize, tiles: totalTiles }, [pixels.buffer])
  } catch (error) {
    scope.postMessage({ type: 'error', ...safeFailure(error, stage) })
  } finally {
    // Main also terminates this one-request worker on completion/error/abort/timeout.
    await upscaler?.dispose().catch(() => undefined)
    busy = false
  }
}

scope.onmessage = (event) => {
  if (busy || event.data?.type !== 'enhance') return
  busy = true
  void enhance(event.data)
}
