"""Versioned compiled report overlay and complete source; never replace provider configuration."""
from pathlib import Path
import json, shutil, zipfile, subprocess
ROOT=Path(__file__).resolve().parents[1];OUT=Path('/home/ubuntu/rainandme-premium-report-update');DOCS=OUT/'docs';RELEASE='2026.11.13-report-2'
assert json.loads((ROOT/'dist/build-info.json').read_text())['release']==RELEASE
if OUT.exists():shutil.rmtree(OUT)
DOCS.mkdir(parents=True)
for p in (ROOT/'dist').rglob('*'):
 if not p.is_file() or p.name=='restyle.config.json':continue
 rel=p.relative_to(ROOT/'dist')
 if rel.parts[0]=='restyle':continue
 dest=DOCS/rel;dest.parent.mkdir(parents=True,exist_ok=True);shutil.copy2(p,dest)
assert not (DOCS/'restyle.config.json').exists()
assert 'src/main.tsx' not in (DOCS/'index.html').read_text()
js=''.join(p.read_text() for p in (DOCS/'assets').glob('*.js'))
for text in [RELEASE,'What can this process tell you?','Download reflection report PDF','Your personal reflection report','Original drawing','No styled artwork applied']:assert text in js,text
assert 'A MOMENT TO MAKE' not in js and 'let your hand tell the story.' not in js
for p in DOCS.rglob('*'):
 if p.is_file():assert p.stat().st_size<25_000_000,p
for rel in ['PREMIUM-REPORT-UPDATE.md','REPORT-EVIDENCE.md','PREMIUM-REPORT-QA.md']:shutil.copy2(ROOT/rel,OUT/rel)
(OUT/'UPLOAD-INSTRUCTIONS.txt').write_text('Extract this ZIP. Open your existing GitHub intellicare-pitr repository docs folder. Add file → Upload files; upload the CONTENTS of extracted docs into existing docs. Commit and wait for Pages deployment. Do not delete existing docs or nest docs/docs. Keep current restyle.config.json and restyle images: intentionally not included. Verify2026.11.13-report-2release. After applying a style with Use this artwork in report, click Download reflection report PDF at the report end. Both original and applied style are included regardless of the display tab. The sample PDF delivered separately uses a QA test drawing, not realclinicaldata.\n')
archive=Path('/home/ubuntu/rainandme-premium-report-update.zip')
with zipfile.ZipFile(archive,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(OUT.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(OUT).as_posix())
with zipfile.ZipFile(archive) as z:
 for p in DOCS.rglob('*'):
  if p.is_file():assert z.read('docs/'+p.relative_to(DOCS).as_posix())==p.read_bytes()
 assert 'docs/restyle.config.json' not in z.namelist()
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard'],cwd=ROOT).decode().splitlines()
files=[p for p in sorted(set(files)) if (ROOT/p).is_file() and not p.startswith(('.env','.private/','dist/','test-evidence/','node_modules/')) and Path(p).name!='restyle.config.json']
source=Path('/home/ubuntu/rainandme-premium-report-source.zip')
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
 for rel in files:z.write(ROOT/rel,rel)
 z.writestr('SOURCE-UPDATE-INSTRUCTIONS.md','Complete application source, not compiled Pages files. Preserve your existing public/restyle.config.json or copy your existing compiled docs/restyle.config.json into public before building. Never embed secret keys. Run pnpm install --frozen-lockfile and pnpm run build or existing GitHub Actions workflow. For the working docs site use the separately delivered compiled overlay instead.\n')
with zipfile.ZipFile(source) as z:
 for rel in files:assert z.read(rel)==(ROOT/rel).read_bytes()
for p in [archive,source]:print(f'{p}: {p.stat().st_size:,} bytes; contents verified')
