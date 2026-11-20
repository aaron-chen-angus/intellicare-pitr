# Free-only connection correction

The current `intellicare-pitr` app connection was corrected in the user's provider dashboard on 2026-11-05. The exact authorised key now has **Quest pollen only**, its original model restriction and budget. No purchase, budget increase, drawing upload or provider image generation was performed for this correction. The site's existing pre-upload guard remains enabled.

**For the tab already connected:** retry **Restyle my drawing** without refreshing or reconnecting. The key restriction was changed at the provider and the app reads it before each request. The original drawing stays intact. Actual generation still consumes earned Quest credits; paid balance must not be used.

## Preventing the confusing connection state

The source fix shows the exact instruction before Connect: tick **Quest pollen only** in the Pollinations consent popup before **Allow access**. After the token exchange, the app reads `/account/key` and only accepts a valid Quest-only key. A second check remains before every drawing upload. Exhausted earned credits/budget produce a separate message and no paid fallback.

The provider does not support an app-controlled OAuth parameter that forces this checkbox. Its source defaults the checkbox to false and requires the user's consent choice. The app cannot safely set it with the granted token: key updates require broader account-admin scope and cannot update the calling key itself. No such permissions are requested and no automatic enforcement is fabricated. [1] [2]

The optional small update ZIP overlays compiled JavaScript/CSS, the page shell and release metadata on the existing `docs` folder. It does not replace `restyle.config.json`, sample artwork, original sessions, or source drawings. No new ZIP upload is necessary for the already corrected active connection.

## Focused verification

TypeScript and the production build pass. A browser test under `/intellicare-pitr/` verifies: unsafe grants are rejected before showing Connected; unsafe later key changes and exhausted earned budgets are rejected before drawing upload; no account-admin scopes or unsupported flags are requested; tokens are absent from URLs/storage; and a safe mocked edit response is decoded successfully. Provider replies in this test are doubles, not live image-generation proof.

## References

[1]: https://github.com/pollinations/pollinations/blob/7d0ebc425fd1f2c5f1a2595f35d38ab9b8cd04fb/enter.pollinations.ai/frontend/src/routes/authorize.tsx "Official OAuth route and accepted parameters"
[2]: https://github.com/pollinations/pollinations/blob/7d0ebc425fd1f2c5f1a2595f35d38ab9b8cd04fb/enter.pollinations.ai/frontend/src/components/keys/key-permissions.tsx "Official Quest-only consent checkbox and its default"
