# Scrapbook visual release QA

Release: `2026.11.13-scrapbook-1`.

All 16 recorded behavior/configuration hashes match the pre-design baseline. The App's functions before the welcome return and its entire drawing-studio/report JSX remain identical; the welcome changes only its decorative import, presentation class, illustration and footer. Provider OAuth, model prompts, paid-capable-key rejection, pre-upload free-only guard, upload consent, drawing engine, timer, storage keys, analysis, scene/replay logic and exports are unchanged. A read-only audit independently confirmed these boundaries.

Production browser checks at `/intellicare-pitr/` passed consent/start, actual Pointer Events drawing, local persistence, Undo/Redo, restoration without stale-bitmap resurrection, original 1240×1754 canvas resolution and A4 display ratio, early submission, all PITR/palette/process sections, timestamped lanes, label editing/replay and the four artistic styles with the actual report drawing preloaded. No live generation was invoked.

Rendered text contrast: intake minimum 5.81:1 in light mode and 8.12:1 in dark mode; tested pale report cards minimum 5.50:1 in both modes; style-studio text minimum 5.49:1 in both modes. No horizontal overflow at 360/768/1440px. The mobile Submit label remains accessible via visually hidden CSS; controls remain 44px. Native dialog/data-view rules and canvas inline zoom/pan transforms remain untouched. No uncaught React/browser errors, remote Google Font request or provider generation request was observed.

The compiled overlay is byte-verified, uses local image/font files, excludes the existing public provider configuration and unchanged restyle sample folder, and is tested after merging with the existing site assets. It is not an empty-repository standalone site. This release has not changed the user's public GitHub Pages site until the user uploads/commits the overlay. Source/provider behavior remains as previously configured, including earned-Quest-credit availability requirements.
