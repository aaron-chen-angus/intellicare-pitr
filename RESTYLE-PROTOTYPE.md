# Genuine artistic restyling · standalone prototype

Open the app's **Try Restyle lab** link, or append `#/restyle` to its normal root URL. This experiment does not replace the drawing studio, PITR report or original artwork. It adds Anime, Realistic, Watercolour and Graphic Novel choices with finished-art samples from the same supplied sketch.

## What works without a provider account

The four sample transformations were genuinely produced from the supplied screenshot using image-to-image AI editing. They are not CSS filters, local upscales or unrelated stock. The page lets you pick and compare these pre-generated examples, see the original, upload another drawing and explore style/creative-freedom instructions. Samples are labelled **pre-generated**; uploading another drawing never substitutes a sample as if it were your result.

The samples use AI editing available during this Manus task. They demonstrate the visual direction, not a promise that another provider or every input will produce exactly those pictures.

## New drawings: real image-to-image, with an explicit boundary

The prepared adapter uses `POST https://gen.pollinations.ai/v1/images/edits`, model `black-forest-labs/flux.2-klein-4b`. It includes the actual drawing as a base64 image and the selected style instructions. No public source-image hosting step is needed. It is genuine image-conditioned artistic redrawing, not the old Swin2SR preview. The provider's model has not been run with a user account in this prototype; protocol/UI checks use clearly labelled test doubles. [1] [2]

Pollinations currently requires a user-authorised account token and consumes provider credits. Its available earned **Quest** credits are not a guaranteed unlimited/daily free service. The app checks the server's `questPollenOnly: true` flag before uploading/generating; if the key could spend Paid Pollen, generation is blocked. No paid credit fallback or automatic model fallback is implemented. This still uses earned credits, so it does not meet a literal “no credits of any kind” requirement. [1] [3]

Cloud restyling sends the drawing to Pollinations/model infrastructure. The provider can store public generated media even with inline image responses; this is not a private/no-storage service. The checkbox must be accepted before each source's generation. Cancelling stops the local request but may not cancel a submitted provider job or recover its earned-credit cost. [4]

## Owner setup when you want to enable the live connection

1. In Pollinations' dashboard, create a **publishable App Key** for this app. Leave developer earnings/markup off. Register the exact site root as its redirect URI—for example, `https://aaron-chen-angus.github.io/intellicare-pitr/`, without a fragment or a made-up callback page. [5]
2. Set `appKey` in `public/restyle.config.json` (or `docs/restyle.config.json` for a prebuilt upload). Only the `pk_` app identifier goes there; never a secret `sk_` generation key.
3. Use **Connect Pollinations**. Browser OAuth uses random state, S256 PKCE and an exact-origin popup callback. It asks only for the editing model with a small budget and one-day expiry; no account-admin scope. The returned user token remains in memory and is never embedded in the repository, persistent storage or callback URL. [5]
4. Manage the authorised user key in the provider dashboard and enable **Quest-only** spending before generating. Earn enough Quest credits if needed. The live adapter checks that flag before every edit, rather than trusting a frontend checkbox.
5. Upload a drawing, choose a style, confirm the external processing/earned-credit checkbox and generate. The original remains separate and every style request starts from the original, not a previous generated result.

The supplied config deliberately has an empty App Key. The prototype therefore starts in sample-review mode rather than silently using someone else's credits or publishing a secret. Live authorisation and output quality need to be tested after this owner setup; no live-provider success is claimed here.

## Technical scope

`src/restyle/` contains style prompts, isolated React UI, PKCE authorisation and the image-edit adapter. The main PITR `App.tsx` is untouched. Creative freedom changes prompt guidance, not an invented diffusion-strength API parameter. Uploaded PNG/JPEG/WebP files are limited to 8 MB and re-encoded before transmission to remove metadata. Safe decoding, explicit consent, request cancellation, stale-result suppression and original preservation are part of the flow. The samples include AI-invented anatomical/environment details; generated imagery must never replace the original in PITR interpretation.

The prebuilt experiment can run under a GitHub Pages project subpath. Upload its compiled `docs` folder, not raw React/TypeScript. To keep it separate from the current live site, use a test repository first. See the ZIP's included instructions.

## References

[1]: https://gen.pollinations.ai/openapi.json "Official image-edit and Quest-only key schemas"
[2]: https://gen.pollinations.ai/image/models "Official live image model catalog"
[3]: https://enter.pollinations.ai/quests "Official Quest credit availability"
[4]: https://pollinations.ai/privacy "Official generation privacy policy"
[5]: https://github.com/pollinations/pollinations/blob/main/BRING_YOUR_OWN_POLLEN.md "Official browser PKCE authorisation guide"
