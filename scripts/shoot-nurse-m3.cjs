const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
// NOTE: never page.goto after the first load — the OPD queue + auth role live in
// non-persisted stores; a full reload resets them. Navigate via SPA clicks only.
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return } await sleep(200) } throw new Error('nav not found: ' + label) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
const indexOf = (page, t) => page.evaluate((x) => document.body.innerText.indexOf(x), t)
const roleVisible = (page, role) => page.evaluate((r) => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes(r) && (b.textContent || '').length < 140), role)
async function clickSendForVitals(page, name) {
  return page.evaluate((name) => {
    const btns = [...document.querySelectorAll('button')].filter(b => (b.textContent || '').replace(/\s+/g, ' ').includes('Send to Vitals'))
    for (const b of btns) { let el = b; for (let i = 0; i < 8 && el; i++) { el = el.parentElement; if (el && (el.textContent || '').includes(name)) { b.click(); return true } } }
    return false
  }, name)
}
async function setVal(page, id, val) {
  return page.evaluate((id, val) => {
    const el = document.querySelector('#' + id); if (!el) return false
    const proto = el.tagName === 'SELECT' ? window.HTMLSelectElement.prototype : window.HTMLInputElement.prototype
    const set = Object.getOwnPropertyDescriptor(proto, 'value').set
    set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); el.dispatchEvent(new Event('change', { bubbles: true })); return true
  }, id, val)
}
// SPA login: from the landing page, switch tab if needed, click the role card.
async function selectRole(page, tab, role) {
  for (let i = 0; i < 40; i++) { if (tab) await clickMaybe(page, tab, 'button'); await sleep(200); if (await roleVisible(page, role)) break }
  for (let i = 0; i < 30; i++) { if (await clickMaybe(page, role, 'button')) break; await sleep(200) }
  await sleep(2200)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(1500)

  // 1) Reception: send HIGH-acuity Kiran Patil for vitals (SPA nav)
  await selectRole(page, 'Operations', 'Reception')
  await navClick(page, 'OPD Queue'); await sleep(1800)
  const sent = await clickSendForVitals(page, 'Kiran Patil'); await sleep(900)
  console.log('reception is on OPD Queue (kanban):', await has(page, 'Send to Vitals') || await has(page, 'Send to Doctor'))
  console.log('reception sent Kiran for vitals:', sent)
  await shot('nurse-m3-reception')

  // 2) Nurse: Vitals Requests queue + bell notification (SPA nav)
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, null, 'Nurse')
  await navClick(page, 'Vitals Requests'); await sleep(1200)
  console.log('queue shows Kiran Patil:', await has(page, 'Kiran Patil'))
  console.log('queue shows Nalini Kumar (already in vitals):', await has(page, 'Nalini Kumar'))
  const iK = await indexOf(page, 'Kiran Patil'), iN = await indexOf(page, 'Nalini Kumar')
  console.log('acuity order (High Kiran before Low Nalini):', iK > -1 && iN > -1 && iK < iN)
  await clickAria(page, 'Notifications'); await sleep(700)
  console.log('nurse bell has Vitals requested notification:', await has(page, 'Vitals requested'))
  await shot('nurse-m3-queue')
  await page.keyboard.press('Escape'); await sleep(300)

  // 3) Nurse records vitals on Kiran → advances to consulting
  await navClick(page, 'Vitals Requests'); await sleep(600)
  await clickSendForVitals(page, 'Kiran Patil').catch(() => {})
  await clickMaybe(page, 'Record Vitals', 'button'); await sleep(800)
  console.log('vitals form open:', await has(page, 'Record Vitals'))
  await setVal(page, 'vital-hr', '82'); await setVal(page, 'vital-sys', '124'); await setVal(page, 'vital-dia', '80')
  await setVal(page, 'vital-rr', '16'); await setVal(page, 'vital-spo2', '98'); await setVal(page, 'vital-temp', '98.6')
  await sleep(400)
  await clickMaybe(page, 'Save Vitals', 'button'); await sleep(1200)
  console.log('Kiran left the vitals queue:', !(await has(page, 'Kiran Patil')))
  console.log('Nalini still in queue:', await has(page, 'Nalini Kumar'))
  await shot('nurse-m3-after-record')

  // 4) Doctor: Kiran now in the consulting queue (SPA nav)
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, null, 'Doctor')
  await navClick(page, 'OPD Consultations'); await sleep(1500)
  const kIdx = await indexOf(page, 'Kiran Patil')
  const consultIdx = await page.evaluate(() => document.body.innerText.indexOf('consulting'))
  console.log('doctor OPD shows Kiran Patil:', kIdx > -1)
  await shot('nurse-m3-doctor-opd')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
