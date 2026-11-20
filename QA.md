# QA note

Date: 2026-11-05

## Verified

- `pnpm run typecheck` passes.
- `pnpm run build` passes and emits `dist/index.html` plus relative static assets.
- `GET /manus-routes.json` returns HTTP 200 with the expected `/` route manifest.
- Desktop welcome view inspected at 1440×900.
- Mobile welcome view inspected at 390×844; no horizontal overflow was visible.
- Consent gating was exercised in the browser; Start Drawing became available after consent.
- Drawing studio opened with the 05:00 timer, A4-ratio paper, eight brush buttons, eraser, fill, color palette, size/opacity sliders, undo/redo, clear, zoom, pan instructions, eyedropper, and sound toggle visible.
- Pointer-event drawing was exercised through the browser on the canvas; marks rendered and the timer continued against elapsed time.
- Early Submit opened the “Finish your artwork?” confirmation dialog.
- Confirming Submit opened the developing screen and then the reflection report.
- The report includes the non-diagnostic disclaimer, support resources, local-reading label, reflective prompts, exact nine supplied references, and export/share/gallery actions.
- Blank/low-confidence canvas guardrail returned the friendly “could not confidently find a person” message rather than inventing a result.
- The welcome screen now shows the exact five-minute instructions; the bucket tool uses tolerance-based canvas flood fill; timeout collection blocks further pointer input; fill operations and undo count are persisted; and two-pointer pinch zoom/pan is wired into the canvas.

## Notes

- The static build uses deterministic local exploratory analysis because GitHub Pages cannot safely hold a private model API key. `src/engine.ts` is the replaceable analysis boundary for a future server-side vision endpoint.
- Browser print/PDF styling is included, and the PDF button also downloads a simple artwork-plus-summary PDF via jsPDF.
- Full five-minute timing and native iOS Safari/Android Chrome coverage require physical devices; the implementation uses Pointer Events, `touch-action: none`, timestamp-based timing, and localStorage restoration paths for those environments.
- A production GitHub Pages URL still requires a repository owner to connect a GitHub repository and enable Pages. The source is ready for that workflow.

## GitHub Pages repair release: 2026.11.05-pages-fix-1

The user URL served raw `src/main.tsx` as `application/octet-stream`, with no Vite build workflow in the repository. This is the confirmed blank-page cause. The old downloadable ZIP was also confirmed stale and contained placeholder approval strings.

The replacement artifact passes frozen-lockfile installation, TypeScript checks and Vite build. Python Playwright tested the compiled manual-upload artifact under `/intellicare-pitr/` at 360, 768 and 1440 pixels. Drawing, confirmed submission, artwork rendering, all six PITR lens headings, discovery activities, gallery finish and PNG download worked. No uncaught browser/React errors occurred in that flow. A corrupted gallery value and a blocked localStorage getter were handled without blanking.

Measured paragraph text contrast for selected PITR/discovery/insight/composition cards ranged from 5.91:1 to 7.41:1 in light mode and 5.91:1 to 10.21:1 in dark mode. This is a targeted regression check, not a complete WCAG certification.

The enhancement is Swin2SR super-resolution, not generative artwork. Full-size inference has not been certified on all browsers/devices. The user-owned GitHub Pages site remains unchanged until corrected files and matching deployment settings are applied there.

The actual **Enhance with AI** control was also exercised from the browser-uploadable package on a deliberately tiny 32×32 synthetic canvas. After explicit WASM/fp32 fallback corrections it returned a 64×64 image, loaded the runtime from jsDelivr, and produced no console errors. The unused 26 MB local WASM bundle is omitted from the manual-upload ZIP so every file stays under GitHub's browser-upload size limit. This verifies small-image inference and CDN loading, not acceptable performance on the full 1240×1754 canvas.

## Atelier 2 revision: 2026.11.05-atelier-2

The former tiny-image test was insufficient to establish reliability on a real drawing. The old full-canvas WebGPU inference path has been removed. A real browser test at the `/intellicare-pitr/` subpath accepted a 1240×1754 recorded drawing, completed 24 fixed-size WASM patches, returned a 362×512 AI preview and retained the 1240×1754 original. It took 276.6 seconds including loading/inference. Cancellation and stale-message suppression passed; no uncaught browser errors occurred. Quick is now the UI default to reduce patch count. This confirms one test environment, not universal browser/device performance or generative restyling.

Production-browser report checks confirm all six illustrated PITR lenses, artist-confirmed scene controls, short colour associations, labelled estimated ink shares, element timeline first/last times, post-drawing relabelling, replay and no horizontal overflow at 360/768/1440 widths. The labelled fixture produced Person 0:05, Umbrella 0:28, Rain 0:45 and Other elements 1:20; an unlabelled stroke remained unlabelled until corrected. New card text was measured at a minimum contrast of 6.18:1 in both light/dark modes. This is a targeted check, not complete WCAG certification.

Fifteen worker unit tests pass for input bounds, overlap/edge stitching, odd edges, monotonic progress, RGB output, preserved original, sanitized errors, worker cleanup, abort and timeout. These use doubles and are not substituted for the real model test.

A read-only integration audit found one pre-existing restoration issue: undoing the final restored stroke reloaded the stale raster backup. Reconstruction now treats stored stroke/fill records as authoritative; the stale bitmap cannot overwrite the cleared canvas. A focused production regression was added for this path.

Source and manual-upload packages are versioned and byte-checked. Manual-upload files keep the new hashed worker and use the runtime CDN rather than the unused oversized local WASM asset. The user-owned GitHub repository is not automatically updated by a local checkpoint; the new compiled docs folder must be uploaded there.

The final compiled **manual-upload docs package** was tested separately in Quick mode with the same 1240×1754 input. It completed all six patches in **115.0 seconds**, produced a **180×256 preview**, loaded the runtime from jsDelivr despite omitting the oversized unused local WASM asset, and preserved the full-size original. Cancellation succeeded and no uncaught browser errors occurred. The exact package also passed the report/contrast/replay regression, including the last-restored-stroke undo check. Fresh ZIP contents and release metadata were byte-verified.

A final screenshot exposed an AI-panel-specific light-theme inheritance defect. The panel now has an explicit dark surface and fixed readable heading, disclosure, control-label and status colours in both themes. The expanded production regression includes the AI panel's explanatory text (using the lighter gradient endpoint for conservative contrast), plus the PITR/colour/scene cards; the minimum remained 6.18:1. The packaged report flow was rerun successfully after this CSS-only correction. The previously verified AI worker hash remains unchanged.

## 2026.11.05-restyle-integrated-1 — report replacement

The public deployment was verified to be byte-identical to the uploaded standalone prototype, so this incident was an integration mismatch rather than demonstrated stale cache. Public owner App Key was empty; no secret exposure was found and no live generation was executed.

The new production report removes old local AI-preview controls and includes all four illustrated style choices. The exact compiled docs folder was tested at /intellicare-pitr/ for every style, native modal open/close, 1240×1754 report-original preload, no re-upload input or sample substitution, memory-only provider connection reuse, explicit mock-generation apply back into the report, original byte-for-byte restoration, original-only process preservation, downloads, Escape and draw-again cleanup. Report overflow checks cover 360, 768 and 1440 pixels. JPEG provider responses were successfully normalized to PNG and exported through the selected-artwork/original workflow. Read-only integration audit found no blocker. This evidence is provider-double protocol/UI validation, not a claim of successful live-provider restyling.

The old Swin2SR preview GUI described in historical QA sections is retired in this release. Its worker files remain as unused source; the new production bundle does not reference/download its worker or runtime. Current feature verification is tests/report_restyle_smoke.py; owner setup and actual provider output remain pending.
