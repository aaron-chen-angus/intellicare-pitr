"""Prepare self-hosted SIL-OFL fonts and preserve old rules in a legacy cascade layer."""
from pathlib import Path
import re,requests
ROOT=Path(__file__).resolve().parents[1]
FONT_DIR=ROOT/'src/assets/fonts';FONT_DIR.mkdir(parents=True,exist_ok=True)
LICENSE_DIR=ROOT/'public/fonts';LICENSE_DIR.mkdir(parents=True,exist_ok=True)
url='https://fonts.googleapis.com/css2?family=DM+Serif+Display:ital@0;1&family=DM+Sans:wght@400..800&family=Caveat:wght@400..700&display=swap'
r=requests.get(url,headers={'User-Agent':'Mozilla/5.0 AppleWebKit/537.36 Chrome/120.0.0.0 Safari/537.36'},timeout=30);r.raise_for_status()
faces=[]
for block in re.findall(r'/\* latin \*/\s*(@font-face\s*\{[^}]+\})',r.text):
 family=re.search(r"font-family:\s*'([^']+)'",block).group(1)
 style=re.search(r'font-style:\s*([^;]+);',block).group(1)
 remote=re.search(r'url\(([^)]+)\)',block).group(1)
 name=family.lower().replace(' ','-')+'-'+style+'.woff2'
 data=requests.get(remote,timeout=30);data.raise_for_status();assert data.content[:4]==b'wOF2'
 (FONT_DIR/name).write_bytes(data.content)
 faces.append(block.replace(remote,'./assets/fonts/'+name))
assert len(faces)==4,(len(faces),r.text)
(ROOT/'src/scrapbook-fonts.css').write_text('/* Self-hosted SIL Open Font License fonts; licenses in public/fonts. */\n'+'\n\n'.join(faces)+'\n')
for family in ['dmserifdisplay','dmsans','caveat']:
 license=requests.get(f'https://raw.githubusercontent.com/google/fonts/main/ofl/{family}/OFL.txt',timeout=30);license.raise_for_status()
 assert 'SIL OPEN FONT LICENSE' in license.text
 (LICENSE_DIR/(family+'-OFL.txt')).write_text(license.text)
for name in ['styles.css','report/reflection.css','report/process.css','restyle/restyle.css','restyle/report-restyle.css']:
 path=ROOT/'src'/name;text=path.read_text()
 if text.startswith('/* Preserved functional rules'):continue
 if name=='styles.css':text=re.sub(r'^@import[^\n]+\n','',text,count=1)
 path.write_text('/* Preserved functional rules. New scrapbook styling has higher cascade priority. */\n@layer legacy {\n'+text.rstrip()+'\n}\n')
print('Prepared four local font faces, three licenses and five preserved legacy stylesheets.')
