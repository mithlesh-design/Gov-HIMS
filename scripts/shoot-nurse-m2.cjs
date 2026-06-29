const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) } throw new Error('not found: ' + text) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function setVal(page, id, val) {
  return page.evaluate((id, val) => {
    const el = document.querySelector('#' + id)
    if (!el) return false
    const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype
    const set = Object.getOwnPropertyDescriptor(proto, 'value').set
    set.call(el, val)
    el.dispatchEvent(new Event('input', { bubbles: true }))
    el.dispatchEvent(new Event('change', { bubbles: true }))
    return true
  }, id, val)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Nurse', 'button'); await sleep(2500)

  // Distinct vitals across patients (no longer all-identical 78/124-80)
  console.log('Sunita tachycardic vitals present (116 bpm):', await has(page, '116 bpm'))
  console.log('Kiran distinct vitals present (88 bpm):', await has(page, '88 bpm'))
  console.log('NEWS chips rendered:', await has(page, 'NEWS'))
  console.log('AI alert for Sunita Devi:', await has(page, 'Sunita Devi'))
  await shot('nurse-m2-ward')

  // Open the comprehensive vitals form on the first card (Kiran Patil)
  await clickMaybe(page, 'Update Vitals', 'button'); await sleep(700)
  console.log('comprehensive form open (Record Vitals):', await has(page, 'Record Vitals'))
  console.log('form has expanded fields (Resp. rate):', await has(page, 'Resp. rate'))
  console.log('form has glucose field:', await has(page, 'Blood glucose'))
  console.log('form has AVPU field:', await has(page, 'Consciousness'))

  // Enter a deteriorating set → live NEWS should go HIGH with anomaly flags
  await setVal(page, 'vital-hr', '135')
  await setVal(page, 'vital-sys', '85')
  await setVal(page, 'vital-dia', '50')
  await setVal(page, 'vital-rr', '28')
  await setVal(page, 'vital-spo2', '88')
  await setVal(page, 'vital-temp', '103.5')
  await setVal(page, 'vital-glu', '320')
  await sleep(500)
  console.log('live NEWS band HIGH:', await has(page, 'HIGH'))
  console.log('anomaly: severe tachycardia:', await has(page, 'Severe tachycardia'))
  console.log('anomaly: hypotension:', await has(page, 'Hypotension'))
  console.log('anomaly: hypoxaemia:', await has(page, 'hypoxaemia'))
  console.log('anomaly: high fever:', await has(page, 'High fever'))
  await shot('nurse-m2-vitals-form')

  await clickMaybe(page, 'Save Vitals', 'button'); await sleep(1000)

  // Doctor chart timeline reflects the comprehensive vitals + NEWS
  await clickAria(page, 'Log out'); await sleep(1200)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await page.goto(`${BASE}/doctor/ipd/PT-20394`, { waitUntil: 'networkidle2' }); await sleep(2000)
  await clickMaybe(page, 'Timeline', 'button'); await sleep(700)
  console.log('doctor chart shows NEWS-scored vitals event:', await has(page, 'Vitals recorded · NEWS'))
  console.log('doctor chart shows RR in detail:', await has(page, 'RR 28'))
  await shot('nurse-m2-doctor-timeline')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
