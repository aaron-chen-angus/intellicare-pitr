"""Illustrative PDF preview: existing example art + clearly synthetic records, never a clinical case."""
from pathlib import Path
from io import BytesIO
import base64,json
from PIL import Image
from playwright.sync_api import sync_playwright
import interactive_report_smoke as setup

def image_data(file):
 with Image.open(file) as img:
  rgb=img.convert('RGB');buffer=BytesIO();rgb.save(buffer,'PNG')
 return 'data:image/png;base64,'+base64.b64encode(buffer.getvalue()).decode()

root=setup.ROOT
fixture=setup.recorded_fixture(1700000000000)
activity=json.loads((setup.OUT/'interactive-choices.json').read_text())
activity['title']='Illustrative choices (synthetic)'
# Personal-palette labels avoid falsely claiming these example matches were extracted from the displayed art.
for match in activity['colourLinks']:match['source']='personal'
input_data={
 'originalImage':image_data(root/'public/restyle/original.webp'),
 'styledArtwork':{'image':image_data(root/'public/restyle/anime.webp'),'styleName':'Anime · example artwork'},
 'title':'Illustrative sample · synthetic records',
 'startTime':fixture['startTime'],'timeUsedSeconds':100,'undoCount':0,
 'strokes':fixture['strokes'],'fills':fixture.get('fillOps',[]),
 'scene':{'expression':'neutral','posture':'upright','umbrella':'covering','rain':'moderate','extras':['none'],'figure':{'size':'medium','position':'center'}},
 'activity':activity,'release':'2026.11.13-report-2',
}
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox'])
  page=browser.new_page(accept_downloads=True,service_workers='block')
  page.goto('http://127.0.0.1:3000/',wait_until='networkidle')
  # The same renderer source as the compiled app, using its stable named dev export.
  # Production RollDown chunk internals are verified separately through the real app button.
  with page.expect_download(timeout=60000) as event:
   page.evaluate('''async (input)=>{const {createReflectionPdf}=await import('./src/report/reflection-pdf.ts');const pdf=await createReflectionPdf(input);pdf.save('rainandme-premium-report-sample.pdf')}''',input_data)
  target=Path('/home/ubuntu/rainandme-premium-report-sample.pdf');event.value.save_as(target)
  assert target.read_bytes().startswith(b'%PDF-')
  print(str(target));browser.close()
finally:setup.server.shutdown()
