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
