"""Finite production smoke test; serves dist under /intellicare-pitr/."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
import json
import os
import re
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parents[1]
SITE = Path(os.environ.get('RAIN_TEST_DIST', ROOT / 'dist'))
PREFIX = '/intellicare-pitr/'
class Handler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if path.startswith(PREFIX):
            path = '/' + path[len(PREFIX):]
        return str(SITE / path.lstrip('/').split('?')[0])
    def log_message(self, *_): pass

server = ThreadingHTTPServer(('127.0.0.1', 0), Handler)
Thread(target=server.serve_forever, daemon=True).start()
url = f'http://127.0.0.1:{server.server_port}{PREFIX}'
results = []
output = ROOT / 'test-evidence'
output.mkdir(exist_ok=True)

DRAW = """() => {
 const holder = document.querySelector('.canvas-holder');
 const rect = holder.getBoundingClientRect();
 const strokes = [
 [[.42,.27],[.43,.24],[.48,.23],[.53,.25],[.53,.29],[.49,.31],[.44,.30],[.42,.27]],
 [[.48,.31],[.48,.52]], [[.48,.39],[.38,.43],[.33,.50]],
 [[.48,.39],[.59,.40],[.62,.26]], [[.48,.52],[.38,.68]],
 [[.48,.52],[.58,.68]], [[.38,.68],[.33,.68]], [[.58,.68],[.62,.68]],
 [[.3,.2],[.36,.14],[.43,.11],[.53,.12],[.6,.15],[.65,.2],[.3,.2]],
 [[.62,.2],[.62,.4]]
 ];
 for(let i=0;i<10;i++) strokes.push([[.17+i*.065,.06],[.19+i*.065,.1]]);
 for(const points of strokes){
  const emit=(type,p,buttons)=>holder.dispatchEvent(new PointerEvent(type,{pointerId:1,pointerType:'mouse',clientX:rect.left+p[0]*rect.width,clientY:rect.top+p[1]*rect.height,buttons,pressure:.5,bubbles:true}));
  emit('pointerdown',points[0],1);
  points.slice(1).forEach(p=>emit('pointermove',p,1));
  emit('pointerup',points.at(-1),0);
 }
}"""

def luminance(rgb):
    channels = [v/255 for v in rgb]
    linear = [v/12.92 if v <= .04045 else ((v+.055)/1.055)**2.4 for v in channels]
    return sum(v*w for v,w in zip(linear, [.2126,.7152,.0722]))
def rgb(value):
    channels = [float(v) for v in re.findall(r'[\d.]+',value)[:3]]
    return [v*255 for v in channels] if value.startswith('color(srgb ') else channels
def contrast(fg,bg):
    a,b = sorted([luminance(rgb(fg)),luminance(rgb(bg))])
    return (b+.05)/(a+.05)

try:
  with sync_playwright() as p:
    browser = p.chromium.launch(executable_path=p.chromium.executable_path, headless=True, args=['--no-sandbox'])
    context = browser.new_context(viewport={'width':1440,'height':1000}, accept_downloads=True)
    page = context.new_page()
    errors = []
    page.on('pageerror', lambda error: errors.append(str(error)))
    page.goto(url, wait_until='networkidle')
    page.get_by_text('Release 2026.11.05-pages-fix-1', exact=True).wait_for()
    assert page.get_by_role('button',name='Start drawing').is_disabled()
    page.get_by_role('checkbox').check()
    page.get_by_role('button',name='Start drawing').click()
    page.locator('canvas').wait_for()
    page.evaluate(DRAW)
    page.get_by_role('button',name='Submit', exact=True).click()
    page.get_by_role('button',name='Yes, collect it').click()
    page.get_by_role('heading',name='Person · weather · shelter · scene').wait_for(timeout=15000)
    for heading in ['Expression','Posture','Umbrella / shelter','The rain','Additional elements','Figure / composition','Stay with one detail','Enhance the drawing with AI']:
      assert page.get_by_role('heading',name=heading,exact=True).count() == 1, heading
    assert page.locator('.artwork-card img').evaluate('(img)=>img.complete && img.naturalWidth > 0')
    results.append('Actual draw/submit/report renders all six PITR lenses, discovery activities and AI control; artwork loaded.')
    for width in [360,768,1440]:
      page.set_viewport_size({'width':width,'height':1000})
      assert page.evaluate('document.documentElement.scrollWidth <= innerWidth + 1'), width
    page.set_viewport_size({'width':1440,'height':1000})
    for theme in ['light','dark']:
      current = page.evaluate('document.documentElement.dataset.theme')
      if current != theme: page.get_by_role('button',name='Toggle dark mode').click()
      page.wait_for_timeout(200)
      checks = page.evaluate("""() => ['.reading-grid p','.discovery-grid p','.insight-card p','.visual-notes p'].map(s=>{
       const e=document.querySelector(s);let a=e;while(a && getComputedStyle(a).backgroundColor==='rgba(0, 0, 0, 0)')a=a.parentElement;
       return {selector:s,color:getComputedStyle(e).color,background:getComputedStyle(a).backgroundColor};
      })""")
      for check in checks:
        ratio=contrast(check['color'],check['background'])
        assert ratio >= 4.5, (theme,check,ratio)
        check['ratio']=round(ratio,2)
      results.append({'theme':theme,'report_text_contrast':checks})
      page.screenshot(path=str(output / f'report-{theme}.png'),full_page=True)
    page.get_by_role('button',name='Gallery finish',exact=True).click()
    page.wait_for_timeout(300)
    with page.expect_download() as download:
      page.get_by_role('button',name='Download PNG',exact=True).click()
    assert download.value.suggested_filename.endswith('.png')
    results.append('Gallery finish and PNG download work.')
    page.evaluate("localStorage.setItem('rain-and-me-gallery-v1','not-json')")
    page.get_by_role('button',name='Save to gallery',exact=True).click()
    assert 'Saved to your local gallery' in page.locator('.toast').inner_text()
    assert not errors, errors
    results.append('No uncaught React/browser errors in the tested flow; corrupt gallery data is handled.')
    context.close()
    denied = browser.new_context()
    denied.add_init_script("Object.defineProperty(window,'localStorage',{get(){throw new DOMException('Blocked','SecurityError')}})")
    page = denied.new_page(); storage_errors=[]
    page.on('pageerror',lambda e: storage_errors.append(str(e)))
    page.goto(url,wait_until='networkidle')
    page.get_by_role('checkbox').check(); page.get_by_role('button',name='Start drawing').click()
    page.locator('canvas').wait_for()
    assert not storage_errors, storage_errors
    results.append('Storage-denied browser still opens welcome and studio without blanking.')
    denied.close(); browser.close()
  (output/'results.json').write_text(json.dumps(results,indent=2)+'\n')
  print(json.dumps(results,indent=2))
finally:
  server.shutdown()
