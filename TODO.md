# Rain & Me delivery outcomes

## 1. Welcome, consent, and safe framing
- [ ] Welcome screen includes title/tagline, exact five-minute instructions, optional nickname and age group, consent checkbox, disabled-until-consent Start Drawing, privacy note, dark mode, reduced-motion support, and the mandatory non-diagnostic framing.

## 2. Drawing studio and input
- [ ] Responsive A4-ratio paper canvas works at 360, 768, 1024, and 1440px widths with no horizontal scrolling.
- [ ] Pointer Events support mouse, touch, and stylus pressure where available; canvas uses `touch-action: none` and drawing does not scroll the page.
- [ ] Eight brushes, eraser, flood fill, curated palette, color input, eyedropper, size/opacity controls, recent colors, undo/redo, clear confirmation, zoom/pan, fit-to-screen, and tooltips are available with 44px+ targets.
- [ ] Strokes log timestamp, tool, color, size, opacity, point count, bounds, and average pressure.

## 3. Timing and persistence
- [ ] Five-minute MM:SS timer uses real elapsed timestamps, persists across refresh/tab switching, cues at 60 seconds/10 seconds when enabled, freezes at zero, and auto-submits.
- [ ] Mid-session drawing and profile restore from localStorage.
- [ ] Early Submit asks for confirmation.

## 4. Reflection report and ethics
- [ ] Developing screen appears before report; report uses exploratory, tentative, strength-first language and has a blank/no-person guardrail.
- [ ] Report includes PITR-inspired readings for expression/posture, umbrella or shelter, rain, additional elements, composition, and colour, while keeping each observation visibly tentative and non-diagnostic.
- [ ] Report includes artwork hero, weather badge, Stress/Resources/Coping swatches, noticed chips, palette, process timeline, prompts, exact nine references, always-visible disclaimer, Singapore support resources, local gallery, redraw, share, PNG export, and print/PDF path.
- [ ] Report offers a private local gallery finish without requiring an AI account, API key, upload, or credits, and documents the trade-offs before any future hosted AI integration.
- [ ] No diagnostic claims, rankings, or invented references; support-first state exists for distress flags in the analysis boundary.

## 5. Static deployment and QA
- [ ] `scoring.config.json`, `resources.config.json`, `README.md`, `QA.md`, PWA manifest/service worker, and `manus-routes.json` are included.
- [ ] `npm run typecheck` and `npm run build` pass; build emits GitHub Pages-compatible static output.
- [ ] Representative mobile and desktop preview screenshots are inspected before delivery.
