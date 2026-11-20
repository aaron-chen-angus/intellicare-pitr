# Update the working GitHub Pages site

Latest release: **2026.11.05-atelier-2**. Use only the newly supplied ZIPs with this release name. Preparing files here does not update your GitHub repository automatically.

## Recommended for your existing site: replace compiled docs

1. Extract `intellicare-pitr-ready-2026.11.05-atelier-2.zip`.
2. Open https://github.com/aaron-chen-angus/intellicare-pitr and choose **Add file → Upload files**.
3. Drag the **whole `docs` folder** from the extracted package into the upload area. The repository must contain `docs/index.html`, `docs/build-info.json`, `docs/sw.js`, and the new `docs/assets/` files—including `worker-*.js`.
4. Commit to `main`, replacing same-named files. Do not put `docs` inside another `docs` or upload the ZIP itself.
5. Keep **Settings → Pages → Deploy from a branch → main → /docs**. If this is already selected, no settings change is needed.
6. Wait for GitHub's **pages build and deployment** run to finish successfully. That run is correct for this prebuilt `/docs` route.
7. Open https://aaron-chen-angus.github.io/intellicare-pitr/ with a trailing slash. The strip must say **Release 2026.11.05-atelier-2**.
8. Check https://aaron-chen-angus.github.io/intellicare-pitr/build-info.json for the same release. If it differs, the new deployment has not reached the site; inspect its latest run instead of uploading random source files.

Old hashed assets may remain temporarily; new `docs/index.html` references only the new hashes. Every supplied file is below GitHub's browser-upload file-size limit. Model/runtime downloads happen from their pinned providers, not a large bundled WASM file in this ZIP.

After submission, look for **Describe your drawing**, six short illustrated PITR lenses, **Your palette, your meaning**, **Your process, mark by mark** and the cancellable local AI preview. For meaningful element timing, use **Drawing focus** while drawing, or correct stroke labels in the report. Facial expressions and objects are not automatically recognised.

## Alternative for ongoing source development: Actions

Use `intellicare-pitr-source-2026.11.05-atelier-2.zip`. Upload the full extracted project at the repository root, including hidden `.github/workflows/deploy-pages.yml`, `src/`, `public/`, `index.html`, package/lockfile, JSON/YAML configs, Vite and TypeScript configs. Choose **Settings → Pages → GitHub Actions**. The included **Build and deploy Rain & Me** workflow installs, builds and deploys `dist/`.

This is an alternative to `/docs`, not an extra requirement. Do not switch your working `/docs` site to Actions unless you want GitHub to compile the source on later edits.

## Blank-page safeguards

Never deploy raw root `index.html`/`src/main.tsx` with branch-root publishing. GitHub Pages cannot compile TypeScript or JSX by itself. The earlier blank page came from that mistake; a compiled `/docs` or Actions-built `dist` site is required. Do not omit JS, CSS or worker assets. If a deployment fails, inspect the failed job's exact error.

## AI expectations

The AI feature is a memory-bounded **2× small preview**, not full-resolution enhancement or generative restyling. It uses local WASM patches, downloads its free model/runtime on first use, and has progress/cancel/timeout controls. Original artwork stays available separately. Slow or restricted browsers/networks can still fail gracefully; no universal or instant performance is promised.
