# Premium report update — 2026.11.13-report-2

The earlier exporter received only the original image. This update supplies both the original and the artistic result explicitly applied to the report. It includes both regardless of which artwork tab you are viewing. The styled image is presented for comparison only: all drawing-process and palette data still come from the original retained drawing records.

The PDF has been redesigned with an editorial/art-book layout, paired framed artworks, more deliberate typography, aligned data displays and restrained ink/paper accents. It retains confirmed scene details, actual activity choices, your selected action plan, the exact care disclaimer and the original nine references. Export is local: it does not call the image provider, spend provider credits, or send another image anywhere.

## Update your existing GitHub Pages app

Download and extract `rainandme-premium-report-update.zip`. In your existing `intellicare-pitr` repository, open `docs`, choose **Add file → Upload files**, and upload the **contents of the extracted docs folder** there. Commit and wait for the Pages deployment. Do not create `docs/docs`, upload raw React source as Pages HTML, or delete the existing folder. Your current `docs/restyle.config.json` and `docs/restyle/` images are intentionally excluded from this overlay and must remain in place.

Reload after deployment and confirm the visible release **2026.11.13-report-2**. After generating a style, choose **Use this artwork in report**, then download the PDF at the bottom of the report. You can leave the Original tab selected; both versions are included. If no styled result has been applied to the current report, the PDF says so instead of substituting an example. Applied artwork is currently held for that report in browser memory; it is not recoverable from an older original-only PDF.

If you develop from source, use `rainandme-premium-report-source.zip`. Preserve your existing `public/restyle.config.json` (or copy it from your current compiled docs) and follow the source instructions in the archive. No secret key belongs in client source.

The supplied sample is illustrative QA artwork with synthetic process/choice data, not the user's missing generated picture or a clinical report. A PDF cannot reconstruct a styled image that was never embedded in it. The update changes future downloads from the app; it does not alter a previously downloaded PDF.
