"""Presentation regression only. No provider requests or live image generation."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from time import time
import json,os
from playwright.sync_api import sync_playwright
from report_fixture import recorded_fixture
ROOT=Path(__file__).resolve().parents[1];SITE=Path(os.environ.get('RAIN_TEST_DIST',ROOT/'dist'))
OUT=ROOT/'test-evidence';OUT.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):return str(SITE/path.split('?')[0].removeprefix('/intellicare-pitr/').lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/intellicare-pitr/'
RESULT=[]
CONTRAST="""selectors=>{
 const cv=document.createElement('canvas');cv.width=cv.height=1;const ctx=cv.getContext('2d');
 const rgba=c=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=c;ctx.fillRect(0,0,1,1);return [...ctx.getImageData(0,0,1,1).data]};
 const lum=c=>c.slice(0,3).map(x=>x/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4).reduce((a,x,i)=>a+x*[.2126,.7152,.0722][i],0);
 return selectors.flatMap(s=>[...document.querySelectorAll(s)].filter(e=>e.getBoundingClientRect().height>0).map(e=>{
  let node=e,bg;while(node){bg=rgba(getComputedStyle(node).backgroundColor);if(bg[3]===255)break;node=node.parentElement}if(!node)bg=[255,255,255,255];
  const fg=rgba(getComputedStyle(e).color), a=lum(fg),b=lum(bg);
  return {selector:s,text:e.textContent.slice(0,60),ratio:(Math.max(a,b)+.05)/(Math.min(a,b)+.05)};
 }));
}"""
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox']);context=browser.new_context(viewport={'width':1440,'height':1100});page=context.new_page();errors=[];requests=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
  page.goto(URL,wait_until='networkidle');page.evaluate('document.fonts.ready')
  assert page.locator('.scrapbook-art-image').evaluate('(i)=>i.complete&&i.naturalWidth>=500')
  assert page.evaluate('document.fonts.check("24px \\\"DM Serif Display\\\"")')
  for theme in ['light','dark']:
   if page.evaluate('document.documentElement.dataset.theme')!=theme:page.get_by_role('button',name='Toggle dark mode').click()
   pairs=page.evaluate(CONTRAST,['.display-title','.lede','.instruction-card p','.field-label','.consent','.privacy-note'])
   assert all(c['ratio']>=4.5 for c in pairs),(theme,pairs)
   RESULT.append({'intakeTheme':theme,'minimumTextContrast':round(min(c['ratio'] for c in pairs),2)})
   page.screenshot(path=str(OUT/f'scrapbook-welcome-{theme}.png'),full_page=True)
  page.get_by_role('button',name='Toggle dark mode').click()
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.screenshot(path=str(OUT/'scrapbook-welcome-mobile.png'),full_page=True)
  page.locator('.consent input').check();page.get_by_role('button',name='Start drawing').click()
  canvas=page.locator('.canvas-holder');box=canvas.bounding_box();assert box['width']>150 and abs(box['height']/box['width']-1754/1240)<.015,box
  assert canvas.evaluate('(e)=>getComputedStyle(e.parentElement).transform')=='none'
  page.mouse.move(box['x']+box['width']*.3,box['y']+box['height']*.3);page.mouse.down();page.mouse.move(box['x']+box['width']*.7,box['y']+box['height']*.6,steps=8);page.mouse.up();page.wait_for_timeout(300)
  assert page.evaluate('JSON.parse(localStorage.getItem("rain-and-me-session-v1")).strokes.length')>0
  page.get_by_role('button',name='Undo',exact=True).click();page.get_by_role('button',name='Redo',exact=True).click()
  assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.screenshot(path=str(OUT/'scrapbook-studio-mobile.png'),full_page=True)
  RESULT.append('Consent, drawing Pointer Events, logical A4 aspect, persistence, Undo/Redo and mobile tool access retained.')
  page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',recorded_fixture(int(time()*1000)))
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click()
  page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
  page.get_by_role('heading',name='Restyle your drawing',exact=True).wait_for(timeout=15000)
  page.set_viewport_size({'width':1440,'height':1100});page.screenshot(path=str(OUT/'scrapbook-report-desktop.png'),full_page=True)
  for width in [360,768,1440]:
   page.set_viewport_size({'width':width,'height':1100});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  page.get_by_role('button',name='Restyle as Anime',exact=True).click();page.locator('.report-restyle-dialog').wait_for(state='visible')
  assert page.locator('.restyle-before img').evaluate('(i)=>i.src.startsWith("blob:")')
  assert page.locator('.restylestylecard').count()==4
  for theme in ['light','dark']:
   page.evaluate('(v)=>document.documentElement.dataset.theme=v',theme)
   pairs=page.evaluate(CONTRAST,['.restyle-intro h1','.restyle-intro-copy p','.restyle-card-title','.restyle-card-description','.restyle-field','.restyle-consent','.restyle-helper','.restyle-connect'])
   assert all(c['ratio']>=4.5 for c in pairs),(theme,pairs)
   RESULT.append({'styleStudioTheme':theme,'minimumTextContrast':round(min(c['ratio'] for c in pairs),2)})
   page.locator('.report-restyle-dialog').screenshot(path=str(OUT/f'scrapbook-style-studio-{theme}.png'))
  page.set_viewport_size({'width':390,'height':844});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1')
  page.locator('.report-restyle-dialog').screenshot(path=str(OUT/'scrapbook-style-studio-mobile.png'))
  assert not any('fonts.googleapis' in r or 'fonts.gstatic' in r or 'gen.pollinations.ai/v1' in r for r in requests)
  assert not errors,errors
  RESULT.append('Four artistic styles, real report-drawing handoff, modal mobile layout and both theme contrast pairs preserved. No Google Fonts or generation request.')
  (OUT/'scrapbook-checks.json').write_text(json.dumps(RESULT,indent=2)+'\n');print(json.dumps(RESULT,indent=2));browser.close()
finally:server.shutdown()
