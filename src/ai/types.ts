export const MODEL_ID = 'Xenova/swin2SR-classical-sr-x2-64'
export const QUICK_INPUT_SIDE = 128
export const STANDARD_INPUT_SIDE = 256
export const MAX_INPUT_SIDE = 320
export const TILE_SIZE = 64
export const TILE_OVERLAP = 8
export const SCALE = 2
export const DEFAULT_TIMEOUT_MS = 300_000
export const PREVIEW_DISCLOSURE = 'Local 2× super-resolution preview, not a full-resolution enhancement or generative AI. Your original is unchanged.'

export interface ImageSize {
  width: number
  height: number
}

export type EnhanceStage = 'preparing' | 'download' | 'initializing' | 'tiles' | 'complete'

export interface EnhanceProgress {
  stage: EnhanceStage
  message: string
  /** Monotonic overall percentage: loading 0–30, tiles 30–100. */
  percent: number | null
  completedTiles: number
  totalTiles: number
  /** Optional per-file detail; do not use this as the overall progress bar. */
  downloadPercent?: number | null
  file?: string
  loadedBytes?: number
  totalBytes?: number
  inputSize?: ImageSize
  outputSize?: ImageSize
  originalSize?: ImageSize
}

export interface EnhanceOptions {
  signal?: AbortSignal
  /** Default 256; quick preview 128; largest permitted working input 320. */
  maxInputSide?: 128 | 256 | 320
  /** Wall-clock limit, including model downloads. Default: five minutes. */
  timeoutMs?: number
}

export interface EnhanceResult {
  dataUrl: string
  inputSize: ImageSize
  outputSize: ImageSize
  tiles: number
  originalSize: ImageSize
  /** Kept separately; callers must not overwrite their original drawing. */
  originalDataUrl: string
  preview: true
  disclosure: string
}

export type EnhanceErrorCode =
  | 'unsupported'
  | 'invalid-input'
  | 'model-download'
  | 'model-init'
  | 'inference'
  | 'memory'
  | 'timeout'
  | 'output'
  | 'worker'

export interface EnhanceWorkerRequest {
  type: 'enhance'
  sourceDataUrl: string
  maxInputSide: 128 | 256 | 320
}

export type EnhanceWorkerResponse =
  | { type: 'progress'; progress: EnhanceProgress }
  | {
      type: 'result'
      /** Packed, opaque RGB. Its ArrayBuffer is transferred, not copied. */
      pixels: Uint8Array<ArrayBuffer>
      inputSize: ImageSize
      outputSize: ImageSize
      originalSize: ImageSize
      tiles: number
    }
  | { type: 'error'; code: EnhanceErrorCode; message: string }
