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
  console.log('ward shows shared patients (Sunita Devi):', await has(page, 'Sunita Devi'))
  console.log('old ward roster gone (no Ramesh Kumar):', !(await has(page, 'Ramesh Kumar')))
  await shot('nurse-m1-ward')

  // Update vitals on the first ward card (Kiran Patil)
  await clickMaybe(page, 'Update Vitals', 'button'); await sleep(600)
  await page.evaluate(() => { const el = document.querySelector('#vital-hr'); const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(el, '118'); el.dispatchEvent(new Event('input', { bubbles: true })) })
  await sleep(200)
  await clickMaybe(page, 'Save Vitals', 'button'); await sleep(900)

  // Switch to doctor → Kiran chart timeline shows the nurse vitals event
  await clickAria(page, 'Log out'); await sleep(1200)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await page.goto(`${BASE}/doctor/ipd/PT-20394`, { waitUntil: 'networkidle2' }); await sleep(2000)
  await clickMaybe(page, 'Timeline', 'button'); await sleep(700)
  console.log('nurse vitals event on doctor chart:', await has(page, 'Vitals recorded'))
  await shot('nurse-m1-doctor-timeline')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
