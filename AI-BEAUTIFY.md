# Local AI detail previews

This release is **super-resolution, not generative style transfer**. It cannot turn a stick figure into a photorealistic or painterly scene. Hosted generative restyling would require separate provider terms, quotas and drawing-upload consent; it is not silently substituted here.

The earlier GPU-buffer failure happened during full-canvas Swin2SR inference. That path has been removed. `src/ai/client.ts` starts a dedicated module worker running `Xenova/swin2SR-classical-sr-x2-64` through Transformers.js on single-threaded WASM. There is no GPU adapter probing. Every model input is a 64×64 RGB patch, with an 8-pixel overlap halo and stitched 2× output.

For the A4 canvas:

| Mode | Original | Working input | AI output | Patches |
| --- | --- | --- | --- | --- |
| Quick (UI default) | 1240×1754 | 90×128 | 180×256 | 6 |
| Standard | 1240×1754 | 181×256 | 362×512 | 24 |
| Detailed | 1240×1754 | 226×320 | 452×640 | 35 |

This bounds memory, but returns a **preview smaller than the original**. The UI states dimensions explicitly and does not claim full-resolution enhancement. Original/AI preview/Gallery finish remain separate choices; PNG/PDF/share/gallery actions use the displayed version. A dedicated button downloads the full-size original.

Cancellation terminates the worker even during inference. Completion, failure and timeout also terminate it. The five-minute timeout includes downloads. Raw backend traces are not displayed. Recent desktop browsers are recommended; modern Workers, OffscreenCanvas and image decoding are required. Restricted networks and slow devices can still prevent inference.

The drawing is processed locally. First use downloads the model from Hugging Face and pinned ONNX runtime from jsDelivr. Those hosts receive download metadata, not drawing pixels. No API key, AI credits or paid account is required. Offline first-use AI is not supported.

The actual Standard browser test accepted a full 1240×1754 drawing, completed 24 patches and returned a 362×512 preview without uncaught errors. It took 276.6 seconds on the test environment including loading/inference. Cancellation and unchanged original dimensions were also verified. This is not a guarantee for every device. Quick is the default to reduce inference work.

Gallery finish is a separate deterministic canvas treatment, never described as AI. See `QA.md` for validation scope.
