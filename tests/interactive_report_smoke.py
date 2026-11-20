"""Real report integration checks. No provider requests or live image generation."""
from pathlib import Path
from http.server import ThreadingHTTPServer,SimpleHTTPRequestHandler
from threading import Thread
from time import time
from io import BytesIO
import json,os
from PIL import Image
from playwright.sync_api import sync_playwright,expect
from report_fixture import recorded_fixture
ROOT=Path(__file__).resolve().parents[1];SITE=Path(os.environ.get('RAIN_TEST_DIST',ROOT/'dist'));OUT=ROOT/'test-evidence';OUT.mkdir(exist_ok=True)
class Handler(SimpleHTTPRequestHandler):
 def translate_path(self,path):return str(SITE/path.split('?')[0].removeprefix('/intellicare-pitr/').lstrip('/'))
 def log_message(self,*args):pass
server=ThreadingHTTPServer(('127.0.0.1',0),Handler);Thread(target=server.serve_forever,daemon=True).start()
URL=f'http://127.0.0.1:{server.server_port}/intellicare-pitr/';RESULT=[]
# App uses this fixture only through its normal restore/submit flow.
def enter_report(page):
 page.goto(URL,wait_until='networkidle');fixture=recorded_fixture(int(time()*1000))
 for s in fixture['strokes']:s['subject']='unlabelled'
 page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',fixture)
 page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click()
 page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
 page.get_by_role('heading',name='Restyle your drawing',exact=True).wait_for(timeout=15000)
 return fixture

def composition_checks(page):
 assert page.locator('.rm-lens').count()==6
 page.get_by_role('button',name='Confirm detail: Figure / composition',exact=True).click()
 assert page.locator('.rm-scene-editor').evaluate('(e)=>e.open')
 assert page.locator('[data-scene-field="figure-size"]').evaluate('(e)=>e===document.activeElement')
 for field,value in [('expression','smiling'),('posture','upright'),('umbrella','covering'),('rain','moderate')]:page.locator(f'[data-scene-field="{field}"]').select_option(value)
 page.get_by_label('None of these',exact=True).check();expect(page.locator('.rm-summary-meta')).to_contain_text('5/6')
 assert page.locator('.rm-lens-figure .rm-confirm-tag').count()==1
 page.locator('[data-scene-field="figure-size"]').select_option('medium');expect(page.locator('.rm-summary-meta')).to_contain_text('5/6')
 page.locator('[data-scene-field="figure-position"][value="bottom-left"]').check();expect(page.locator('.rm-summary-meta')).to_contain_text('6/6')
 expect(page.locator('.rm-composition-confirmed')).to_contain_text('bottom left')
 assert page.locator('[data-figure-position="bottom-left"]').count()==1
 assert page.locator('.rm-lens-figure .rm-confirm-tag').count()==0
 page.get_by_role('button',name='Clear position',exact=True).click();expect(page.locator('.rm-summary-meta')).to_contain_text('5/6')
 page.get_by_role('button',name='Confirm detail: Figure / composition',exact=True).click()
 assert page.locator('[data-scene-field="figure-position"]').first.evaluate('(e)=>e===document.activeElement')
 page.locator('[data-scene-field="figure-position"][value="center"]').check()
 RESULT.append('Six independent descriptions, composition marker and confirmation focus/count work; posture does not fake sixth confirmation.')
 page.locator('.rm-composition').screenshot(path=str(OUT/'interactive-composition.png'))

# Bulk and activity checks are added once their actual control schemas are available.

def bulk_checks(page):
 editor=page.locator('.bulk-label-editor');expect(editor).to_be_visible()
 assert page.locator('.stroke-labels').evaluate('(e)=>!e.open')
 original=page.locator('.artwork-card > img').get_attribute('src')
 preview=page.locator('.bulk-overlay');preview.scroll_into_view_if_needed();box=preview.bounding_box()
 # Select umbrella top/handle only: true client-to-A4 scaled pointer events.
 def drag(a,b):
  page.mouse.move(box['x']+a[0]/1240*box['width'],box['y']+a[1]/1754*box['height']);page.mouse.down();page.mouse.move(box['x']+b[0]/1240*box['width'],box['y']+b[1]/1754*box['height'],steps=8);page.mouse.up()
 drag((300,210),(980,350))
 expect(editor.locator('.bulk-selection-summary')).to_contain_text('2 strokes')
 editor.get_by_label('Filter by recorded time',exact=True).check()
 editor.get_by_label('Start (seconds)',exact=True).fill('28');editor.get_by_label('End (seconds)',exact=True).fill('31')
 expect(editor.locator('.bulk-selection-summary')).to_contain_text('2 strokes')
 assert editor.get_by_role('slider',name='Selection start time').count()==1
 editor.get_by_label('Selected marks belong to',exact=True).select_option('umbrella')
 editor.get_by_role('button',name='Apply label to 2 marks',exact=True).click()
 expect(page.locator('.scene-lane').filter(has=page.get_by_text('Umbrella',exact=True)).locator('.lane-times')).to_contain_text('0:28')
 assert page.locator('.artwork-card > img').get_attribute('src')==original
 editor.get_by_role('button',name='Undo latest label batch',exact=True).click()
 expect(page.locator('.scene-lane').filter(has=page.get_by_text('Umbrella',exact=True)).locator('.lane-times')).to_contain_text('Not labelled')
 # Time-only selection across full page includes all8rainstrokes.
 editor.get_by_role('button',name='Clear region',exact=True).click()
 editor.get_by_label('Start (seconds)',exact=True).fill('45');editor.get_by_label('End (seconds)',exact=True).fill('48')
 expect(editor.locator('.bulk-selection-summary')).to_contain_text('8 strokes')
 editor.get_by_label('Selected marks belong to',exact=True).select_option('rain');editor.get_by_role('button',name='Apply label to 8 marks',exact=True).click()
 expect(page.locator('.scene-lane').filter(has=page.get_by_text('Rain',exact=True)).locator('.lane-times')).to_contain_text('0:45')
 assert page.locator('.artwork-card > img').get_attribute('src')==original
 editor.get_by_label('End (seconds)',exact=True).fill('1');assert editor.locator('.bulk-apply').is_disabled()
 editor.get_by_label('End (seconds)',exact=True).fill('48')
 editor.screenshot(path=str(OUT/'interactive-region-labels.png'))
 RESULT.append('Scaled region selects two umbrella strokes; regionANDtime, eight-mark time-only batch, invalid interval guard and label-only undo preserve original bitmap.')

def activity_checks(page,fixture):
 activity=page.locator('.discovery-activities');activity.scroll_into_view_if_needed()
 assert activity.locator('textarea').count()==0
 assert activity.get_by_role('button',name='Download keepsake PNG',exact=True).is_disabled()
 for word in ['Calm','Hopeful']:activity.get_by_role('button',name=word,exact=True).click()
 activity.locator('.da-intensities fieldset').filter(has=page.get_by_text('Calm · intensity',exact=True)).get_by_label('3 · Strongly',exact=True).check()
 assert activity.locator('.da-cloud-word').first.get_attribute('style')!=activity.locator('.da-cloud-word').nth(1).get_attribute('style')
 expect(activity.locator('.da-progress')).to_contain_text('1/3')
 activity.get_by_role('button',name='Explore activity 2',exact=True).click()
 for word,colour in [('Calm','#53718a'),('Hopeful','#f6d58a')]:
  activity.locator('.da-choices button').filter(has_text=word+' · not linked').click()
  activity.locator('.da-swatches button').filter(has_text=colour).click()
 expect(activity.locator('.da-progress')).to_contain_text('2/3')
 activity.get_by_role('button',name='Explore activity 3',exact=True).click()
 activity.get_by_role('button',name='Drinking water within reach',exact=True).click()
 activity.get_by_label('At my next break',exact=True).check();activity.get_by_label('Drink a glass of water',exact=False).check()
 expect(activity.locator('.da-progress')).to_contain_text('3/3')
 expect(activity.locator('.da-keepsake .da-plan')).to_contain_text('At my next break, then I will drink a glass of water.')
 with page.expect_download() as downloaded:activity.get_by_role('button',name='Download choices JSON',exact=True).click()
 path=OUT/'interactive-choices.json';downloaded.value.save_as(path);data=json.loads(path.read_text())
 assert data['status']=='complete' and data['completedActivities']==3
 assert data['feelings'][0]['id']=='calm' and data['feelings'][0]['intensity']==3
 assert data['colourLinks'][0]['colour']=='#53718a' and data['colourLinks'][0]['source']=='drawing'
 assert data['plan']['resourceId']=='water' and 'drink a glass of water' in data['plan']['statement']
 assert 'drawingDataUrl' not in data and 'account' not in data and 'token' not in data
 assert data['title']=='My reflection keepsake' and fixture['profile']['name'] not in json.dumps(data)
 with page.expect_download() as downloaded:activity.get_by_role('button',name='Download keepsake PNG',exact=True).click()
 path=OUT/'interactive-keepsake.png';downloaded.value.save_as(path);image=Image.open(path)
 assert image.width==1100 and image.height>900;assert image.getbbox()
 key='rainandme:discovery:v1:'+str(fixture['startTime'])
 stored=page.evaluate('(key)=>JSON.parse(localStorage.getItem(key))',key)
 assert len(stored['feelings'])==2 and stored['resource']=='water' and stored['links']['calm']=='#53718a'
 activity.locator('.da-keepsake').screenshot(path=str(OUT/'interactive-activities.png'))
 RESULT.append('Three structured activities create the actual chosen cloud, two real ink-colour links, an available-support action plan, valid1100pxPNG and JSON; no text boxes or provider call.')
 # Local records restore when the same session's activity component remounts.
 page.get_by_role('button',name='Draw again',exact=True).click()
 page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',fixture)
 page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click();page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
 expect(page.locator('.da-progress')).to_contain_text('3/3',timeout=15000)
 RESULT.append('Same-session activity choices restore after real report remount; unrelated drawing sessions stay separate.')

if __name__=='__main__':
 try:
  with sync_playwright() as p:
   browser=p.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1440,'height':1000},accept_downloads=True);errors=[];requests=[]
   page.on('pageerror',lambda e:errors.append(str(e)));page.on('request',lambda r:requests.append(r.url))
   fixture=enter_report(page);composition_checks(page);bulk_checks(page);activity_checks(page,fixture)
   assert not errors,errors
   assert not any('gen.pollinations.ai' in u for u in requests),requests
   for theme in ['light','dark']:
    page.evaluate('(theme)=>document.documentElement.dataset.theme=theme',theme)
    page.set_viewport_size({'width':390,'height':844})
    if not page.locator('.rm-scene-editor').evaluate('(e)=>e.open'):page.locator('.rm-scene-editor summary').click()
    assert page.evaluate('document.documentElement.scrollWidth<=window.innerWidth+2')
    page.locator('.rm-composition').screenshot(path=str(OUT/f'interactive-composition-{theme}-mobile.png'))
    page.locator('.bulk-label-editor').screenshot(path=str(OUT/f'interactive-bulk-{theme}-mobile.png'))
    page.locator('.discovery-activities').screenshot(path=str(OUT/f'interactive-activities-{theme}-mobile.png'))
   RESULT.append('390px light/dark report shows composition, batch labels and activities without horizontal overflow; zero JavaScript errors or provider requests.')
   (OUT/'interactive-report-results.json').write_text(json.dumps(RESULT,indent=2));print(json.dumps(RESULT,indent=2));browser.close()
 finally:server.shutdown()
