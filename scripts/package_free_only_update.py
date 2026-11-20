"""Package only the compiled connection update; preserve the deployed provider config and art."""
from pathlib import Path
import json,zipfile,subprocess
ROOT=Path(__file__).resolve().parents[1]
DIST=ROOT/'dist'
release=json.loads((DIST/'build-info.json').read_text())['release']
output=Path('/home/ubuntu')/f'intellicare-pitr-{release}-small-update.zip'
files=[p for p in (DIST/'assets').rglob('*') if p.is_file() and p.suffix in ['.js','.css','.mjs']]
files += [DIST/name for name in ['index.html','build-info.json','sw.js','manus-routes.json']]
notes='''# Optional preventive connection update\n\nYour currently connected app key has already been corrected at the provider. Retry in the existing app tab without refreshing or reconnecting; you do not need this ZIP for that change.\n\nTo install the preventive frontend improvement later:\n1. Extract this ZIP. Upload its docs folder into the repository root, merging with the existing docs folder and replacing matching files. Do not delete existing assets or artwork.\n2. Commit to main and wait for GitHub Pages deployment. This package deliberately does not contain restyle.config.json, so your public App Key stays unchanged.\n3. Verify release '''+release+''' in the app. For future connections tick Quest pollen only in the provider popup before Allow access. The app now checks the grant before showing Connected.\n\nPaid balance remains blocked. Earned Quest credits are still required and may run out; this is not unlimited or anonymous free generation.\n'''
with zipfile.ZipFile(output,'w',zipfile.ZIP_DEFLATED) as z:
 for p in files:z.write(p,'docs/'+str(p.relative_to(DIST)))
 z.writestr('READ-ME-FIRST.md',notes)
 z.write(ROOT/'FREE-ONLY-FIX.md','FREE-ONLY-FIX.md')
 patch=subprocess.check_output(['git','diff','--','src/restyle/auth.tsx','src/restyle/client.ts','src/restyle/StyleLab.tsx'],cwd=ROOT)
 if patch:z.writestr('OPTIONAL-SOURCE-FIX.patch',patch)
with zipfile.ZipFile(output) as z:
 assert z.testzip() is None
 assert 'docs/restyle.config.json' not in z.namelist()
 assert all(not name.startswith('docs/restyle/') for name in z.namelist())
 for p in files:assert z.read('docs/'+str(p.relative_to(DIST)))==p.read_bytes()
 assert json.loads(z.read('docs/build-info.json'))['release']==release
print(json.dumps({'file':str(output),'bytes':output.stat().st_size,'compiledFiles':len(files),'publicKeyAndArtworkPreserved':True},indent=2))
