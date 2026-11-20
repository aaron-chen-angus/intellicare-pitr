# Release 2026.11.05-atelier-2

This release addresses the reported full-image GPU-buffer failure and the report's vague interpretation, colour and process sections.

The AI handler no longer tries the full canvas on WebGPU. A dedicated cancellable worker runs bounded 64×64 Swin2SR patches through WASM and stitches a small 2× preview. Quick is the default; Standard and Detailed remain selectable. The original is kept separately, output dimensions are stated, and download/share/gallery follow the selected Original/AI preview/Gallery finish view. The feature is not generative restyling or a full-resolution upgrade.

PITR cards now use short illustrated cues adapted from the supplied activity slides. Artist-confirmed expression, posture, umbrella, rain and additional elements drive the reflection wording. Colour cards provide named associations and proportional estimated stroke-ink shares, with optional personal meanings. Numerical stress/coping meters were removed from the primary report because stroke counts do not establish psychological facts.

New Drawing focus tags and fill timestamps support first/last element times, coloured lanes, replay and post-drawing relabelling. Unlabelled marks remain unlabelled. A restoration/undo bug that resurrected a stale raster backup was corrected by keeping vector/fill reconstruction authoritative. The full disclaimer and supplied nine references remain.

The compiled report was checked at /intellicare-pitr/ and 360/768/1440 widths. New text contrast was at least 6.18:1 on tested cards in both themes. A real Standard-mode test used a full-size 1240×1754 input, completed 24 patches and returned a 362×512 preview in 276.6 seconds, with cancellation/original preservation. This is one test environment, not device-wide certification.

The prebuilt and source downloads are versioned and byte-checked. The managed checkpoint does not update the unauthenticated user-owned GitHub repository. Upload the new compiled docs folder and keep main /docs branch deployment; see GITHUB-PAGES-REPAIR.md.

Historical blank-page safeguards from pages-fix-1 remain: compiled static entry, relative assets, build workflow, guarded storage, error boundary, app-scoped network-first service worker and visible release metadata.
