"""Test the standalone lab at a Pages subpath. Provider responses are test doubles, not live generation."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from pathlib import Path
from threading import Thread
from time import time
from io import BytesIO
import base64,hashlib,json,os
from urllib.parse import urlparse,parse_qs
from PIL import Image,ImageDraw
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
image=Image.new('RGB',(1240,1754),'#fffdf8');d=ImageDraw.Draw(image);d.ellipse((440,300,780,640),fill='#f6d58a');d.rectangle((420,600,820,1300),fill='#2e8c88')
file=BytesIO();image.save(file,format='PNG');source=file.getvalue()
out=BytesIO();Image.new('RGB',(40,60),'#b4a1d4').save(out,format='PNG');fake=base64.b64encode(out.getvalue()).decode()
results=[];errors=[];edits=[];exchanges=[];key_mode={'quest':True};pending=[]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(executable_path=p.chromium.executable_path,headless=True,args=['--no-sandbox'])
  context=browser.new_context(viewport={'width':1440,'height':1100})
  context.route('**/restyle.config.json',lambda r:r.fulfill(json={'appKey':'pk_qa_example','budget':0.03,'expiryDays':1}))
  context.route('https://enter.pollinations.ai/authorize?**',lambda r:r.fulfill(body='<p>Mock provider authorisation for protocol QA only.</p>',content_type='text/html'))
  def token(r):
   exchanges.append(parse_qs(r.request.post_data or ''));r.fulfill(json={'access_token':'sk_qa_example','token_type':'bearer','expires_in':3600,'scope':''})
  context.route('https://enter.pollinations.ai/api/oauth/token',token)
  context.route('https://gen.pollinations.ai/account/key',lambda r:r.fulfill(json={'valid':True,'questPollenOnly':key_mode['quest'],'pollenBudget':0.03}))
  def edit(r):
   body=r.request.post_data_json;edits.append(body)
   if key_mode.get('hold'):pending.append(r);return
   r.fulfill(json={'created':int(time()),'data':[{'b64_json':fake,'media_type':'image/png'}]})
  context.route('https://gen.pollinations.ai/v1/images/edits',edit)
  page=context.new_page();page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(base+'#/restyle',wait_until='networkidle')
  page.get_by_role('heading',name='Same story. A different art style.').wait_for()
  assert page.locator('.restylestylecard').count()==4
  urls=[]
  for style in ['anime','realistic','watercolour','graphic-novel']:
   page.locator(f'.restylestylecard[data-style-id="{style}"]').click()
   page.wait_for_function("[...document.querySelectorAll('.restyle-lab img')].every(i=>i.complete&&i.naturalWidth>0)")
   urls.append(page.locator('.restyle-after img').get_attribute('src'))
  assert len(set(urls))==4
  assert 'Pre-generated' in page.locator('.restyle-lab').inner_text()
  assert not edits
  results.append('Four distinct real pre-generated style samples display; browsing samples makes no generation calls.')
  page.get_by_label('Upload a drawing',exact=True).set_input_files({'name':'my-drawing.png','mimeType':'image/png','buffer':source})
  assert page.locator('.restyle-after img').count()==0
  assert page.get_by_role('button',name='Restyle my drawing',exact=True).is_disabled()
  # Connection uses the actual popup/callback hook, mocked external auth/token endpoints only.
  with page.expect_popup() as info:page.get_by_role('button',name='Connect Pollinations',exact=True).click()
  popup=info.value;popup.wait_for_url('https://enter.pollinations.ai/authorize?**')
  params=parse_qs(urlparse(popup.url).query)
  assert params['models']==['black-forest-labs/flux.2-klein-4b']
  assert params['code_challenge_method']==['S256'] and 'scope' not in params
  assert params['redirect_uri']==[base]
  popup.goto(base+'?code=qa_code&state='+params['state'][0])
  try:page.get_by_role('button',name='Disconnect Pollinations',exact=True).wait_for(timeout=10000)
  except:
   print('AUTH DIAGNOSTIC',{'errors':page.locator('.restyle-error').all_text_contents(),'exchanges':len(exchanges),'popupClosed':popup.is_closed(),'callbackText':None if popup.is_closed() else popup.locator('body').inner_text()},flush=True)
   raise
  assert len(exchanges)==1
  verifier=exchanges[0]['code_verifier'][0]
  challenge=base64.urlsafe_b64encode(hashlib.sha256(verifier.encode()).digest()).decode().rstrip('=')
  assert challenge==params['code_challenge'][0]
  assert 'sk_qa_example' not in page.url
  stored=page.evaluate('({local:Object.values(localStorage),session:Object.values(sessionStorage)})')
  assert 'sk_qa_example' not in json.dumps(stored)
  results.append('PKCE verifier/challenge and exact callback match; access token remains out of URL/storage (mock provider).')
  key_mode['quest']=False
  consent=page.locator('.restyle-lab input[type=checkbox]');consent.check()
  page.get_by_role('button',name='Restyle my drawing',exact=True).click()
  page.get_by_role('alert').filter(has_text='Free-only connection was not selected').wait_for()
  assert len(edits)==0
  results.append('Server-attested Quest-only guard rejects paid-capable keys before sending any drawing.')
  key_mode['quest']=True
  page.locator('.restylestylecard[data-style-id="watercolour"]').click()
  consent.check();page.get_by_role('button',name='Restyle my drawing',exact=True).click()
  page.locator('.restyle-after img').wait_for()
  assert len(edits)==1
  assert edits[0]['model']=='black-forest-labs/flux.2-klein-4b'
  assert 'watercolour' in edits[0]['prompt'].lower()
  assert edits[0]['image'][0]['image_url'].startswith('data:image/png;base64,')
  assert edits[0]['response_format']=='b64_json' and edits[0]['n']==1
  assert page.locator('.restyle-before img').evaluate('(i)=>[i.naturalWidth,i.naturalHeight]')==[1240,1754]
  assert page.locator('.restyle-after img').evaluate('(i)=>[i.naturalWidth,i.naturalHeight]')==[40,60]
  assert page.locator('.restyle-after img').get_attribute('src').startswith('blob:')
  with page.expect_download():page.get_by_role('button',name='Download styled image',exact=True).click()
  results.append('Mock edit success sends image+style, decodes returned image, preserves full-size original and downloads result; not live-provider proof.')
  # Uploading another original must never reuse that generated result or a sample.
  page.get_by_label('Upload a drawing',exact=True).set_input_files({'name':'second.png','mimeType':'image/png','buffer':source})
  assert page.locator('.restyle-after img').count()==0
  key_mode['hold']=True;consent.check();page.get_by_role('button',name='Restyle my drawing',exact=True).click()
  page.get_by_role('button',name='Cancel restyling',exact=True).wait_for();page.get_by_role('button',name='Cancel restyling',exact=True).click()
  assert page.locator('.restyle-after img').count()==0
  for r in pending:
   try:r.abort()
   except:pass
  results.append('Source change clears result; cancellation leaves no substituted sample or stale image.')
  # Restore sample display for visual/responsive checks.
  page.get_by_role('button',name='Remove drawing & use example',exact=True).click()
  evidence=ROOT/'test-evidence';evidence.mkdir(exist_ok=True)
  for width in [360,768,1440]:
   page.set_viewport_size({'width':width,'height':1100});page.wait_for_timeout(150)
   assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+1'),width
  # Real sample-review configuration, no pretend connected account in screenshots.
  review_context=browser.new_context(viewport={'width':1440,'height':1100})
  review=review_context.new_page();review.on('pageerror',lambda e:errors.append(str(e)))
  review.goto(base+'#/restyle',wait_until='networkidle')
  review.get_by_role('alert').filter(has_text='Sample-review prototype').wait_for()
  assert review.get_by_role('button',name='Connect Pollinations',exact=True).is_disabled()
  review.get_by_role('button',name='Try it with your drawing',exact=True).click()
  assert review.url.endswith('#/restyle')
  results.append('Actual blank owner config is labelled sample-review mode; login/generation disabled, workspace jump stays in the lab.')
  for theme in ['light','dark']:
   review.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
   pairs=review.evaluate('''()=>{
    const c=document.createElement('canvas');c.width=c.height=1;const x=c.getContext('2d');
    const rgb=value=>{x.clearRect(0,0,1,1);x.fillStyle=value;x.fillRect(0,0,1,1);return [...x.getImageData(0,0,1,1).data]};
    return [...document.querySelectorAll('.restyle-helper,.restyle-card-description,.restyle-field,.restyle-card-title,.restyle-intro-copy p,.restyle-generation-hint,.restyle-gallery-note,.restyle-consent,.restyle-error')].map(e=>{
     let p=e;let background;
     while(p){background=rgb(getComputedStyle(p).backgroundColor);if(background[3]===255)break;p=p.parentElement}
     return {text:e.textContent,fg:rgb(getComputedStyle(e).color),bg:background};
    });
   }''')
   def luminance(rgb):
    v=[x/255 for x in rgb[:3]];v=[x/12.92 if x<=.04045 else ((x+.055)/1.055)**2.4 for x in v]
    return sum(x*w for x,w in zip(v,[.2126,.7152,.0722]))
   ratios=[]
   for pair in pairs:
    a,b=sorted([luminance(pair['fg']),luminance(pair['bg'])]);ratio=(b+.05)/(a+.05);assert ratio>=4.5,(theme,pair,ratio);ratios.append(ratio)
   results.append({'theme':theme,'minimumLabTextContrast':round(min(ratios),2)})
  review.evaluate('document.documentElement.dataset.theme="light";scrollTo(0,0)')
  review.locator('.restyle-lab').screenshot(path=str(evidence/'restyle-lab-desktop.png'))
  review.set_viewport_size({'width':390,'height':844});review.locator('.restyle-lab').screenshot(path=str(evidence/'restyle-lab-mobile.png'))
  review_context.close()
  page.goto(base,wait_until='networkidle');page.get_by_role('button',name='Start drawing').wait_for()
  assert page.get_by_role('button',name='Start drawing').is_disabled()
  assert not errors,errors
  results.append('No browser errors or overflow at 360/768/1440; existing PITR consent flow remains separate.')
  (evidence/'restyle-results.json').write_text(json.dumps(results,indent=2)+'\n')
  print(json.dumps(results,indent=2),flush=True)
  browser.close()
finally:server.shutdown()
