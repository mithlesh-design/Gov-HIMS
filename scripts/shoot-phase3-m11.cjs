const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true }; return false
  }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) {
  for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) }
  throw new Error('not found: ' + text)
}
async function setField(page, sel, text) {
  await page.evaluate((s, t) => {
    const el = document.querySelector(s)
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, t)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, sel, text); await sleep(200)
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
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(900)

  await setField(page, 'input[placeholder^="E.g. Acute Viral"]', 'Stable angina — observation')
  await setField(page, 'textarea[placeholder^="Enter findings"]', 'Patient reports chest tightness improving since admission, no breathlessness at rest, tolerating oral intake. Plan continue aspirin and statin, repeat troponin in the morning.')
  await shot('p3-m11-notes')

  await clickMaybe(page, 'Structure (SOAP)', 'button'); await sleep(800)
  const soap = await page.evaluate(() => (document.querySelector('textarea[placeholder^="Enter findings"]') || {}).value || '')
  console.log('SOAP structured?', soap.includes('S (Subjective)') && soap.includes('P (Plan)'))
  await shot('p3-m11-soap')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
