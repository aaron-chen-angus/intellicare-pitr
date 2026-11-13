# Interactive report update — 2026.11.13-interactive-1

Use this compiled overlay for your EXISTING working intellicare-pitr GitHub Pages site. It includes the new report features plus the current scrapbook styling. Your provider configuration and existing restyle samples are intentionally NOT included: keep docs/restyle.config.json and docs/restyle unchanged.

1. Extract the ZIP on your computer. Open your intellicare-pitr repository on GitHub, then its existing docs folder.
2. Choose Add file → Upload files. Open the extracted docs folder on your computer and upload its CONTENTS into the existing GitHub docs folder. Include index.html, assets, fonts, scrapbook, metadata and sw.js. Do not nest a new docs inside docs. Do not delete the old folder first.
3. Commit the upload and wait for GitHub Pages deployment to finish. Keep the same branch/folder settings.
4. Open your normal site URL. The release strip should show 2026.11.13-interactive-1.
5. Submit a drawing, then use Describe your drawing → Figure/composition (size and page grid), the region/time process editor, and the three new discovery activities. These activities need no AI call, provider account or payment.

For a GitHub Actions build from source, apply the separate SOURCE overlay to your existing source repository and run its existing pnpm frozen install/build workflow. Never deploy raw src/main.tsx. The public site does not change until you commit/deploy this update.

Region labels affect whole retained strokes and fill seedpoints. Time bounds are inclusive; combining region and time uses AND. Original drawing pixels and timestamps remain unchanged. The main individual-row editor is replaced by bulk selection; advanced individual edits remain optional.

Activity choices are local to this browser/session, with an actual feeling cloud, personally selected colour matches, support map and when/then plan. The completed keepsake can be downloaded as PNG or JSON. This custom reflection interface is not a diagnostic assessment or clinically validated treatment; sources are documented separately from the original nine PITR references.
