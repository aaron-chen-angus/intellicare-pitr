"""Real production report integration; provider auth/edit responses are explicitly mocked."""
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from time import time
from io import BytesIO
from urllib.parse import parse_qs,urlparse
import base64,json,os
from PIL import Image
from playwright.sync_api import sync_playwright
from report_fixture import recorded_fixture
ROOT=Path(__file__).resolve().parents[1];SITE=Path(os.environ.get('RAIN_TEST_DIST',ROOT/'dist'))
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):
  path=path.split('?')[0]
  if path.startswith('/intellicare-pitr/'):path=path[len('/intellicare-pitr/'):]
  return str(SITE/path.lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
url=f'http://127.0.0.1:{server.server_port}/intellicare-pitr/'
stream=BytesIO();Image.new('RGB',(128,192),'#a28fcd').save(stream,'JPEG');fake=base64.b64encode(stream.getvalue()).decode()
results=[];errors=[];edits=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=p.chromium.executable_path,headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1440,'height':1050})
  context.route('**/restyle.config.json',lambda r:r.fulfill(json={'appKey':'pk_qa_example','budget':.03}))
  context.route('https://enter.pollinations.ai/authorize?**',lambda r:r.fulfill(body='Mock provider authorisation',content_type='text/html'))
  context.route('https://enter.pollinations.ai/api/oauth/token',lambda r:r.fulfill(json={'access_token':'sk_qa_example','expires_in':3600}))
  context.route('https://gen.pollinations.ai/account/key',lambda r:r.fulfill(json={'valid':True,'questPollenOnly':True,'pollenBudget':.03}))
  def edit(r):edits.append(r.request.post_data_json);r.fulfill(json={'data':[{'b64_json':fake,'media_type':'image/jpeg'}]})
  context.route('https://gen.pollinations.ai/v1/images/edits',edit)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(url,wait_until='networkidle')
  page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',recorded_fixture(int(time()*1000)))
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click()
  page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
  page.get_by_role('heading',name='Restyle your drawing',exact=True).wait_for(timeout=15000)
  assert page.get_by_role('button',name='Enhance with AI',exact=True).count()==0
  assert page.get_by_role('button',name='AI preview',exact=True).count()==0
  assert page.get_by_label('AI preview quality',exact=True).count()==0
  original=page.locator('.artwork-card>img').get_attribute('src')
  metrics=page.locator('.process-story').inner_text()
  assert page.locator('.report-restyle-style').count()==4
  for style,name in [('anime','Anime'),('realistic','Realistic'),('watercolour','Watercolour'),('graphic-novel','Graphic Novel')]:
   page.get_by_role('button',name='Restyle as '+name,exact=True).click()
   modal=page.locator('.report-restyle-dialog');modal.wait_for(state='visible')
   page.get_by_text('Your report drawing is loaded',exact=True).wait_for()
   page.wait_for_function('''()=>{const i=document.querySelector('.report-restyle-dialog .restyle-before img');return i&&i.complete&&i.naturalWidth===1240&&i.naturalHeight===1754}''')
   assert modal.locator('.restyle-after img').count()==0
   assert modal.get_by_label('Upload a drawing',exact=True).count()==0
   page.wait_for_function('(style)=>document.querySelector(".report-restyle-dialog .restylestylecard.is-selected")?.dataset.styleId===style',arg=style)
   page.get_by_role('button',name='Back to your report',exact=True).click()
   assert not modal.is_visible()
  results.append('All four styles open directly from the actual report with its 1240×1754 original preloaded; no upload/separate route/sample substitution.')
  page.get_by_role('button',name='Restyle drawing',exact=True).click();modal=page.locator('.report-restyle-dialog');modal.wait_for(state='visible')
  with page.expect_popup() as info:modal.get_by_role('button',name='Connect Pollinations',exact=True).click()
  popup=info.value;popup.wait_for_url('https://enter.pollinations.ai/authorize?**');query=parse_qs(urlparse(popup.url).query)
  popup.goto(url+'?code=qa_code&state='+query['state'][0])
  modal.get_by_role('button',name='Disconnect Pollinations',exact=True).wait_for()
  modal.locator('.restylestylecard[data-style-id="anime"]').click()
  modal.locator('input[type=checkbox]').check();modal.get_by_role('button',name='Restyle my drawing',exact=True).click()
  modal.get_by_role('button',name='Use this artwork in report',exact=True).wait_for()
  assert len(edits)==1 and 'anime' in edits[0]['prompt'].lower()
  assert edits[0]['image'][0]['image_url'].startswith('data:image/png;base64,')
  modal.get_by_role('button',name='Use this artwork in report',exact=True).click();modal.wait_for(state='hidden')
  page.get_by_role('button',name='Anime version',exact=True).wait_for()
  page.wait_for_function('()=>{const i=document.querySelector(".artwork-card>img");return i&&i.naturalWidth===128&&i.naturalHeight===192}')
  assert page.locator('.artwork-card>img').get_attribute('src').startswith('data:image/png;base64,')
  assert page.locator('.process-story').inner_text()==metrics
  with page.expect_download():page.get_by_role('button',name='Download PNG',exact=True).click()
  page.get_by_role('button',name='Original',exact=True).click()
  assert page.locator('.artwork-card>img').get_attribute('src')==original
  with page.expect_download():page.get_by_role('button',name='Download full-size original',exact=True).click()
  results.append('Mock provider result explicitly applies as Anime version, exports, and switches back to byte-identical original; original-only process stays unchanged. Not live-generation proof.')
  for width in [360,768,1440]:
   page.set_viewport_size({'width':width,'height':1050});assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  page.set_viewport_size({'width':1440,'height':1050});page.get_by_role('button',name='Toggle dark mode',exact=True).click()
  evidence=ROOT/'test-evidence';evidence.mkdir(exist_ok=True)
  page.locator('.report-restyle-card').screenshot(path=str(evidence/'integrated-style-card.png'))
  page.locator('.report-grid').screenshot(path=str(evidence/'integrated-report.png'))
  page.get_by_role('button',name='Restyle as Realistic',exact=True).click();modal.wait_for(state='visible')
  assert modal.get_by_role('button',name='Disconnect Pollinations',exact=True).count()==1
  results.append('Closing/reopening preserves the memory-only provider connection; report remains responsive at 360/768/1440.')
  page.keyboard.press('Escape');assert not modal.is_visible()
  page.get_by_role('button',name='Draw again',exact=True).click();page.get_by_role('button',name='Start drawing',exact=True).wait_for()
  assert page.get_by_role('button',name='Anime version',exact=True).count()==0
  assert not errors,errors
  results.append('Escape closes the studio; draw-again clears applied result; no uncaught React/browser errors.')
  (evidence/'integrated-restyle-results.json').write_text(json.dumps(results,indent=2)+'\n')
  print(json.dumps(results,indent=2),flush=True);browser.close()
finally:server.shutdown()
