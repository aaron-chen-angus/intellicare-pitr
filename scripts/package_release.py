"""Package verified source and prebuilt static files; never reuse a stale archive."""
from pathlib import Path
import hashlib
import json
import shutil
import subprocess
import zipfile

ROOT = Path(__file__).resolve().parents[1]
RELEASE = json.loads((ROOT/'public/build-info.json').read_text())['release']
SOURCE = Path('/home/ubuntu') / f'intellicare-pitr-source-{RELEASE}.zip'
READY_ROOT = Path('/home/ubuntu/intellicare-pitr-ready')
READY = Path('/home/ubuntu') / f'intellicare-pitr-ready-{RELEASE}.zip'
files = subprocess.check_output(['git','ls-files','--cached','--others','--exclude-standard','-z'], cwd=ROOT).decode().split('\0')
files = sorted(set(path for path in files if path and (ROOT/path).is_file() and not path.startswith(('dist/','node_modules/','test-evidence/','.git/')) and not Path(path).name.startswith('.env')))
commit = subprocess.check_output(['git','rev-parse','HEAD'],cwd=ROOT).decode().strip()
with zipfile.ZipFile(SOURCE,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in files: archive.write(ROOT/path,path)
    archive.writestr('SOURCE-COMMIT.txt',commit+'\n'+RELEASE+'\n')
    archive.writestr('FILES-SHA256.txt',''.join(hashlib.sha256((ROOT/path).read_bytes()).hexdigest()+'  '+path+'\n' for path in files))
with zipfile.ZipFile(SOURCE) as archive:
    for path in files: assert archive.read(path)==(ROOT/path).read_bytes(),path
    assert 'set this to true or false' not in archive.read('pnpm-workspace.yaml').decode()
    assert '.github/workflows/deploy-pages.yml' in archive.namelist()
    assert 'Self-discovery activities' in archive.read('src/App.tsx').decode()
    assert 'Free Gen AI' not in archive.read('src/App.tsx').decode()
    assert 'Response.error()' in archive.read('public/sw.js').decode()
    for required in ['src/restyle/ReportRestyle.tsx','src/restyle/StyleLab.tsx','src/restyle/client.ts','src/report/ReflectionCards.tsx','src/report/ProcessStory.tsx','src/report/PaletteStory.tsx']:
        assert required in archive.namelist(),required
shutil.copyfile(SOURCE,Path('/home/ubuntu/rainandme-source.zip'))
with zipfile.ZipFile(READY,'w',zipfile.ZIP_DEFLATED) as archive:
    for path in sorted(READY_ROOT.rglob('*')):
        if path.is_file():
            assert path.stat().st_size < 25*1024*1024,path
            archive.write(path,path.relative_to(READY_ROOT))
with zipfile.ZipFile(READY) as archive:
    html=archive.read('docs/index.html').decode()
    assert 'src/main.tsx' not in html
    assert 'assets/' in html
    assert json.loads(archive.read('docs/build-info.json'))['release']==RELEASE
    compiled=''.join(archive.read(p).decode(errors='replace') for p in archive.namelist() if p.endswith('.js'))
    assert any('docs/assets/StyleLab-' in p and p.endswith('.js') for p in archive.namelist())
    for label in ['Person · weather · shelter · scene','Self-discovery activities','Restyle your drawing','Your process, mark by mark','Your palette, your meaning']:
        assert label in compiled,label
    for obsolete in ['AI preview quality','Enhance the drawing with AI','memory-safe local preview']:
        assert obsolete not in compiled,obsolete
    for path in sorted((READY_ROOT/'docs').rglob('*')):
        if path.is_file(): assert archive.read('docs/'+str(path.relative_to(READY_ROOT/'docs')))==path.read_bytes()
shutil.copyfile(READY,Path('/home/ubuntu/intellicare-pitr-ready-to-publish.zip'))
print(json.dumps({'source':str(SOURCE),'sourceCommit':commit,'sourceBytes':SOURCE.stat().st_size,'ready':str(READY),'readyBytes':READY.stat().st_size,'verifiedFiles':len(files),'release':RELEASE},indent=2))
