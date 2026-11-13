# Scrapbook design update — 2026.11.13-scrapbook-1

This changes presentation only. Your existing drawing, reflection and restyle behavior stays the same. This package intentionally does not contain restyle.config.json or unchanged restyle sample images: keep your existing public App Key file and restyle folder in GitHub. It is an overlay for your current working site, not a complete standalone site for an empty repository.

1. Extract this ZIP on your computer. Open your intellicare-pitr repository on GitHub.
2. Open its existing docs folder. Choose Add file → Upload files.
3. Open the extracted docs folder on your computer and drag its CONTENTS into GitHub's upload area. Replace index.html, sw.js, metadata and assets as prompted. Include the scrapbook and fonts folders. Do NOT delete the existing docs folder first, and do NOT replace or remove docs/restyle.config.json.
4. Commit the upload and wait for the GitHub Pages deployment to finish.
5. Open the original site address again. The page's release strip should say 2026.11.13-scrapbook-1 and the welcome should show the taped paper collage and berry-coloured serif headline.

Keep your existing GitHub Pages branch/folder settings; this is the same compiled docs deployment as before. If you use a GitHub Actions SOURCE build instead of deploying docs, apply the source patch from the separate source ZIP and run the existing build workflow. Do not upload src or raw TypeScript into the deployed docs folder.

This update does not activate or change provider billing/accounts, alter keys, require a new paid service, or generate/upload a user's drawing. Existing earned-credits-only rules remain enforced. Your live site will not change until you commit/deploy this update.
