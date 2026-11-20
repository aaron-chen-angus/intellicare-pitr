"""Focused connection/guard test. All provider replies are test doubles; no real generation."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from io import BytesIO
from urllib.parse import urlparse,parse_qs
import base64,json,os
from PIL import Image
from playwright.sync_api import sync_playwright
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
base=f'http://127.0.0.1:{server.server_port}/intellicare-pitr/'
source=BytesIO();Image.new('RGB',(40,60),'#2e8c88').save(source,'PNG')
output=base64.b64encode(source.getvalue()).decode()
mode={'quest':False,'budget':.03};edits=[];errors=[];exchanges=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  context=browser.new_context(service_workers='block')
  context.route('**/restyle.config.json',lambda r:r.fulfill(json={'appKey':'pk_test_only','budget':.03}))
  context.route('https://enter.pollinations.ai/authorize?**',lambda r:r.fulfill(body='Protocol test only',content_type='text/html'))
  def exchange(r):
   exchanges.append(parse_qs(r.request.post_data));r.fulfill(json={'access_token':'sk_test_only','expires_in':3600})
  context.route('https://enter.pollinations.ai/api/oauth/token',exchange)
  context.route('https://gen.pollinations.ai/account/key',lambda r:r.fulfill(json={'valid':True,'questPollenOnly':mode['quest'],'pollenBudget':mode['budget']}))
  def edit(r):
   edits.append(r.request.post_data_json);r.fulfill(json={'data':[{'b64_json':output,'media_type':'image/png'}]})
  context.route('https://gen.pollinations.ai/v1/images/edits',edit)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'#/restyle',wait_until='networkidle')
  assert 'tick “Quest pollen only”' in page.locator('#restyle-free-connection').inner_text()
  page.get_by_label('Upload a drawing',exact=True).set_input_files({'name':'synthetic.png','mimeType':'image/png','buffer':source.getvalue()})
  def connect():
   with page.expect_popup() as info:page.get_by_role('button',name='Connect Pollinations',exact=True).click()
   popup=info.value;popup.wait_for_url('https://enter.pollinations.ai/authorize?**')
   params=parse_qs(urlparse(popup.url).query)
   assert 'scope' not in params and 'questPollenOnly' not in params
   assert params['models']==['black-forest-labs/flux.2-klein-4b']
   popup.goto(base+'?code=protocol_test&state='+params['state'][0])
  connect()
  page.get_by_role('alert').filter(has_text='Free-only connection was not selected').wait_for()
  assert page.get_by_role('button',name='Disconnect Pollinations').count()==0
  assert page.get_by_role('button',name='Restyle my drawing',exact=True).is_disabled() and not edits
  mode['quest']=True;connect()
  page.get_by_role('button',name='Disconnect Pollinations').wait_for()
  assert 'Free-only connected' in page.locator('.restyle-provider-heading').inner_text()
  stored=page.evaluate('JSON.stringify([Object.values(localStorage),Object.values(sessionStorage)])')
  assert 'sk_test_only' not in stored and 'sk_test_only' not in page.url
  consent=page.locator('.restyle-consent input');consent.check()
  mode['quest']=False
  page.get_by_role('button',name='Restyle my drawing',exact=True).click()
  page.get_by_role('alert').filter(has_text='Free-only connection was not selected').wait_for()
  assert not edits
  mode['quest']=True;mode['budget']=0
  consent.check()
  page.get_by_role('button',name='Restyle my drawing',exact=True).click()
  page.get_by_role('alert').filter(has_text='earned Quest credits or authorised budget are exhausted').wait_for()
  assert not edits
  mode['budget']=.03
  consent.check()
  page.get_by_role('button',name='Restyle my drawing',exact=True).click()
  page.locator('.restyle-after img').wait_for()
  assert len(edits)==1 and edits[0]['image'][0]['image_url'].startswith('data:image/png;base64,')
  assert not errors,errors
  result={'unsafeGrantRejectedBeforeConnected':True,'paidCapableKeyBlockedBeforeUpload':True,'exhaustedEarnedBudgetBlockedBeforeUpload':True,'noAdminScopesOrUnsupportedFlags':True,'tokenNotInStorageOrURL':True,'safeKeyMockEditSucceeded':True,'realProviderGenerations':0}
  (ROOT/'test-evidence').mkdir(exist_ok=True)
  (ROOT/'test-evidence/free-only-connection.json').write_text(json.dumps(result,indent=2)+'\n')
  print(json.dumps(result,indent=2))
  browser.close()
finally:server.shutdown()
