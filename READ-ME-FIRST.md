# Separate artistic-restyle experiment

This is a compiled prototype, not a claim that live provider generation is configured. The four genuine style samples and selector work immediately. New drawings require a registered Pollinations App Key plus a user-authorised Quest-only key with earned credits. The app cannot spend paid balance.

## Try separately on GitHub Pages

1. Create a new public TEST repository, rather than replacing intellicare-pitr.
2. Extract this ZIP. Upload the complete `docs` folder to the repository root. Keep its `assets` and `restyle` folders inside it. Do not upload only index.html or raw React files.
3. GitHub repository Settings → Pages → Deploy from a branch → main → /docs → Save.
4. Wait for the Pages deployment to finish, open the repository's Pages URL, then choose **Try Restyle lab** at the top. Or append `#/restyle` to that root URL.
5. Confirm release `2026.11.05-restyle-prototype-1` on the lab.

The existing PITR flow is preserved in this build; its report and old super-resolution feature were not replaced by the experiment.

See RESTYLE-PROTOTYPE.md for the exact owner/provider setup. Only a public `pk_` app identifier belongs in `docs/restyle.config.json`; never paste a secret `sk_` generation key there. No unlimited free/no-account image provider is promised.
