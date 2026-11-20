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

## 6. GitHub Pages blank-screen repair
- [x] Provide a fresh, complete source ZIP with the real workflow at `.github/workflows/deploy-pages.yml` and boolean dependency-build policies (no placeholder strings).
- [x] Pages workflow compiles TypeScript with Vite and uploads only `dist`, never the raw source `index.html`.
- [x] Verify the production artifact under `/intellicare-pitr/`, including welcome, studio, report, light/dark contrast, PITR headings and self-discovery activities.
- [x] A visible release marker and `build-info.json` identify which build the browser actually loaded.
- [x] Provide deployment instructions tailored to `aaron-chen-angus/intellicare-pitr`, distinguishing source-with-Actions from prebuilt static upload.
- [ ] Apply the replacement to the user-owned GitHub repository and verify its live Pages release; repository access was not authorized during this repair.

## 7. Short visual report and robust AI revision
- [x] Full 1240×1754 drawings are processed through bounded overlapping tiles in a cancellable worker, with WASM fallback, visible progress and an actionable short failure state; never send the full image through WebGPU.
- [x] Keep original artwork, allow Original/AI preview comparison, and state working/output dimensions and that super-resolution is not generative restyling.
- [x] Replace verbose interpretations with short illustrated expression, posture, umbrella, rain and additional-element cues grounded in the supplied slide framework; distinguish artist-confirmed features from guesses and never diagnose from drawing marks.
- [x] Actual used colours have short named associations and a proportional labelled visual; exclude erasers and distinguish estimated stroke-ink share from pixel area and selected-but-unused colours.
- [x] Process shows person, umbrella, rain and scene lanes with measured first/last times, replay and editable focus labels; old unlabelled strokes never silently become confirmed semantic events.
- [x] Preserve consent, five-minute timer, strokes, references/disclaimer/support, current routes, drawing tools and GitHub Pages subpath deployment.
- [x] Fresh source and prebuilt packages carry the new release marker; real production browser checks cover full-size AI input, cancellation, label/replay behavior, concise report and theme contrast.

## 8. Independent genuine artistic-restyle lab
- [x] Offer Anime, Realistic, Watercolour and Graphic Novel styles with genuine image-edited samples from the same sketch, not filters or unrelated stock.
- [x] An isolated #/restyle page supports upload, style choice, Original/Styled comparison and download while preserving originals; own-source result flow is protocol-tested with provider doubles and requires owner/user configuration for live generation. Existing PITR App remains unchanged.
- [x] Generation requests include both drawing image and style instructions; only successful provider responses may replace a user's result, never a prerecorded sample. Image-conditioned request/response contract is verified with test doubles, not claimed as live-provider success.
- [x] Drawings stay local until explicit upload/generation consent; provider credentials stay in memory and are never embedded in the bundle, persisted or logged.
- [x] Explain provider-account/allowance requirements honestly; unsupported unlimited free/no-account generation is not promised. Free-only mode requires server-attested Quest-only credits, has actionable errors/cancel, and shows actual sample-review/setup-pending mode.
- [x] Distinct release marker, synced route declaration, production subpath/contrast/resize checks, and byte-verified standalone source/prebuilt deliverables identify the experimental lab without overwriting the user's repository.
- [ ] Enable and verify live image editing after owner App Key registration and explicit user-authorised Quest-only account setup; no account/token was provided during this prototype.

## 9. Replace the old report preview with artistic restyling
- [x] The actual report no longer renders the local AI preview/quality controls or the old AI preview tab.
- [x] Four illustrated Anime, Realistic, Watercolour and Graphic Novel choices are directly visible in the report; the artwork's Restyle action opens this same workflow.
- [x] A selected style opens the studio with the actual full-resolution report drawing preloaded locally, without re-upload or a separate page; examples remain labelled style references, never substituted results.
- [x] Users can explicitly apply a successfully generated style result to the report/export preview; retain original downloads and original-only PITR/process interpretation, cancellation and stale-result safety. Real report integration is verified using provider doubles; live provider setup remains pending under outcome 8.
- [x] Existing owner public App Key configuration is preserved in the replacement archive when safely available; no secret key is copied or bundled, and provider authorization/earned credits are still disclosed. The current public key field was verified empty, so no fabricated key is supplied.
- [x] Fresh, distinct integrated-release source/prebuilt packages and exact-upload-folder browser checks prove the report entry, all styles, preloaded original, applied-result separation and removal of the old enhancer; the user's live site still requires upload/deployment and no live generation is claimed.

## 10. Free-only connection correction

- [x] Correct the current user-authorised intellicare-pitr key to Quest-only without purchases, budget increases or any drawing upload; the provider dashboard shows Quest-only on that exact connection.
- [x] New connections explain the provider's actual Quest-only consent checkbox and verify the granted key before accepting connection. Automatic checkbox selection is unsupported and is not claimed; no ignored query flag, broad keys-admin permission or removed pre-upload guard is used.
- [x] Clearly distinguish free-only setup failure from insufficient earned credits; never suggest a purchase, paid fallback, or public secret key to resolve either.
- [x] Verify provider-side settings and focused connection/guard regression behavior; unsafe grants, unsafe later key changes and exhausted earned budgets are rejected before upload. Runtime tests use provider doubles and do not claim live generation. The current live key correction needs no deployment; the preventive frontend change remains an optional update until uploaded.

## 11. Artistic scrapbook visual redesign

- [x] Use the supplied essillustration.com reference as artistic inspiration, not copied content; replace generic gradient/dashboard visuals with an illustrated scrapbook aesthetic, textured paper, tasteful collage/tape details, warm ivory, berry and forest accents, expressive title fonts and readable body typography.
- [x] Apply the visual system consistently to welcome/intake, drawing studio, developing screen, report, palette/process/self-discovery sections, gallery finish, artistic-restyle choices and the style studio; keep the drawing canvas uncluttered and unaltered.
- [x] Functionality remains exactly the same: consent/intake, drawing tools and pointer/zoom behavior, timer and restoration, analysis/notes/replay, original and styled artwork, downloads/share/gallery, provider configuration/OAuth, earned-credits-only guard and upload consent. Preserve the exact instructions, disclaimer, support and references.
- [x] Text remains readable with correct explicit foreground/background pairs in light and dark themes; all controls remain reachable on phones, focus targets remain visible, decorative layers do not intercept inputs, and reduced-motion/print behavior is preserved.
- [x] A distinct scrapbook release marker and tested, compiled update package make the change unmistakable and preserve the user's existing restyle.config.json; do not claim the user's live site changed before deployment.

## 12. Six real confirmations, bulk region labels and interactive outcomes

- [x] Sixth Figure/composition has actual independent size and 3×3 page-position controls, with a visible marker/summary; all six areas contribute correctly to /6. Confirm detail opens the relevant controls rather than being an inert label; old scene values remain safe.
- [x] Select a whole rectangular drawing region and/or timestamp interval to label many retained strokes and fill seeds together as Person, Umbrella, Rain or Other elements; region/time intersect when both active. Show highlighted selection, selected count and timing, apply atomically, undo the latest batch, and keep individual rows only as an optional advanced editor. Preserve geometry, original pixels and timestamps; explain whole-stroke and fill-seed selection.
- [x] Replace the three mandatory free-text boxes with structured interactive activities: select/weight feelings for a personal word cloud, match feelings to actual used drawing colours, and choose supports/trigger/action for a concrete small-step plan. All summaries are derived from the user's choices, not personality/diagnostic inference; no required free text, provider account or API call.
- [x] Activities have visible completion/progress, revisable selections, a concrete combined visual outcome, printable/downloadable keepsake and structured-data export; persist small choice records locally without altering the original or uploading a drawing. Invalid/old stored data must not crash the app.
- [x] Research and cite authoritative guidance for the activity approach and limitations; do not present this custom interface as a clinically validated treatment, invent fixed colour psychology, or change the supplied nine PITR references/disclaimer/support.
- [x] Preserve drawing tools/timer/intake, replay, artistic restyling/free-only safeguards and existing scrapbook assets. Verify focused real-report behavior and mobile/contrast, provide a fresh compiled update with an unmistakable release and no replacement of existing restyle.config.json or sample assets. Do not claim the public site changed before deployment.

## 13. Uncluttered hero, useful process guidance and designed downloadable report

- [x] Remove the overlapping A MOMENT TO MAKE / NO WRONG TURNS seal and let your hand tell the story margin note instead of repositioning unnecessary decorations; Rain & Me caption remains visible in normal flow, desktop/mobile and both themes.
- [x] Explain the drawing-process proportions with correctly named active pen-time shares, including unlabelled strokes and known limitations; do not imply these are page area, total session time or validated stress/coping scores. Show sequence and revisits where supported and succinct reflective guidance with a concrete small action; missing labels/timestamps stay unknown.
- [x] At the report's end provide a visible Download reflection report PDF action that creates a beautiful, concise, professional artistic/clinical-editorial multi-page PDF, honestly labelled personal reflection, not medical diagnosis. Include original drawing, six actually confirmed details, scientifically defensible process/palette visualisations, actual interactive outcomes and a user-chosen actionable plan or honest incomplete state, exact disclaimer, sources and configured support. No fake norms or medical authority.
- [x] PDF text is selectable, images preserve aspect, charts match actual records, export uses latest scene/label/activity choices, progress/errors do not show false success; works locally on GitHub Pages without paid services, account or HTML canvas screenshot parsing. Preserve all core drawing/restyle safety behavior.
- [x] Check affected hero and PDF rendering/download with complete and incomplete records, mobile/light/dark and edge inputs; ship a fresh versioned compiled overlay without replacing provider configuration, complete source and a QA-labelled example PDF. Do not claim live site deployment before the user uploads the update.

## 14. Premium PDF with original and styled artwork

- [x] Include the full original drawing and the actually applied AI-styled image together, with clear original/style labels and preserved aspect ratios, even when the on-screen Original tab is selected. No sample substitution or analysis of generated pixels; show an honest not-applied state if no style exists.
- [x] Redesign the whole PDF with a professional high-end editorial/art-book hierarchy, consistent typography/spacing, restrained premium palette, composed image frames, clear tables and useful readable visualizations rather than generic scattered text and large unused bands.
- [x] Preserve actual records, six confirmations, selected activity outcomes/action plan, source limitations, exact care disclaimer and original nine references; current choices are captured at export time. Export remains local/offline, with selectable text, and truthful error/retry handling for bad supplied artwork.
- [x] Verify paired/unstyled exports, original-tab independence, actual embedded image identity and retained data using the compiled app, render the revised pages and ship a fresh versioned compiled update preserving provider config plus full source and a clearly labelled illustrative sample.
