// Run: node --test tests/ai-worker.test.mjs
// Model/canvas are test doubles: this verifies bounds, stitching, protocol,
// cancellation and timeout, not real model quality or browser integration.
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { stripTypeScriptTypes } from 'node:module'
import test from 'node:test'

const root = new URL('../src/ai/', import.meta.url)
const source = (name) => readFileSync(new URL(name, root), 'utf8')
function evaluate(name, imports, globals = {}) {
  const text = source(name).replaceAll('import.meta.url', JSON.stringify(new URL(name, root).href))
  const stripped = stripTypeScriptTypes(text, { mode: 'transform' })
  const names = [...stripped.matchAll(/^export (?:const|class|function) (\w+)/gm)].map((m) => m[1])
  const js = stripped
    .replace(/import\s*{([^}]+)}\s*from\s*['"]([^'"]+)['"];?/g, (_, fields, id) => `const {${fields}} = require(${JSON.stringify(id)});`)
    .replace(/^export /gm, '') + `\nmodule.exports = {${names.join(',')}};`
  const module = { exports: {} }
  new Function('require', 'module', 'exports', ...Object.keys(globals), js)(
    (id) => { if (!(id in imports)) throw new Error(`Unexpected import: ${id}`); return imports[id] },
    module, module.exports, ...Object.values(globals),
  )
  return module.exports
}
const types = evaluate('types.ts', {})

async function runWorker({ width = 1240, height = 1754, maxInputSide = 256, inferenceError, initializationError, unsupported = false } = {}) {
  const messages = []
  const calls = []
  let disposed = 0
  let closed = false
  let transfers = []
  let resolveDone
  const done = new Promise((resolve) => { resolveDone = resolve })
  const scope = {
    postMessage(message, transfer = []) {
      messages.push(message)
      if (message.type === 'result' || message.type === 'error') { transfers = transfer; resolveDone(message) }
    },
  }
  class RawImage {
    constructor(data, width, height, channels) { Object.assign(this, { data, width, height, channels }) }
  }
  const env = { backends: { onnx: { wasm: {} } } }
  const model = async (input) => {
    calls.push(input)
    if (inferenceError) throw new Error(inferenceError)
    const pixels = new Uint8Array(128 * 128 * 3)
    for (let y = 0; y < 128; y++) for (let x = 0; x < 128; x++) {
      const from = (Math.floor(y / 2) * 64 + Math.floor(x / 2)) * 3
      pixels.set(input.data.subarray(from, from + 3), (y * 128 + x) * 3)
    }
    return new RawImage(pixels, 128, 128, 3)
  }
  model.dispose = async () => { disposed++ }
  class Canvas {
    constructor(width, height) { Object.assign(this, { width, height }) }
    getContext() {
      const canvas = this
      return {
        fillRect() {}, drawImage() {},
        getImageData() {
          const pixels = new Uint8ClampedArray(canvas.width * canvas.height * 4)
          for (let y = 0; y < canvas.height; y++) for (let x = 0; x < canvas.width; x++) {
            pixels.set([x % 256, y % 256, (x + y) % 256, 255], (y * canvas.width + x) * 4)
          }
          return { data: pixels }
        },
      }
    }
  }
  evaluate('worker.ts', {
    './types': types,
    '@huggingface/transformers': {
      env, LogLevel: { NONE: 50 }, RawImage,
      pipeline: async (task, id, options) => {
        assert.equal(task, 'image-to-image')
        assert.equal(id, types.MODEL_ID)
        assert.equal(options.device, 'wasm')
        assert.equal(options.dtype, 'fp32')
        assert.equal(env.backends.onnx.wasm.numThreads, 1)
        assert.equal(env.backends.onnx.wasm.proxy, false)
        options.progress_callback({ status: 'progress', file: 'onnx/model.onnx', loaded: 10, total: 100, progress: 10 })
        options.progress_callback({ status: 'progress', file: 'onnx/model.onnx', loaded: 1, total: 100, progress: 1 })
        options.progress_callback({ status: 'done', file: 'config.json' })
        if (initializationError) throw new Error(initializationError)
        return model
      },
    },
  }, {
    globalThis: scope,
    OffscreenCanvas: unsupported ? undefined : Canvas,
    createImageBitmap: async () => ({ width, height, close() { closed = true } }),
    fetch: async () => ({ blob: async () => ({}) }),
  })
  scope.onmessage({ data: { type: 'enhance', sourceDataUrl: 'data:image/png;base64,AAAA', maxInputSide } })
  const result = await done
  // Error is posted before finally disposal; allow that microtask to finish.
  await new Promise((resolve) => setTimeout(resolve, 0))
  return { result, messages, calls, disposed, closed, transfers }
}

for (const [width, height, side] of [[1240, 1754, 256], [1240, 1754, 128], [1240, 1754, 320], [97, 49, 256], [1, 1, 256], [1754, 1240, 256]]) {
  test(`bounded ${width}×${height} source, ${side} preview: exact crop/edge stitching`, async () => {
    const { result, messages, calls, closed, disposed, transfers } = await runWorker({ width, height, maxInputSide: side })
    assert.equal(result.type, 'result')
    const ratio = Math.min(1, side / Math.max(width, height))
    const iw = Math.max(1, Math.round(width * ratio)), ih = Math.max(1, Math.round(height * ratio))
    assert.deepEqual(result.inputSize, { width: iw, height: ih })
    assert.deepEqual(result.originalSize, { width, height })
    assert.deepEqual(result.outputSize, { width: iw * 2, height: ih * 2 })
    assert.equal(result.tiles, Math.ceil(iw / 48) * Math.ceil(ih / 48))
    assert.equal(calls.length, result.tiles)
    assert.ok(calls.every((input) => input.width === 64 && input.height === 64 && input.channels === 3))
    // At the top-left halo all negative source coordinates must clamp to pixel 0.
    assert.deepEqual(Array.from(calls[0].data.subarray(0, 3)), [0, 0, 0])
    assert.equal(result.pixels.length, iw * ih * 4 * 3)
    for (let y = 0; y < ih * 2; y++) for (let x = 0; x < iw * 2; x++) {
      const offset = (y * iw * 2 + x) * 3
      assert.equal(result.pixels[offset], Math.floor(x / 2) % 256)
      assert.equal(result.pixels[offset + 1], Math.floor(y / 2) % 256)
      assert.equal(result.pixels[offset + 2], (Math.floor(x / 2) + Math.floor(y / 2)) % 256)
    }
    assert.ok(closed)
    assert.equal(disposed, 1)
    assert.equal(transfers[0], result.pixels.buffer)
    const progress = messages.filter((m) => m.type === 'progress').map((m) => m.progress)
    assert.ok(progress.some((p) => p.stage === 'download' && p.loadedBytes === 10 && p.totalBytes === 100))
    assert.equal(progress.at(-1).completedTiles, result.tiles)
    assert.equal(progress.at(-1).percent, 100)
    assert.ok(progress.every((p, i) => p.percent >= 0 && p.percent <= 100 && (!i || p.percent >= progress[i - 1].percent)))
    assert.ok(progress.filter((p) => p.stage === 'download').every((p) => p.percent <= 30))
  })
}

test('runtime request cannot bypass preview bounds', async () => {
  const { result } = await runWorker({ maxInputSide: 1754 })
  assert.equal(result.inputSize.height, 256)
})

test('backend memory errors are short and sanitized, with no full-image retry', async () => {
  const { result, calls, disposed } = await runWorker({ inferenceError: 'GPUBuffer backend stack SECRET giant-buffer memory allocation failed' })
  assert.equal(result.type, 'error')
  assert.equal(result.code, 'memory')
  assert.ok(!result.message.includes('SECRET'))
  assert.equal(calls.length, 1)
  assert.equal(disposed, 1)
})

test('model network failure and unsupported worker canvas are actionable', async () => {
  const network = await runWorker({ initializationError: 'Failed to fetch SECRET https://private.example' })
  assert.equal(network.result.code, 'model-download')
  assert.ok(!network.result.message.includes('SECRET'))
  const unsupported = await runWorker({ unsupported: true })
  assert.equal(unsupported.result.code, 'unsupported')
  assert.equal(unsupported.calls.length, 0)
})

function clientHarness(document = {}) {
  const workers = []
  class Worker {
    constructor(url, options) { this.url = url; this.options = options; this.terminated = false; workers.push(this) }
    postMessage(message) { this.request = message }
    terminate() { this.terminated = true }
  }
  class ImageData {
    constructor(data, width, height) { Object.assign(this, { data, width, height }) }
  }
  const api = evaluate('client.ts', { './types': types }, { Worker, document, ImageData })
  return { ...api, workers }
}

test('client creates opaque RGBA PNG, discloses preview, preserves original, and terminates model', async () => {
  let image
  const canvas = {
    width: 0, height: 0,
    getContext: () => ({ putImageData(value) { image = value } }),
    toDataURL: () => 'data:image/png;base64,RESULT',
  }
  const { enhanceLocal, workers } = clientHarness({ createElement: () => canvas })
  const source = 'data:image/png;base64,ORIGINAL'
  const progress = []
  const promise = enhanceLocal(source, (event) => progress.push(event))
  workers[0].onmessage({ data: {
    type: 'result', pixels: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12]),
    inputSize: { width: 1, height: 1 }, outputSize: { width: 2, height: 2 },
    originalSize: { width: 1240, height: 1754 }, tiles: 1,
  } })
  const result = await promise
  assert.equal(result.originalDataUrl, source)
  assert.equal(result.preview, true)
  assert.ok(result.disclosure.includes('not a full-resolution'))
  assert.deepEqual(Array.from(image.data), [1, 2, 3, 255, 4, 5, 6, 255, 7, 8, 9, 255, 10, 11, 12, 255])
  assert.equal(progress.at(-1).percent, 100)
  assert.equal(progress.at(-1).stage, 'complete')
  assert.ok(workers[0].terminated)
  assert.equal(canvas.width, 1)
})

test('sanitized worker error is typed and terminates the client worker', async () => {
  const { enhanceLocal, workers, LocalEnhancementError } = clientHarness()
  const promise = enhanceLocal('data:image/png;base64,AAAA')
  workers[0].onmessage({ data: { type: 'error', code: 'model-download', message: 'Check your connection and retry.' } })
  await assert.rejects(promise, (error) => error instanceof LocalEnhancementError && error.code === 'model-download')
  assert.ok(workers[0].terminated)
})

test('client abort terminates even an in-flight worker and suppresses stale messages', async () => {
  const { enhanceLocal, workers } = clientHarness()
  const controller = new AbortController()
  let progress = 0
  const promise = enhanceLocal('data:image/png;base64,AAAA', () => { progress++ }, { signal: controller.signal })
  const worker = workers[0]
  assert.equal(worker.options.type, 'module')
  assert.equal(worker.request.maxInputSide, 256)
  const handler = worker.onmessage
  controller.abort()
  await assert.rejects(promise, { name: 'AbortError' })
  assert.ok(worker.terminated)
  assert.equal(worker.onmessage, null)
  handler({ data: { type: 'progress', progress: { stage: 'tiles' } } })
  assert.equal(progress, 0)
})

test('already-aborted request never allocates a worker', async () => {
  const { enhanceLocal, workers } = clientHarness()
  const controller = new AbortController()
  controller.abort()
  await assert.rejects(enhanceLocal('data:image/png;base64,AAAA', undefined, { signal: controller.signal }), { name: 'AbortError' })
  assert.equal(workers.length, 0)
})

test('wall-clock timeout terminates worker and returns a sanitized typed error', async () => {
  const { enhanceLocal, workers, LocalEnhancementError } = clientHarness()
  await assert.rejects(enhanceLocal('data:image/png;base64,AAAA', undefined, { timeoutMs: 1000 }), (error) => error instanceof LocalEnhancementError && error.code === 'timeout')
  assert.ok(workers[0].terminated)
})

test('consumer progress callback failure cannot break cleanup', async () => {
  const { enhanceLocal, workers } = clientHarness()
  const controller = new AbortController()
  const promise = enhanceLocal('data:image/png;base64,AAAA', () => { throw new Error('UI observer') }, { signal: controller.signal })
  workers[0].onmessage({ data: { type: 'progress', progress: { stage: 'tiles' } } })
  controller.abort()
  await assert.rejects(promise, { name: 'AbortError' })
  assert.ok(workers[0].terminated)
})
