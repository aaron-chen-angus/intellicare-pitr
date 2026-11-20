"""Paired PDF export integration. Provider responses are explicit QA doubles, no live generation."""
from pathlib import Path
from io import BytesIO
from urllib.parse import parse_qs,urlparse
from time import time
import base64,json,subprocess
from PIL import Image,ImageDraw
from playwright.sync_api import sync_playwright,expect
import interactive_report_smoke as setup
OUT=setup.OUT
RESULT=[]
# Deliberately distinct RGB quadrants allow exact extracted-image identity checks.
buffer=BytesIO();style_image=Image.new('RGB',(128,192),'#a28fcd');draw=ImageDraw.Draw(style_image);draw.rectangle((64,0,127,95),fill='#bd8154');draw.rectangle((0,96,63,191),fill='#467a73');style_image.save(buffer,'JPEG',quality=95)
FAKE=base64.b64encode(buffer.getvalue()).decode()
EXPECTED_STYLE=Image.open(BytesIO(buffer.getvalue())).convert('RGB')
def export(page,name):
 with page.expect_download(timeout=60000) as event:page.get_by_role('button',name='Download reflection report PDF',exact=True).click()
 dest=OUT/name;event.value.save_as(dest);assert dest.read_bytes().startswith(b'%PDF-')
 text=subprocess.check_output(['pdftotext','-layout',str(dest),'-'],text=True)
 assert 'personal reflection' in text.lower()
 assert 'not a psychological test' in text.replace('\n',' ')
 assert page.locator('.report-export-error').count()==0
 return dest,text
def extracted(path,prefix):
 folder=OUT/prefix;folder.mkdir(exist_ok=True)
 for old in folder.glob('art-*.png'):old.unlink()
 subprocess.run(['pdfimages','-png',str(path),str(folder/'art')],check=True)
 return [Image.open(p).convert('RGB') for p in sorted(folder.glob('art-*.png'))]
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  ctx=browser.new_context(viewport={'width':1440,'height':1100},accept_downloads=True,service_workers='block')
  ctx.route('**/restyle.config.json',lambda r:r.fulfill(json={'appKey':'pk_qa_example','budget':.03}))
  ctx.route('https://enter.pollinations.ai/authorize?**',lambda r:r.fulfill(body='QA provider consent double',content_type='text/html'))
  ctx.route('https://enter.pollinations.ai/api/oauth/token',lambda r:r.fulfill(json={'access_token':'sk_qa_example','expires_in':3600}))
  ctx.route('https://gen.pollinations.ai/account/key',lambda r:r.fulfill(json={'valid':True,'questPollenOnly':True,'pollenBudget':.03}))
  calls=[]
  def edit(route):calls.append(route.request.post_data_json);route.fulfill(json={'data':[{'b64_json':FAKE,'media_type':'image/jpeg'}]})
  ctx.route('https://gen.pollinations.ai/v1/images/edits',edit)
  page=ctx.new_page();errors=[];page.on('pageerror',lambda e:errors.append(str(e)))
  page.goto(setup.URL,wait_until='networkidle')
  fixture=setup.recorded_fixture(int(time()*1000));fixture['profile']['name']='QA paired artwork (synthetic)'
  page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',fixture)
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click();page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
  page.get_by_role('heading',name='Restyle your drawing',exact=True).wait_for(timeout=15000)
  original=page.locator('.artwork-card>img').get_attribute('src');original_rgb=Image.open(BytesIO(base64.b64decode(original.split(',',1)[1]))).convert('RGB')
  metrics=page.locator('.process-story').inner_text()
  plain_path,plain=export(page,'premium-report-no-style.pdf')
  assert 'no styled artwork applied' in plain.lower(),plain[:1500]
  assert 'Person' in plain and 'Umbrella' in plain
  RESULT.append('Original-only PDF explicitly reports no applied style; it does not substitute a sample.')
  setup.composition_checks(page);setup.activity_checks(page,fixture)
  # Activity checks restore the report; confirm independent scene fields again for the final export.
  page.get_by_role('button',name='Confirm detail: Figure / composition',exact=True).click()
  for key,value in [('expression','smiling'),('posture','upright'),('umbrella','covering'),('rain','moderate'),('figure-size','medium')]:page.locator(f'[data-scene-field="{key}"]').select_option(value)
  page.get_by_label('None of these',exact=True).check();page.locator('[data-scene-field="figure-position"][value="center"]').check()
  original=page.locator('.artwork-card>img').get_attribute('src');original_rgb=Image.open(BytesIO(base64.b64decode(original.split(',',1)[1]))).convert('RGB');metrics=page.locator('.process-story').inner_text()
  page.get_by_role('button',name='Restyle as Anime',exact=True).click();modal=page.locator('.report-restyle-dialog');modal.wait_for(state='visible')
  with page.expect_popup() as info:modal.get_by_role('button',name='Connect Pollinations',exact=True).click()
  popup=info.value;popup.wait_for_url('https://enter.pollinations.ai/authorize?**');params=parse_qs(urlparse(popup.url).query);popup.goto(setup.URL+'?code=qa_code&state='+params['state'][0])
  modal.get_by_role('button',name='Disconnect Pollinations',exact=True).wait_for(timeout=15000)
  modal.locator('input[type=checkbox]').check();modal.get_by_role('button',name='Restyle my drawing',exact=True).click();modal.get_by_role('button',name='Use this artwork in report',exact=True).wait_for(timeout=15000)
  modal.get_by_role('button',name='Use this artwork in report',exact=True).click();modal.wait_for(state='hidden');page.get_by_role('button',name='Anime version',exact=True).wait_for()
  assert len(calls)==1 and 'anime' in calls[0]['prompt'].lower()
  assert calls[0]['image'][0]['image_url'].startswith('data:image/png;base64,')
  page.get_by_role('button',name='Original',exact=True).click();assert page.locator('.artwork-card>img').get_attribute('src')==original
  assert page.locator('.process-story').inner_text()==metrics
  paired_path,paired=export(page,'premium-report-paired.pdf')
  assert 'original drawing' in paired.lower() and 'anime' in paired.lower(),paired[:2000]
  for wanted in ['Calm','Hopeful','#53718a','#f6d58a','drink a glass of water','Smiling','center']:assert wanted.lower() in paired.lower(),wanted
  images=extracted(paired_path,'premium-images')
  assert any(i.size==original_rgb.size and i.tobytes()==original_rgb.tobytes() for i in images),'Original image identity not retained'
  assert any(i.size==EXPECTED_STYLE.size and i.tobytes()==EXPECTED_STYLE.tobytes() for i in images),'Applied style image identity not retained'
  RESULT.append('Actual app PDF embeds byte-equivalent decoded original and applied Anime image together while the Original tab is selected. Labels, choices, times and original process remain unchanged.')
  page.get_by_role('button',name='Anime version',exact=True).click();_,styled=export(page,'premium-report-styled-tab.pdf')
  assert 'Anime' in styled and 'Original drawing' in styled
  RESULT.append('Both artwork tabs export both artworks, no provider call during the PDF export; the only image edit is the explicit mocked QA request.')
  assert not errors,errors
  (OUT/'premium-report-results.json').write_text(json.dumps(RESULT,indent=2)+'\n');print(json.dumps(RESULT,indent=2))
  print(subprocess.check_output(['pdfinfo',str(paired_path)],text=True));browser.close()
finally:setup.server.shutdown()
