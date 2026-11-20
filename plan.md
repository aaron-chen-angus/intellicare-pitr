# Rain & Me — Implementation Plan

## Product scope
A static-first React + Vite + TypeScript web app for GitHub Pages. It implements the four-screen Rain & Me experience: welcome/consent, drawing studio, developing artwork, and reflection report. No account, backend, database, or API key is required for the test build. The client computes an explicitly exploratory report from the visible artwork and process log; a small typed analysis boundary will make a future server-side vision endpoint replaceable without changing the UI.

## Design direction

### Three possible directions
- **Watercolour gallery in the rain** — 0.07 probability; a calm art-therapy gallery with paper, pigment, and weather motifs.
- **Quiet atelier notebook** — 0.05 probability; intimate editorial pages with ink margins and studio annotations.
- **Night rain lantern** — 0.03 probability; a darker indigo experience with warm lantern accents and reflective pacing.

### Chosen direction: Boutique rain atelier

- **Design Movement:** boutique editorial atelier / contemporary art-book interface.
- **Core Principles:** make the artwork the emotional centre; pair warm paper with deep ink and disciplined contrast; use asymmetrical gallery composition rather than dashboard density; keep motion calm and purposeful.
- **Color Philosophy:** mist blue, lilac, teal, cream paper, and warm peach create a gentle weather spectrum. Deep indigo and ink provide readable anchors; coral is reserved for time-sensitive state without feeling alarming.
- **Layout Paradigm:** an exhibit-like vertical flow with a framed paper canvas, floating tool rail, oversized serif headlines, and report cards arranged like pages from a curated visual journal.
- **Signature Elements:** dark editorial weather plaques; numbered reading cards; a quiet paper-and-pigment finish for saved artwork.
- **Interaction Philosophy:** every action should feel like making art: color selection ripples, buttons lift like paper tabs, and brush previews respond immediately. Avoid gamifying distress or ranking results.
- **Animation:** low-amplitude watercolor drift and rain only on welcome/report screens; studio animation stays light to preserve focus and performance. Respect reduced motion and coarse-pointer settings.
- **Typography System:** Fraunces for display headings and wordmark, Nunito for body and controls. Use clear type scale and visible focus rings for WCAG AA readability.
- **Brand Essence:** a gentle digital rain-room for noticing your own creative choices; calm, curious, protective.
- **Brand Voice:** headlines are poetic but plain-spoken; CTAs are direct and reassuring. Example lines: “Every storm has a story.” / “Take a little longer with what you made.”
- **Wordmark & Logo:** “Rain & Me” set beside a hand-drawn rain-window mark: three descending drops crossing a small paper sun.
- **Signature Brand Color:** **Rainroom Teal** `#2E8C88`, used for primary actions, focus, and the app mark.

## Implementation approach

1. **Foundation:** Vite + React + TypeScript, minimal dependency surface, static asset paths compatible with GitHub Pages. Add a package manager pin, build scripts, `public/manus-routes.json`, `public/manifest.webmanifest`, `public/sw.js`, `public/icons.svg`, and a GitHub Pages workflow example in the README. Use HashRouter-compatible navigation semantics by keeping the experience in one app route and avoiding server rewrites.
2. **State model:** a single typed session store with screen, user profile, consent, drawing session, timer timestamps, tool state, history, and report state. Persist the drawing bitmap, stroke JSON, timer start/elapsed information, and profile to localStorage; restore safely after accidental refresh.
3. **Canvas engine:** one high-resolution A4-ratio drawing canvas with logical 1240×1754 coordinates and CSS scaling. Use Pointer Events with `touch-action: none`, pressure-aware width, velocity fallback, stabilised point sampling, layered paper/drawing rendering, and requestAnimationFrame batching. Implement brush recipes for pencil, ink, marker, watercolour, crayon, airbrush, calligraphy, and highlighter, plus eraser.
4. **Canvas tools:** curated 24-color palette, native color input as HSV fallback, recent colors, eyedropper, size/opacity controls, undo/redo stacks (at least 30), clear confirmation, flood fill with tolerance, fit-to-screen, wheel/gesture zoom, and space-drag/pointer pan. Keep tool buttons at 44px minimum.
5. **Timing and process log:** calculate remaining time from `Date.now()` against the persisted start timestamp rather than interval drift. Trigger gentle sound/pulse cues at 60s and 10s when enabled. Auto-freeze/submit at zero, preserve auto-submit state, and log per-stroke metadata including tool, color, size, opacity, point count, bounds, duration, and average pressure.
6. **Exploratory analysis:** deterministic pixel metrics and stroke-derived rain heuristics run locally. Use `scoring.config.json` for editable heuristic weights and `resources.config.json` for Singapore support resources. Generate a transparent report from visible/process evidence only, with low-confidence observations marked as possible and a friendly blank/no-person outcome. Include a clearly labelled “Exploratory reflection” note and the exact disclaimer.
7. **Report and exports:** artwork hero, coping/weather badge, three swatch meters, noticed-element chips, palette blobs, process timeline, reflection prompts, references accordion using exactly the nine supplied citations, support resources, disclaimer, save-to-gallery, redraw, Web Share API, PNG download, and a print/PDF-friendly report view using the browser print dialog. Avoid promising a server-side PDF renderer in the static-only build.
8. **Accessibility and resilience:** semantic controls, labels, keyboard support, focus states, live timer announcement, reduced-motion mode, dark mode, blank-canvas guardrails, low-power particle reduction, and responsive layout checks at 360/768/1024/1440 widths.

## Project structure

```text
rainandme/
├── public/
│   ├── icons.svg
│   ├── manifest.webmanifest
│   ├── manus-routes.json
│   └── sw.js
├── src/
│   ├── components/       # Welcome, Studio, Report, shared art UI
│   ├── data/              # palette, references, supportive copy
│   ├── engine/            # canvas, brushes, flood fill, metrics, export
│   ├── hooks/             # timer, persistence, media-query helpers
│   ├── lib/               # types, analysis boundary, local gallery
│   ├── styles/            # global theme and responsive CSS
│   ├── App.tsx
│   └── main.tsx
├── scoring.config.json
├── resources.config.json
├── README.md
├── QA.md
├── TODO.md
├── index.html
├── package.json
├── tsconfig.json
└── vite.config.ts
```

## Material and technical constraints

- No external image assets are required; the app’s visual identity is CSS/SVG/canvas based.
- No API keys or private credentials appear in client code.
- The report is reflective and non-diagnostic. It never uses diagnostic labels or claims validated scoring.
- Use only the nine references provided in the build brief.
- The static build must emit an `index.html` in `dist/` and work from a GitHub Pages subpath through relative asset URLs.

## Serving and delivery

Run the Vite dev server on the configured port 3000, verify `manus-routes.json` over HTTP, run typecheck/build, inspect representative desktop/mobile screenshots, then save a checkpoint. Provide README instructions for local testing, GitHub Pages deployment via Actions, changing the five-minute cap, editing scoring weights/resources, and the optional future analysis API boundary.

## November 5 report/AI refinement
The reported WebGPU buffer failure requires bounded local inference, not another full-image retry. Run Swin2SR in a dedicated cancellable WASM worker on overlapping small patches of an aspect-preserving working preview; disclose the preview output dimensions and keep the original downloadable. Do not promise generative restyling.

Replace long speculative paragraphs with short illustrated PITR reflection cues grounded in the supplied slides. Ask the artist to confirm expression, posture, umbrella, rain and extra elements; browser stroke geometry does not establish facial emotion or personality. Reflective associations use “may represent” language with one clear non-diagnostic caveat. Remove visible pseudo-psychological stress/coping meters in favour of descriptive scene cues; keep legacy metrics available only as technical detail.

Palette visuals cover colours actually used in retained strokes, not merely selected. Display a proportional estimated stroke-ink bar and succinct colour associations; exclude eraser strokes and report fill colours separately because their area is not measured. Add optional studio focus labels (person, umbrella, rain, scene), persist those labels with timestamps, and offer post-drawing relabelling. A replay slider and scene lanes show actual retained-stroke times; unlabelled marks remain unlabelled rather than being falsely recognised. New modules live in `src/ai/`, `src/report/`, `src/process.ts` and shared canvas rendering.

Deliver a new versioned GitHub Pages source and precompiled `docs` package; never silently overwrite or claim to have updated the user's repository.

## Independent genuine-restyle prototype

The user now explicitly requests artistic image-to-image conversion: Anime, Realistic and other styles, with examples, and asks to work on this separately first. Build an isolated `#/restyle` lab without replacing the PITR flow or interpreting generated pixels. Generate four honest example conversions of the supplied sketch (Anime, Realistic, Watercolour, Graphic Novel), expose example-versus-your-drawing distinction, preserve originals, allow style selection, before/after comparison, strength expressed as prompt guidance rather than an unsupported denoise parameter, and download.

A hosted adapter must send the actual image as well as the selected style prompt; a text-only generation or CSS filter is not restyling. Verify Pollinations' current OpenAI-compatible image-edit endpoint and user-authorised frontend credential flow before connecting it. Keep credentials out of source, persistent storage and URLs; disclose drawing upload and provider allowance limits, and require explicit per-generation consent. Do not claim unlimited/no-account free generation or silently use paid allowances. If an end-to-end provider connection cannot be tested without the user's account, label that boundary clearly while delivering genuine generated samples and the standalone lab for review.

New modules: `src/restyle/` for styles, isolated lab and provider adapter; `public/restyle/` for display samples; main entry switches on `#/restyle`. Main App and prior report remain unchanged. Use existing typography, deep ink/paper contrast and an image-led exhibit layout, with 44px controls, responsive framing and no cropped artwork.

## Correction: integrate artistic restyling into the report

The user's screenshot confirms that the independent lab was not a replacement for the enhancer they actually used. Remove the Swin2SR preview action/state and its misleading AI-preview tab from the report. Put four explicit Anime/Realistic/Watercolour/Graphic Novel sample choices beside the report artwork flow. Clicking any style opens the same art studio in an accessible modal with the actual full-resolution report drawing already loaded—no separate URL or re-upload. A successful generated result can be explicitly applied to the report and its image exports, with an honest style-name tab; original image and PITR/process interpretation remain unchanged. Samples never stand in for a restyle of this user's drawing.

Retain the provider's real image-edit adapter, owner public App Key, OAuth/Quest-only guard and explicit upload consent. Preserve any existing public provider configuration from the user's deployed site in the replacement package; do not copy or bundle secret keys. Owner configuration/live-generation verification remains a separate pending requirement, not a completed inference claim. Keep the standalone page as optional, but it is no longer the primary report entry.

### Free-only connection correction

The current OAuth connection can return a paid-capable key and defer the Quest-only switch to the user. Correct the active authorized key immediately using its existing account settings. For new connections, use only a source-verified provider-supported Quest-only grant or narrow self-restriction; continue to require `questPollenOnly: true` from `/account/key` before any drawing transmission. No broad account-admin scope, no paid fallback, no fabricated free quota and no secret embedded in the site. Keep changes limited to authorization, clear free-only messaging and their focused regression checks.

## November 13 — Artist's scrapbook redesign

Use https://essillustration.com/ as an art-direction reference for illustration-led confidence, uncluttered presentation and personal creative character; do not copy its images, logo or layouts literally. Replace the current gradient/dashboard aesthetic with an artist's scrapbook: warm ivory paper on a textured desk, a berry-red signature accent, forest green, dusty rose, powder blue and ochre; elegant DM Serif Display titles and italics, clear DM Sans interface text, and Caveat handwritten annotations used sparingly. Hero art is one original cut-paper rain illustration, mounted with tape and a handwritten margin note. Report sections resemble indexed journal pages and clipped artwork, with restrained variation rather than rotations on every interactive panel.

Implementation is presentation-only. Add `src/scrapbook.css` for the shared theme/welcome/studio and `src/scrapbook-report.css` for report/restyle presentation. Put existing CSS in a lower-priority `legacy` cascade layer to avoid the accumulated contrast overrides winning unpredictably; retain its functional/responsive rules. Only the welcome's decorative JSX is replaced, with any other JSX changes restricted to decorative wrappers/classes. No changes to handlers, state, canvas renderer/pointer transforms, timer, persistence keys, heuristics, scene notes, exports, galleries, REST endpoints, provider configuration, scopes, free-only guard or upload consent. Keep the exact drawing instructions and disclaimer. Decorative layers have no pointer interception and never enter exported drawing pixels. Keep light/dark text-surface pairs, 44px controls, reduced motion, mobile layout and print/PDF legibility. Deliver a clearly versioned static GitHub Pages overlay that does not replace the existing public provider configuration.

### November 13 interactive report correction

Fix the mismatched six-lens form with an independent figure-size/page-position field and actionable confirmation links. Add a region/time bulk label editor using original logical coordinates and retained event timestamps, with whole-stroke intersection, fill seedpoints, atomic parent updates and label-only undo; keep per-stroke editing as advanced detail. Replace free-text discovery cards with choice-led feeling/intensity word clouds, personal drawing-colour matches, support selection and a specific trigger/action plan, producing a local visual keepsake and JSON outcome. Adapt practical small-step ideas from authoritative WHO/NHS guidance and use colour research to avoid fixed individual interpretations; do not claim clinical validation. New components live in src/report with small deterministic helpers. Integrate only report state/callbacks; do not change intake, timed drawing, pixel renderer, original retention, provider OAuth/scopes/billing guard or art-restyle semantics. Reuse the current scrapbook styling and existing icons/assets, with no new paid service. Ship a versioned compiled overlay that preserves the deployed public provider configuration and sample assets.

## November 13 — Clear hero, meaningful process guidance and designed PDF

Remove the decorative time seal and handwritten hero margin note entirely; keep one unobstructed illustration with a normal-flow, readable caption. No replacement clutter. Extend retained-process description with transparent active pen-time shares (not elapsed first-to-last spans or page area), full unlabelled denominator, sequence, revisits and timestamp limitations. Add concise What it shows / What to explore / One next step guidance based on measured focus and user-confirmed choices; no stress/coping/personality score or unsupported clinical inference.

Replace the single artwork-page PDF with a locally generated jsPDF report, named Personal reflection report rather than a diagnostic medical record. Use polished clinical-editorial layout, restrained paper/forest palette, readable titles, original artwork, six confirmed details, quantitative process shares/timeline, estimated ink palette with honest denominator, actual feelings/colour links/support/action choice outcomes, concise evidence limitations and configured support. Use selectable text, deterministic chart values and aspect-preserved images, no screenshotting full DOM, no remote service, paid API or external account. Unconfirmed/incomplete/no-stroke reports remain honest and printable. Report generation reads latest local choices at click-time and does not use generatively restyled pixels as analysis evidence. Keep drawing/intake/timer/restyling/paid-balance safeguards unchanged. Ship versioned docs overlay preserving public provider configuration, plus complete source and a clearly QA-labelled sample PDF from the recorded test fixture.

Final designed-report layout is five A4 pages: original artwork and six scene details; measured process shares and timeline; actual feeling/colour/support/action choices; concise process guidance plus estimated-ink visualization; evidence, care and retained nine references. A reference-only sixth page is allowed if needed rather than clipping. Fonts are static local TTFs converted from existing licensed assets and embedded in the PDF module. Browser regression passed on the exact compiled update folder, including incomplete/blank, storage-blocked current choices and explicit export failure behavior. The overlay deliberately preserves existing provider configuration and restyle sample images.

## November 13 — Premium dual-artwork report

The report must now display the user's applied artistic restyle alongside the unchanged original, independently of the on-screen Original/Styled tab. Export snapshots the original and the current applied restyle plus its honest style name. Styling is for comparison only; scene, process measures, palette and reflection choices continue to derive from original retained records. Never substitute a style sample or a gallery filter. If no restyle is applied, show an honest not-applied state; a malformed supplied styled image must show an export error rather than silently omit it.

Rework the PDF as an art-book/wellbeing editorial: deep ink, muted warm paper and restrained brass accents; confident serif typography, generous aligned margins, strong section hierarchy, fitted dual artwork frames, clean data tables and readable vector charts. Eliminate the current generic scattered labels and excessive empty bands. Keep selectable text, original six confirmations, exact disclaimer and nine references, concise data/limitations, actual feeling-colour-support/action choices, latest in-memory snapshots, failure recovery and offline GitHub Pages export. Keep the web app design and all intake/drawing/restyle/billing logic unchanged. Deliver a distinctly versioned compiled overlay, complete source and an explicitly illustrative QA comparison PDF; do not claim to reconstruct the user's missing styled image from their uploaded original-only PDF.
