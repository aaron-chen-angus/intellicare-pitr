# Rain & Me · PITR reflection studio

Release: **2026.11.05-restyle-integrated-1**.

Static React + Vite + TypeScript drawing and reflection app. Person-in-the-Rain imagery is a conversation starter, not a psychological assessment. Drawing, reflective cards, process replay and style examples require no backend or paid account. Actual artistic image generation requires the configured external provider and user authorization described below.

## Current artwork workflow

The report now directly offers **Anime, Realistic, Watercolour and Graphic Novel** choices. Click a style or **Restyle drawing** under the artwork. The studio opens in a modal with the actual full-size original preloaded—no separate page or upload. Four thumbnails are labelled example styles; they are never substituted for a generated version of the user's drawing.

The old Swin2SR **AI preview**, preview-quality selector and Enhance with AI report action are removed. A successful artistic result can be explicitly applied with **Use this artwork in report**. A style-named comparison tab such as **Anime version** appears only after a successful result is applied. PNG/PDF/share exports use the selected image; the original download and PITR/colour/process interpretation always retain the original. Provider JPEG/WebP results are normalized to PNG for the report exports. Gallery finish remains a separate non-AI framing effect.

## Provider setup and privacy

`public/restyle.config.json` (or `docs/restyle.config.json` in the prebuilt deployment) contains only a public `pk_` App Key identifier, never a secret `sk_` key. Register the exact site root as the provider redirect URI. The user connects Pollinations with PKCE OAuth and must use an authorized Quest-only key with earned credits. The client checks the server-attested Quest-only flag before every edit and refuses keys that could spend paid balance. This is not unlimited, anonymous, no-credit generation. Tokens stay in memory; images are sent externally only after explicit generation consent. The provider may retain generated media.

The verified user deployment currently had an empty App Key. The release does not invent a key or claim a successful live provider edit. Protocol/result integration is tested with provider doubles. See **RESTYLE-INTEGRATED-UPDATE.md** for exact deployment and the remaining setup requirement. The optional `#/restyle` route remains available, but the main report is now the primary entry.

## Reflection and process

Illustrated cards give short cues for expression, posture, umbrella, rain, additional elements and composition. **Describe your drawing** confirms features; the app does not claim automatic facial-emotion recognition or diagnose from marks. Colour cards show short associations and estimated stroke-ink share, not emotional scores.

**Drawing focus** labels marks Person, Umbrella, Rain or Other elements. Process uses retained stroke timestamps, first/last times, measured pen-down time and a replay slider. Labels can be corrected after submission. Unlabelled marks remain unlabelled, older untimestamped fills cannot be timed and discarded undo/clear history is not reconstructed.

## Run and build

Use Node.js 22 and the pinned pnpm in `package.json`:

```sh
corepack enable
pnpm install --frozen-lockfile
pnpm run dev
pnpm run typecheck
pnpm run build
```

Development listens on port 3000. Publish compiled `dist/` files, never raw `src/main.tsx` or source `index.html`. Relative Vite base `./` supports the `/intellicare-pitr/` Pages subpath with a trailing slash.

## Update the existing GitHub Pages /docs deployment

Extract the **restyle-integrated-1** ready ZIP. At the root of `aaron-chen-angus/intellicare-pitr`, upload the complete extracted **docs** folder, replacing matching files and including all new hashed assets and restyle images. Commit to main. Keep **Settings → Pages → Deploy from a branch → main → /docs**. Do not create `docs/docs`, upload only the pictures/index, or upload the ZIP itself. Wait for Pages deployment success. The visible strip and root `build-info.json` must show **2026.11.05-restyle-integrated-1**.

Alternatively, upload the complete source project and choose GitHub Actions with `.github/workflows/deploy-pages.yml`. That installs, typechecks, builds and publishes `dist`. Do not mix source-only root publishing with the precompiled /docs deployment method.

## Code and checks

`src/restyle/` owns artistic styles, report modal, original/result handling, provider adapter and OAuth. `src/report/` owns reflective cards, colour stories and replay. `src/process.ts` calculates descriptive colour/time metrics; `src/canvas.ts` reconstructs strokes/fills chronologically. `src/engine.ts` remains a replaceable legacy exploratory boundary, not a clinical assessment. The nine references, disclaimer, Singapore support resources, five-minute timer and drawing tools are preserved.

Sessions/gallery use browser storage where available; blocked/corrupt storage does not blank the app. Written report notes and provider tokens stay in memory. Local managed checkpoints do not automatically update the user's GitHub repository.

Current optional production QA:

```sh
python3 tests/report_revision_smoke.py
python3 tests/report_restyle_smoke.py
```

The latter exercises the actual report, all four styles, exact original preload, no sample substitution, mocked provider result application/export, original-only process preservation, connection reuse, modal close and responsive widths. It does not prove live provider quality. Historical `src/ai/` and old Swin2SR tests remain unused source and are not the current report feature.
