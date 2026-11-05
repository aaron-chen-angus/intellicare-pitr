# Rain & Me

Rain & Me is a static-first React + Vite + TypeScript art-therapy reflection experience. It helps a person draw a person in the rain, then offers a gentle, exploratory reflection based on visible canvas/process signals. It is not a psychological test or diagnosis.

## Run locally

```bash
pnpm install
pnpm dev
```

The preview server listens on port `3000`. Typecheck and build with:

```bash
pnpm run typecheck
pnpm run build
```

The production output is written to `dist/` and uses relative asset URLs so it can be served from a GitHub Pages project subpath.

## GitHub Pages deployment

Create a repository, push this folder, then enable **Settings → Pages → GitHub Actions**. Add this workflow at `.github/workflows/deploy-pages.yml` (or copy the equivalent workflow from your own starter):

```yaml
name: Deploy Vite site to GitHub Pages
on:
  push:
    branches: [main]
  workflow_dispatch:
permissions:
  contents: read
  pages: write
  id-token: write
concurrency:
  group: pages
  cancel-in-progress: true
jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4
      - uses: pnpm/action-setup@v4
        with:
          version: 11
      - uses: actions/setup-node@v4
        with:
          node-version: 22
          cache: pnpm
      - run: pnpm install --frozen-lockfile
      - run: pnpm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist
      - uses: actions/deploy-pages@v4
```

If you prefer the classic `gh-pages` branch flow, publish the `dist/` directory after `pnpm run build`. The app is a single-screen experience, so it does not need server-side route rewrites.

## Changing the activity and scoring

- Change the five-minute cap in `src/data.ts` by editing `DRAWING_SECONDS`.
- Edit the clearly labelled heuristic weights and band thresholds in `scoring.config.json`.
- Edit regional helplines in `resources.config.json`.
- The local report is intentionally exploratory. The typed analysis boundary is `analyseLocally` in `src/engine.ts`; a future server-side vision endpoint can replace that function without changing the drawing UI.

## Privacy and safety

No account or backend is required. The in-progress drawing is persisted in browser `localStorage` so refresh recovery works. Gallery saves are local to the current device. The report includes the exact safety disclaimer and Singapore support resources from the supplied brief. No API key is shipped to the browser.

The nine references shown in the report are exactly the references supplied in the build brief; no additional references are invented.

The report includes the PITR activity framework for expression, posture, umbrella/shelter, rain, additional elements, figure/composition, and colour. It also includes **Enhance with AI**, a free browser-local Transformers.js super-resolution pass with WebGPU/CPU fallback, plus a separate private gallery finish. See [AI-BEAUTIFY.md](./AI-BEAUTIFY.md) for the model and hosted-service trade-offs.
