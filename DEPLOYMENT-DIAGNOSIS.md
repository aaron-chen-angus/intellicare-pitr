# Why intellicare-pitr showed a blank page

Checked on 5 November 2026 against https://aaron-chen-angus.github.io/intellicare-pitr/ and https://github.com/aaron-chen-angus/intellicare-pitr.

The live HTML referenced `./src/main.tsx`. GitHub Pages returned that file as `application/octet-stream`, not JavaScript. Browsers cannot execute raw TypeScript/JSX or resolve its bare `react` imports. This is the immediate blank-page cause: unbuilt Vite source was published.

The public repository tree had no `.github/workflows/` folder. Its only Actions run was GitHub's automatic `pages build and deployment` run (42022007688, commit 1c0ce23c8c0d344a4a8fc151e16d68a7244017ae). That run published branch contents but did not perform a Vite build. A green Pages deployment therefore did not mean the React application had been compiled.

The repository also had invalid `pnpm-workspace.yaml` approvals: `onnxruntime-node` and `protobufjs` were literal strings saying `set this to true or false`. A real pnpm build would stop until those settings were corrected.

The earlier download archive supplied in this task was stale. It still contained those placeholder approvals, the old cache-first service worker, and an earlier report without the latest self-discovery changes. Reusing that archive reintroduced old code. This was an artifact handoff mistake, not a mistake by the user. It does not prove the earlier Manus-hosted screenshots had the same cause; those earlier cache/deployment assertions were not fully verified.

## Correct publication

Either deploy compiled `dist` using the included GitHub Actions workflow, or upload only an already-built static site through the prebuilt alternative. Do not publish the source folder directly.

The new release identifies itself as `2026.11.05-pages-fix-1` both in a visible strip and in `build-info.json`. Verify this marker in the site actually served, rather than assuming a source edit or green deployment is sufficient.

Sources: [live HTML](https://aaron-chen-angus.github.io/intellicare-pitr/), [entry script](https://aaron-chen-angus.github.io/intellicare-pitr/src/main.tsx), [repository](https://github.com/aaron-chen-angus/intellicare-pitr), [Pages run](https://github.com/aaron-chen-angus/intellicare-pitr/actions/runs/42022007688), [official Vite Pages build guidance](https://vite.dev/guide/static-deploy#github-pages).
