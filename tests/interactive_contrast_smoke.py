"""Focused new-surface contrast/state validation, not another full app acceptance pass."""
import json
from playwright.sync_api import sync_playwright
import interactive_report_smoke as setup
from pathlib import Path

def lum(rgb):
 values=[c/255 for c in rgb];values=[v/12.92 if v<=.04045 else ((v+.055)/1.055)**2.4 for v in values]
 return sum(v*w for v,w in zip(values,[.2126,.7152,.0722]))
try:
 with sync_playwright() as p:
  browser=p.chromium.launch(headless=True,args=['--no-sandbox']);page=browser.new_page(viewport={'width':1024,'height':900})
  fixture=setup.enter_report(page)
  page.get_by_role('button',name='Confirm detail: Figure / composition',exact=True).click()
  results=[]
  for theme in ['light','dark']:
   page.evaluate('(t)=>document.documentElement.dataset.theme=t',theme)
   pairs=page.evaluate('''()=>{
    const c=document.createElement('canvas');c.width=c.height=1;const ctx=c.getContext('2d');
    const rgba=v=>{ctx.clearRect(0,0,1,1);ctx.fillStyle=v;ctx.fillRect(0,0,1,1);return Array.from(ctx.getImageData(0,0,1,1).data)};
    const background=e=>{let layers=[];for(let n=e;n;n=n.parentElement){const a=rgba(getComputedStyle(n).backgroundColor);if(a[3]>0)layers.push(a);if(a[3]===255)break;}let out=[255,255,255];for(const a of layers.reverse()){const alpha=a[3]/255;out=out.map((v,i)=>a[i]*alpha+v*(1-alpha))}return out};
    return Array.from(document.querySelectorAll('.rm-composition-help,.rm-composition-confirmed,.rm-position-choice span,.bulk-help,.bulk-heading p,.bulk-selection-summary span,.discovery-activities>p,.da-note,.da-cloud-word,.da-plan p,.da-keepsake h3,.da-preview-status')).filter(e=>e.getClientRects().length).map(e=>({text:e.textContent.slice(0,90),fg:rgba(getComputedStyle(e).color).slice(0,3),bg:background(e)}));
   }''')
   ratios=[]
   for pair in pairs:
    a,b=sorted([lum(pair['fg']),lum(pair['bg'])]);ratio=(b+.05)/(a+.05);assert ratio>=4.5,(theme,pair,ratio);ratios.append(ratio)
   results.append({'theme':theme,'minimumNewSurfaceTextContrast':round(min(ratios),2),'pairs':len(ratios)})
  # Malformed choice storage cannot become a false-complete activity or crash the report.
  activity_key='rainandme:discovery:v1:'+str(fixture['startTime'])
  page.evaluate('(k)=>localStorage.setItem(k,"not json")',activity_key)
  page.get_by_role('button',name='Draw again',exact=True).click()
  page.evaluate('(f)=>localStorage.setItem("rain-and-me-session-v1",JSON.stringify(f))',fixture);page.reload(wait_until='networkidle');page.get_by_role('button',name='Resume saved drawing').click();page.get_by_role('button',name='Submit',exact=True).click();page.get_by_role('button',name='Yes, collect it').click()
  page.get_by_role('heading',name='Your feelings. Your colours. Your next step.',exact=True).wait_for(timeout=15000)
  assert '0/3' in page.locator('.da-progress').inner_text()
  results.append('Malformed stored activity JSON resets safely to0/3; no false completion.')
  (setup.OUT/'interactive-contrast-results.json').write_text(json.dumps(results,indent=2));print(json.dumps(results,indent=2));browser.close()
finally:setup.server.shutdown()
