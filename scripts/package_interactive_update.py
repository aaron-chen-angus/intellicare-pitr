"""Package a compiled report-feature overlay; never overwrite provider settings."""
from pathlib import Path
import json, shutil, zipfile, subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/home/ubuntu/rainandme-interactive-update');DOCS=OUT/'docs';RELEASE='2026.11.13-interactive-1'
assert json.loads((ROOT/'dist/build-info.json').read_text())['release']==RELEASE
if OUT.exists():shutil.rmtree(OUT)
DOCS.mkdir(parents=True)
for source in (ROOT/'dist').rglob('*'):
 if not source.is_file() or source.name=='restyle.config.json':continue
 rel=source.relative_to(ROOT/'dist')
 if rel.parts[0]=='restyle':continue
 target=DOCS/rel;target.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(source,target)
assert not (DOCS/'restyle.config.json').exists()
assert 'src/main.tsx' not in (DOCS/'index.html').read_text()
bundles=''.join(p.read_text() for p in (DOCS/'assets').glob('*.js'))
for required in [RELEASE,'Label a part of your drawing','Download keepsake PNG','Selection start time','Figure / composition']:assert required in bundles,required
for p in DOCS.rglob('*'):
 if p.is_file():assert p.stat().st_size<25_000_000,p
instructions=f'''# Interactive report update — {RELEASE}

Use this compiled overlay for your EXISTING working intellicare-pitr GitHub Pages site. It includes the new report features plus the current scrapbook styling. Your provider configuration and existing restyle samples are intentionally NOT included: keep docs/restyle.config.json and docs/restyle unchanged.

1. Extract the ZIP on your computer. Open your intellicare-pitr repository on GitHub, then its existing docs folder.
2. Choose Add file → Upload files. Open the extracted docs folder on your computer and upload its CONTENTS into the existing GitHub docs folder. Include index.html, assets, fonts, scrapbook, metadata and sw.js. Do not nest a new docs inside docs. Do not delete the old folder first.
3. Commit the upload and wait for GitHub Pages deployment to finish. Keep the same branch/folder settings.
4. Open your normal site URL. The release strip should show {RELEASE}.
5. Submit a drawing, then use Describe your drawing → Figure/composition (size and page grid), the region/time process editor, and the three new discovery activities. These activities need no AI call, provider account or payment.

For a GitHub Actions build from source, apply the separate SOURCE overlay to your existing source repository and run its existing pnpm frozen install/build workflow. Never deploy raw src/main.tsx. The public site does not change until you commit/deploy this update.

Region labels affect whole retained strokes and fill seedpoints. Time bounds are inclusive; combining region and time uses AND. Original drawing pixels and timestamps remain unchanged. The main individual-row editor is replaced by bulk selection; advanced individual edits remain optional.

Activity choices are local to this browser/session, with an actual feeling cloud, personally selected colour matches, support map and when/then plan. The completed keepsake can be downloaded as PNG or JSON. This custom reflection interface is not a diagnostic assessment or clinically validated treatment; sources are documented separately from the original nine PITR references.
'''
(OUT/'UPDATE-INSTRUCTIONS.md').write_text(instructions)
for rel in ['INTERACTIVE-REPORT-UPDATE.md','INTERACTIVE-ACTIVITIES-RESEARCH.md','INTERACTIVE-REPORT-QA.md']:
 shutil.copy2(ROOT/rel,OUT/rel)
archive=Path('/home/ubuntu/rainandme-interactive-update.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(OUT.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:
 assert 'docs/restyle.config.json' not in z.namelist()
 for p in DOCS.rglob('*'):
  if p.is_file():assert z.read('docs/'+p.relative_to(DOCS).as_posix())==p.read_bytes()
source_paths=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=ROOT).decode().splitlines()
source_paths=[rel for rel in sorted(set(source_paths)) if (ROOT/rel).is_file() and not rel.startswith(('.env','.private/','test-evidence/','node_modules/','dist/')) and (ROOT/rel).name!='restyle.config.json']
source_archive=Path('/home/ubuntu/rainandme-interactive-source.zip')
with zipfile.ZipFile(source_archive,'w',zipfile.ZIP_DEFLATED) as z:
 for rel in source_paths:z.write(ROOT/rel,rel)
 z.writestr('SOURCE-UPDATE-INSTRUCTIONS.md','This is complete application source, not the compiled Pages upload. It excludes provider configuration and private credentials. Keep your existing public/restyle.config.json; if your public App Key was configured only in the working compiled site, copy docs/restyle.config.json into public/restyle.config.json when rebuilding. Never copy a secret sk_ key. Run pnpm install --frozen-lockfile and pnpm run build using the included existing Pages workflow. To update the working docs deployment directly, use the separate compiled update ZIP instead.\n')
with zipfile.ZipFile(source_archive) as z:
 for rel in source_paths:assert z.read(rel)==(ROOT/rel).read_bytes()
 assert all(rel in z.namelist() for rel in ['package.json','pnpm-lock.yaml','src/main.tsx','src/App.tsx','src/canvas.ts','src/report/DiscoveryActivities.tsx','src/report/BulkLabelEditor.tsx'])
print(f'Compiled update: {archive} ({archive.stat().st_size:,} bytes)')
print(f'Complete source: {source_archive} ({source_archive.stat().st_size:,} bytes)')
print('All bytes verified. Both omit provider configuration; compiled overlay omits unchanged restyle samples, complete source includes its assets.')
