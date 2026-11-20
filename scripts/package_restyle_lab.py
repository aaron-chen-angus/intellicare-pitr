"""Package the isolated restyle experiment without changing older delivered archives."""
from pathlib import Path
import json,shutil,subprocess,zipfile
ROOT=Path(__file__).resolve().parents[1]
OUT=Path('/home/ubuntu')
READY=OUT/'rainandme-restyle-ready'
DOCS=READY/'docs'
if DOCS.exists():shutil.rmtree(DOCS)
shutil.copytree(ROOT/'dist',DOCS)
# The unchanged old local-enhancement worker uses the previously verified CDN
# WASM runtime. The emitted unused 26MB artifact exceeds GitHub's browser limit.
for path in DOCS.rglob('*.wasm'):path.unlink()
READY.mkdir(exist_ok=True)
(READY/'READ-ME-FIRST.md').write_text('''# Separate artistic-restyle experiment\n\nThis is a compiled prototype, not a claim that live provider generation is configured. The four genuine style samples and selector work immediately. New drawings require a registered Pollinations App Key plus a user-authorised Quest-only key with earned credits. The app cannot spend paid balance.\n\n## Try separately on GitHub Pages\n\n1. Create a new public TEST repository, rather than replacing intellicare-pitr.\n2. Extract this ZIP. Upload the complete `docs` folder to the repository root. Keep its `assets` and `restyle` folders inside it. Do not upload only index.html or raw React files.\n3. GitHub repository Settings → Pages → Deploy from a branch → main → /docs → Save.\n4. Wait for the Pages deployment to finish, open the repository's Pages URL, then choose **Try Restyle lab** at the top. Or append `#/restyle` to that root URL.\n5. Confirm release `2026.11.05-restyle-prototype-1` on the lab.\n\nThe existing PITR flow is preserved in this build; its report and old super-resolution feature were not replaced by the experiment.\n\nSee RESTYLE-PROTOTYPE.md for the exact owner/provider setup. Only a public `pk_` app identifier belongs in `docs/restyle.config.json`; never paste a secret `sk_` generation key there. No unlimited free/no-account image provider is promised.\n''')
shutil.copy2(ROOT/'RESTYLE-PROTOTYPE.md',READY/'RESTYLE-PROTOTYPE.md')
shutil.copy2(ROOT/'RESTYLE-QA.md',READY/'RESTYLE-QA.md')
source=OUT/'rainandme-restyle-source.zip'
compiled=OUT/'rainandme-restyle-ready.zip'
files=subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'],cwd=ROOT).decode().split('\0')
with zipfile.ZipFile(source,'w',zipfile.ZIP_DEFLATED) as z:
 for name in sorted(set(files)):
  p=ROOT/name
  if not name or not p.is_file() or p.name.startswith('.env') and p.name!='.env.example':continue
  z.write(p,name)
with zipfile.ZipFile(compiled,'w',zipfile.ZIP_DEFLATED) as z:
 for p in sorted(READY.rglob('*')):
  if p.is_file():z.write(p,p.relative_to(READY))
with zipfile.ZipFile(source) as z:
 for name in ['src/main.tsx','src/restyle/StyleLab.tsx','src/restyle/auth.tsx','src/restyle/client.ts','src/restyle/styles.ts','public/restyle.config.json','RESTYLE-PROTOTYPE.md']:
  assert z.read(name)==(ROOT/name).read_bytes(),name
 for style in ['anime','realistic','watercolour','graphic-novel']:
  assert z.read(f'public/restyle/{style}.png')==(ROOT/f'public/restyle/{style}.png').read_bytes()
with zipfile.ZipFile(compiled) as z:
 assert b'src/main.tsx' not in z.read('docs/index.html')
 assert json.loads(z.read('docs/restyle-build-info.json'))['release']=='2026.11.05-restyle-prototype-1'
 assert any(n.startswith('docs/assets/StyleLab-') and n.endswith('.js') for n in z.namelist())
 assert json.loads(z.read('docs/restyle.config.json'))['appKey']==''
 assert all(i.file_size<25_000_000 for i in z.infolist()),'GitHub browser file limit'
 for p in DOCS.rglob('*'):
  if p.is_file():assert z.read('docs/'+p.relative_to(DOCS).as_posix())==p.read_bytes()
print(json.dumps({'source':str(source),'compiled':str(compiled),'sourceBytes':source.stat().st_size,'compiledBytes':compiled.stat().st_size,'verified':'fresh source/modules and exact compiled assets; owner key intentionally blank'},indent=2))
