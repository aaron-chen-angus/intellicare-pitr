"""Package the built design-only update while preserving existing Pages provider config."""
from pathlib import Path
import json,hashlib,shutil,zipfile,subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/home/ubuntu/rainandme-scrapbook-update');DOCS=OUT/'docs';RELEASE='2026.11.13-scrapbook-1'
assert json.loads((ROOT/'dist/build-info.json').read_text())['release']==RELEASE
if OUT.exists():shutil.rmtree(OUT)
DOCS.mkdir(parents=True)
for source in (ROOT/'dist').rglob('*'):
 if not source.is_file() or source.name=='restyle.config.json':continue
 if source.relative_to(ROOT/'dist').parts[0]=='restyle':continue
 target=DOCS/source.relative_to(ROOT/'dist');target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
assert not (DOCS/'restyle.config.json').exists()
assert 'src/main.tsx' not in (DOCS/'index.html').read_text()
assert (DOCS/'scrapbook/rain-collage.webp').stat().st_size>100_000
assert len(list((DOCS/'assets').glob('*.woff2')))==4
required=['Restyle your drawing','Every storm has',RELEASE]
bundles=''.join(p.read_text() for p in (DOCS/'assets').glob('*.js'))
for text in required:assert text in bundles,text
for p in DOCS.rglob('*'):
 if p.is_file():assert p.stat().st_size<25_000_000,p
instructions=f'''# Scrapbook design update — {RELEASE}

This changes presentation only. Your existing drawing, reflection and restyle behavior stays the same. This package intentionally does not contain restyle.config.json or unchanged restyle sample images: keep your existing public App Key file and restyle folder in GitHub. It is an overlay for your current working site, not a complete standalone site for an empty repository.

1. Extract this ZIP on your computer. Open your intellicare-pitr repository on GitHub.
2. Open its existing docs folder. Choose Add file → Upload files.
3. Open the extracted docs folder on your computer and drag its CONTENTS into GitHub's upload area. Replace index.html, sw.js, metadata and assets as prompted. Include the scrapbook and fonts folders. Do NOT delete the existing docs folder first, and do NOT replace or remove docs/restyle.config.json.
4. Commit the upload and wait for the GitHub Pages deployment to finish.
5. Open the original site address again. The page's release strip should say {RELEASE} and the welcome should show the taped paper collage and berry-coloured serif headline.

Keep your existing GitHub Pages branch/folder settings; this is the same compiled docs deployment as before. If you use a GitHub Actions SOURCE build instead of deploying docs, apply the source patch from the separate source ZIP and run the existing build workflow. Do not upload src or raw TypeScript into the deployed docs folder.

This update does not activate or change provider billing/accounts, alter keys, require a new paid service, or generate/upload a user's drawing. Existing earned-credits-only rules remain enforced. Your live site will not change until you commit/deploy this update.
'''
(OUT/'UPDATE-INSTRUCTIONS.md').write_text(instructions)
shutil.copy2(ROOT/'SCRAPBOOK-DESIGN.md',OUT/'SCRAPBOOK-DESIGN.md')
archive=Path('/home/ubuntu/rainandme-scrapbook-update.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(OUT.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:
 assert 'docs/restyle.config.json' not in z.namelist()
 for p in DOCS.rglob('*'):
  if p.is_file():assert z.read('docs/'+p.relative_to(DOCS).as_posix())==p.read_bytes()
# Source overlay: includes changed presentation files and assets, but not private/account config.
source_paths=subprocess.check_output(['git','diff','--name-only','HEAD'],cwd=ROOT).decode().splitlines()
source_paths+=subprocess.check_output(['git','ls-files','--others','--exclude-standard'],cwd=ROOT).decode().splitlines()
source_paths+=['src/App.tsx','src/main.tsx','src/version.ts','src/styles.css','src/report/reflection.css','src/report/process.css','src/restyle/restyle.css','src/restyle/report-restyle.css','index.html','public/sw.js','public/build-info.json','public/restyle-build-info.json','src/ScrapbookArt.tsx','src/scrapbook.css','src/scrapbook-report.css','src/scrapbook-fonts.css','SCRAPBOOK-DESIGN.md','scripts/prepare_scrapbook_theme.py','scripts/package_scrapbook_update.py','tests/scrapbook_smoke.py']
source_paths += [p.relative_to(ROOT).as_posix() for folder in ['src/assets/fonts','public/fonts','public/scrapbook'] for p in (ROOT/folder).rglob('*') if p.is_file()]
source_archive=Path('/home/ubuntu/rainandme-scrapbook-source-update.zip')
with zipfile.ZipFile(source_archive,'w',zipfile.ZIP_DEFLATED) as z:
 for rel in sorted(set(source_paths)):
  p=ROOT/rel
  if not p.is_file() or rel.startswith(('test-evidence/','.env','.private/')) or p.name=='restyle.config.json':continue
  z.write(p,rel)
 z.writestr('SOURCE-UPDATE-INSTRUCTIONS.md','Overlay these presentation-only source files onto your existing source repository, keeping all existing other files and your public/restyle.config.json. Run pnpm install --frozen-lockfile and pnpm run build using your existing GitHub Pages workflow. This is a source overlay, not a complete standalone source project or compiled-site replacement.\n')
print(f'Compiled update: {archive} ({archive.stat().st_size:,} bytes)')
print(f'Source overlay: {source_archive} ({source_archive.stat().st_size:,} bytes)')
print('All compiled bytes verified; provider configuration is excluded from both updates.')
