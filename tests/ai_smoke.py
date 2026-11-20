"""Real full-size drawing input -> bounded tiled WASM preview at a Pages subpath."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from time import time
import json, os
from playwright.sync_api import sync_playwright
from report_fixture import recorded_fixture
ROOT=Path(__file__).resolve().parents[1]
SITE=Path(os.environ.get('RAIN_TEST_DIST',ROOT/'dist'))
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  path=path.split('?')[0]
  if path.startswith('/intellicare-pitr/'):path=path[len('/intellicare-pitr/'):]
  return str(SITE/path.lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler)
Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/intellicare-pitr/'
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=p.chromium.executable_path,headless=True,args=['--no-sandbox'])
  page=browser.new_page(viewport={'width':1440,'height':1000});page.set_default_timeout(300000)
  requests=[];errors=[];progress=[]
  page.on('request',lambda r:requests.append(r.url.split('?')[0]) if ('.wasm' in r.url or '.mjs' in r.url or '.onnx' in r.url or 'worker-' in r.url) else None)
  page.on('pageerror',lambda e:errors.append(str(e)))
  page.on('console',lambda m:print(m.text,flush=True) if m.text.startswith('AIQA:') else None)
  page.goto(url,wait_until='networkidle')
  page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',recorded_fixture(int(time()*1000)))
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click();page.locator('canvas').wait_for()
  page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
  page.get_by_role('heading',name='Enhance the drawing with AI').wait_for()
  side=int(os.environ.get('RAIN_AI_SIDE','256'))
  page.get_by_label('AI preview quality').select_option(str(side))
  original=page.locator('.artwork-card img').get_attribute('src')
  assert page.locator('.artwork-card img').evaluate('(i)=>[i.naturalWidth,i.naturalHeight]')==[1240,1754]
  # First verify termination and no stale output.
  page.get_by_role('button',name='Enhance with AI',exact=True).click()
  page.get_by_role('button',name='Cancel AI',exact=True).click()
  assert 'Cancelled' in page.locator('.ai-status').inner_text()
  page.wait_for_timeout(500)
  assert page.locator('.artwork-card img').get_attribute('src')==original
  print('AIQA: cancellation preserves full-size original',flush=True)
  page.evaluate("""()=>{
    window.qaProgress=[];
    new MutationObserver(()=>{
      const e=document.querySelector('.ai-status');if(e){const text=e.textContent; if(window.qaProgress.at(-1)!==text){window.qaProgress.push(text);console.log('AIQA: '+text);}}
    }).observe(document.querySelector('#ai-enhancement'),{subtree:true,childList:true,characterData:true});
  }""")
  started=time();page.get_by_role('button',name='Enhance with AI',exact=True).click()
  page.wait_for_function("document.querySelector('.ai-status.ready, .ai-status.error') !== null",timeout=310000)
  page.wait_for_timeout(300)
  result=page.locator('.ai-status').evaluate('(e)=>({state:e.className,text:e.textContent})')
  result['elapsedSeconds']=round(time()-started,1)
  result['image']=page.locator('.artwork-card img').evaluate('(i)=>({width:i.naturalWidth,height:i.naturalHeight})')
  result['networkAssets']=sorted(set(requests));result['uncaughtErrors']=errors;result['progress']=page.evaluate('window.qaProgress')
  assert 'ready' in result['state'],result
  expected={128:(180,256,6),256:(362,512,24),320:(452,640,35)}[side]
  assert result['image']=={'width':expected[0],'height':expected[1]},result
  assert f'{expected[2]} patches' in result['text'],result
  assert any('worker-' in r for r in requests),requests
  assert any('cdn.jsdelivr.net' in r and '.wasm' in r for r in requests),requests
  assert not errors,errors
  page.locator('#ai-enhancement').screenshot(path=str(ROOT/f'test-evidence/ai-success-{side}.png'))
  page.get_by_role('button',name='Original',exact=True).click()
  assert page.locator('.artwork-card img').get_attribute('src')==original
  assert page.locator('.artwork-card img').evaluate('(i)=>[i.naturalWidth,i.naturalHeight]')==[1240,1754]
  result['originalPreserved']=True;result['cancelVerified']=True
  (ROOT/f'test-evidence/ai-fullsize-{side}-results.json').write_text(json.dumps(result,indent=2)+'\n')
  print(json.dumps({k:v for k,v in result.items() if k not in ['networkAssets','progress']},indent=2),flush=True)
  browser.close()
finally:server.shutdown()
