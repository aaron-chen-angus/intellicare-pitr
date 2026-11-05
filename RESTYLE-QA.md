# Restyle prototype QA

Release `2026.11.05-restyle-prototype-1`.

The generated Anime, Realistic, Watercolour and Graphic Novel sample files exist, were visually reviewed, and are genuine edits of the same supplied sketch. Their public display variants preserve all content. They are not live Pollinations outputs.

TypeScript and Vite production build pass. A real Chromium run serves the compiled build under `/intellicare-pitr/` and checks all four loaded samples; uploaded sources never receive sample substitutions. Full 1240×1754 source dimensions are preserved in the UI. Mock provider success verifies the actual base64 image + style prompt payload, response decoding, downloaded result and Original/Styled separation. The no-paid-credit guard returns zero image POSTs for a valid but non-Quest-only key. Cancellation and source changes suppress stale results.

The actual browser PKCE/popup/callback code is exercised with intercepted provider responses. Verifier/challenge, restricted model, exact-root redirect and memory-only token storage pass. Browser navigation severed `window.opener`; the random-state same-origin BroadcastChannel fallback was added and validated. No live account or token was used. A provider's authenticated response/output quality remains untested until owner App Key and user Quest-only key setup.

Real default configuration—not the mocked connected state—visibly shows sample-review/setup-pending mode and disables provider login/generation. The workspace jump stays within `#/restyle`. No horizontal overflow at 360, 768 or 1440 pixels, no browser errors, and the original root PITR consent gate is unchanged. Measured minimum contrast for new semantic text is 6.83:1 in both light and dark root themes. Comparison/download/connection buttons use 44px touch targets.

The runtime provider is not a no-account/no-credit service. It consumes earned Quest credits only when the server attests that the authorised key cannot use paid balance. Public app configuration is intentionally empty; no secret is bundled. Generated imagery is never fed to the PITR analysis engine.
