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
