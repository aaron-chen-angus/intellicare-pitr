"""Affected feature checks: no decoration overlap, honest shares and actual report PDF downloads."""
import json, subprocess, sys
from pathlib import Path
from playwright.sync_api import sync_playwright, expect
import interactive_report_smoke as setup
from time import time
OUT=setup.OUT
RESULT=[]
def text_pdf(path):
 return subprocess.check_output(['pdftotext','-layout',str(path),'-'],text=True)
def download_pdf(page,name):
 with page.expect_download(timeout=60000) as result:page.get_by_role('button',name='Download reflection report PDF',exact=True).click()
 path=OUT/name;result.value.save_as(path);assert path.read_bytes().startswith(b'%PDF-');text=text_pdf(path)
 assert 'personal reflection' in text.lower(),text[:1000]
 assert 'Person' in text and 'Umbrella' in text and 'Rain' in text
 assert 'not a psychological test or diagnosis' in text.replace('\n',' ') or 'not a psychological test' in text
 assert page.locator('.report-export-error').count()==0
 return path,text
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1497,'height':922},accept_downloads=True);errors=[];network=[]
  page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:network.append(r.url))
  page.goto(setup.URL,wait_until='networkidle')
  for theme in ['light','dark']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   for width in [390,768,1497]:
    page.set_viewport_size({'width':width,'height':922});assert page.locator('.scrapbook-seal,.scrapbook-margin-note').count()==0
    assert 'let your hand tell the story' not in page.locator('body').inner_text()
    assert page.evaluate('document.documentElement.scrollWidth<=innerWidth+2')
    expect(page.locator('.scrapbook-art-caption')).to_be_visible()
   if theme=='dark':page.set_viewport_size({'width':1497,'height':922});page.screenshot(path=str(OUT/'clean-hero-dark.png'),full_page=True)
  RESULT.append('Hero seal and handwritten margin text removed from DOM; caption readable/no horizontal overflow at390/768/1497px light/dark.')
  page.set_viewport_size({'width':1440,'height':1000})
  page.goto(setup.URL,wait_until='networkidle')
  fixture=setup.recorded_fixture(int(time()*1000));fixture['profile']['name']='QA sample (synthetic)'
  page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',fixture)
  page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click()
  page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
  page.get_by_role('heading',name='Restyle your drawing',exact=True).wait_for(timeout=15000)
  data=page.locator('.pg-share-list li').all_inner_texts();assert len(data)==5
  assert 'not a psychological score' in page.locator('.process-guidance').inner_text().lower()
  assert 'Not page area or session time' in page.locator('.process-guidance').inner_text()
  assert '22 retained drawing strokes' in page.locator('.pg-coverage').inner_text()
  page.get_by_role('button',name='Make my next-step plan',exact=True).click();assert page.evaluate('document.activeElement.closest(".discovery-activities")!==null')
  path,partial=download_pdf(page,'designed-report-partial.pdf')
  assert 'not described' in partial.lower() or 'not chosen' in partial.lower() or 'not confirmed' in partial.lower()
  setup.composition_checks(page)
  setup.activity_checks(page,fixture)
  # Remount resets scene; deliberately make a final artist-confirmed expression and shelter, using the current activity record.
  page.get_by_role('button',name='Confirm detail: Expression',exact=True).click()
  page.locator('select[data-scene-field="expression"]').select_option('smiling');page.locator('select[data-scene-field="umbrella"]').select_option('covering')
  path,complete=download_pdf(page,'designed-report-complete.pdf')
  for text in ['Calm','Hopeful','#53718a','#f6d58a','drink a glass of water']:assert text.lower() in complete.lower(),text
  assert 'Smiling' in complete or 'smiling' in complete
  assert '3/3' in complete or '3 of 3' in complete
  info=subprocess.check_output(['pdfinfo',str(path)],text=True);print(info)
  page.locator('.process-guidance').screenshot(path=str(OUT/'process-guidance-dark.png'))
  RESULT.append('Actual partial and completed multi-page PDFs download via live end-of-report button; include selectable text, confirmed scene, latest feeling-colour links and chosen water plan.')
  # Force storage writes to fail: PDF must still include current in-memory choices, not stale saved values.
  page.evaluate('()=>{Storage.prototype.setItem=function(){throw new Error("QA blocked")}}')
  activity=page.locator('.discovery-activities');activity.get_by_role('button',name='Feeling cloud',exact=False).first.click()
  activity.get_by_role('button',name='Worried',exact=True).click()
  _,blocked=download_pdf(page,'designed-report-blocked-storage.pdf');assert 'Worried' in blocked
  RESULT.append('Storage-blocked PDF still includes freshly chosen Worried from memory; no dependency on provider or saved choices.')
  # A second untouched browser document checks empty records and unsupported display characters.
  empty_page=browser.new_page(accept_downloads=True)
  empty_page.goto(setup.URL,wait_until='networkidle');empty=setup.recorded_fixture(int(time()*1000));empty['strokes']=[];empty['fillOps']=[];empty['profile']['name']='\u6d4b\u8bd5 \U0001f327 '+('Long title ' * 20)
  empty_page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',empty)
  empty_page.reload(wait_until='networkidle');empty_page.get_by_role('button',name='Resume saved drawing').click();empty_page.get_by_role('button',name='Submit',exact=True).click();empty_page.get_by_role('button',name='Yes, collect it').click()
  empty_page.get_by_role('heading',name='Your personal reflection report',exact=True).wait_for(timeout=15000)
  _,blank=download_pdf(empty_page,'designed-report-empty-unicode.pdf');assert 'n/a' in blank and 'NaN' not in blank and 'Infinity' not in blank
  RESULT.append('Actual empty-record report downloads with n/a timing shares and safe long/Unicode title display, no false numbers.')
  failure_page=browser.new_page(accept_downloads=True,service_workers='block');setup.enter_report(failure_page)
  failure_page.route('**/assets/reflection-pdf-*.js',lambda route:route.abort())
  failure_page.get_by_role('button',name='Download reflection report PDF',exact=True).click()
  expect(failure_page.locator('.report-export-error')).to_contain_text('Report could not be prepared',timeout=10000)
  expect(failure_page.get_by_role('button',name='Download reflection report PDF',exact=True)).to_be_enabled()
  RESULT.append('A failed lazy-loaded PDF module displays an explicit error and re-enables retry; no fake-success download.')
  assert not errors,errors
  assert not any('gen.pollinations.ai' in u for u in network),network
  (OUT/'designed-report-results.json').write_text(json.dumps(RESULT,indent=2));print(json.dumps(RESULT,indent=2));browser.close()
finally:setup.server.shutdown()
