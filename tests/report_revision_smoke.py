"""Production app checks at the Pages subpath, with artist-labelled full-size strokes."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from time import time
import json, os
from playwright.sync_api import sync_playwright
from report_fixture import recorded_fixture
ROOT=Path(__file__).resolve().parents[1]
SITE=Path(os.environ.get('RAIN_TEST_DIST', ROOT/'dist'))
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self,path):
        path=path.split('?')[0]
        if path.startswith('/intellicare-pitr/'): path=path[len('/intellicare-pitr/'):]
        return str(SITE/path.lstrip('/'))
    def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/intellicare-pitr/'
output=ROOT/'test-evidence';output.mkdir(exist_ok=True)
results=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=p.chromium.executable_path,headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1440,'height':1000});page=context.new_page();errors=[]
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='networkidle')
  undo_page=context.new_page();undo_page.goto(url,wait_until='networkidle')
  single=recorded_fixture(int(time()*1000));single['strokes']=single['strokes'][:1]
  undo_page.evaluate('''f=>{
   const c=document.createElement('canvas');c.width=1240;c.height=1754;const ctx=c.getContext('2d');ctx.fillStyle='#15243a';ctx.fillRect(0,0,c.width,c.height);
   f.drawingDataUrl=c.toDataURL();localStorage.setItem('rain-and-me-session-v1',JSON.stringify(f));
  }''',single)
  undo_page.reload(wait_until='networkidle');undo_page.get_by_role('button',name='Resume saved drawing').click()
  undo_page.get_by_role('button',name='Undo',exact=True).click();undo_page.wait_for_timeout(400)
  pixel=undo_page.locator('canvas').evaluate('(c)=>Array.from(c.getContext("2d").getImageData(600,470,1,1).data)')
  assert all(v>220 for v in pixel[:3]),pixel
  assert undo_page.evaluate('JSON.parse(localStorage.getItem("rain-and-me-session-v1")).strokes.length')==0
  undo_page.close();results.append('Undo after restoration clears the final stroke without resurrecting an old bitmap.')
  page.evaluate('(fixture)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(fixture))',recorded_fixture(int(time()*1000)))
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click()
  assert page.locator('canvas').evaluate('(c)=>[c.width,c.height]')==[1240,1754]
  page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
  page.get_by_role('heading',name='Person · weather · shelter · scene').wait_for(timeout=15000)
  for heading in ['Expression','Posture','Umbrella / shelter','The rain','Additional elements','Figure / composition','Your palette, your meaning','Your process, mark by mark','Restyle your drawing']:
   assert page.get_by_role('heading',name=heading,exact=True).count()==1,heading
  results.append('All illustrated PITR, palette, process and AI sections are present on a full-size recorded artwork.')
  lanes=page.locator('.scene-lane').all_inner_texts()
  for name,stamp in [('Person','0:05'),('Umbrella','0:28'),('Rain','0:45'),('Other elements','1:20')]:
   assert any(name in lane and stamp in lane for lane in lanes),(name,stamp,lanes)
  assert any('Unlabelled' in lane and '1:32' in lane for lane in lanes),lanes
  results.append({'timeline':lanes})
  page.locator('.stroke-labels summary').click()
  page.get_by_label('Element label for stroke 22',exact=True).select_option('scene')
  assert 'Not labelled' in page.locator('.scene-lane').last.inner_text()
  page.get_by_label('Drawing replay time',exact=True).fill('0')
  beginning=page.locator('.replay-paper canvas').evaluate('(c)=>c.toDataURL()')
  page.get_by_label('Drawing replay time',exact=True).fill('90')
  end=page.locator('.replay-paper canvas').evaluate('(c)=>c.toDataURL()')
  assert beginning!=end
  results.append('Real-time lanes reflect labels; post-drawing corrections and time-scrub replay update immediately.')
  # The exact artist-confirmation controls are supplied by the ReflectionCards component.
  details=page.locator('.reflection-cards details')
  if details.count() and not details.first.evaluate('(d)=>d.open'):details.first.locator('summary').click()
  for key,val in [('expression','smiling'),('posture','upright'),('umbrella','covering'),('rain','heavy')]:
   control=page.locator(f'select[data-scene-field="{key}"]')
   if not control.count():control=page.get_by_label(key.capitalize(),exact=True)
   control.select_option(val)
  assert 'Pressure + protection' in page.locator('.scene-summary').inner_text()
  assert 'hope' in page.locator('.palette-story').inner_text().lower() or 'brightness' in page.locator('.palette-story').inner_text().lower()
  results.append('Artist-confirmed smile/stance/cover/rain yields short cues; actual used yellow/blue colours have named reflections.')
  for width in [360,768,1440]:
   page.set_viewport_size({'width':width,'height':1000})
   assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'),width
  for theme in ['light','dark']:
   page.set_viewport_size({'width':1440,'height':1000})
   if page.evaluate('document.documentElement.dataset.theme')!=theme:page.get_by_role('button',name='Toggle dark mode').click()
   colours=page.evaluate('''()=>{
    const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');
    const rgb=(value)=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=value;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data).slice(0,3)};
    return [...document.querySelectorAll('.rm-lens-sentence,.rm-colour-meaning,.rm-colour-code,.scene-summary-grid p,.ai-card p,.ai-card h2,.ai-size-label,.ai-card .section-kicker')].map(e=>{
      const container=e.closest('.rm-lens,.rm-colour-card,.scene-summary-grid article,.ai-card');
      // The AI surface uses a known dark gradient: its lighter endpoint is the
      // conservative contrast background. Other tested cards are opaque.
      const background=container.classList.contains('ai-card')?'#293348':getComputedStyle(container).backgroundColor;
      return {text:e.textContent,fg:rgb(getComputedStyle(e).color),bg:rgb(background)};
    });
   }''')
   def luminance(rgb):
    values=[c/255 for c in rgb]
    values=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
    return sum(v*w for v,w in zip(values,[.2126,.7152,.0722]))
   ratios=[]
   for pair in colours:
    a,b=sorted([luminance(pair['fg']),luminance(pair['bg'])]);ratio=(b+.05)/(a+.05)
    assert ratio>=4.5,(theme,pair,ratio)
    ratios.append(ratio)
   results.append({'theme':theme,'minimumNewCardTextContrast':round(min(ratios),2)})
   for selector,name in [('.reflection-cards','pitr'),('.palette-story','palette'),('.process-story','process'),('.report-restyle-card','restyle-panel')]:
    page.locator(selector).screenshot(path=str(output/f'{name}-{theme}.png'))
   page.screenshot(path=str(output/f'report-revision-{theme}.png'),full_page=True)
  assert not errors,errors
  results.append('No uncaught browser/React errors; no overflow at 360/768/1440 px.')
  (output/'report-revision-results.json').write_text(json.dumps(results,indent=2)+'\n')
  print(json.dumps(results,indent=2));browser.close()
finally:server.shutdown()
