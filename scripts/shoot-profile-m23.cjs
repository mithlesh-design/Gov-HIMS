const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return } await sleep(200) } throw new Error('nav not found: ' + label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
const setByPlaceholder = (page, ph, val) => page.evaluate((ph, val) => { const el = [...document.querySelectorAll('input,textarea')].find(e => e.placeholder === ph); if (!el) return false; const s = Object.getOwnPropertyDescriptor((el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement : window.HTMLInputElement).prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return true }, ph, val)
const setBySelector = (page, sel, val) => page.evaluate((sel, val) => { const el = document.querySelector(sel); if (!el) return false; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return true }, sel, val)
const setSelectByOption = (page, ov) => page.evaluate((ov) => { const sel = [...document.querySelectorAll('select')].find(s => [...s.options].some(o => o.value === ov)); if (!sel) return false; const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; set.call(sel, ov); sel.dispatchEvent(new Event('change', { bubbles: true })); return true }, ov)
const setVal = (page, id, val) => page.evaluate((id, val) => { const el = document.querySelector('#' + id); if (!el) return false; const s = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; s.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return true }, id, val)
async function chipAdd(page, placeholder, value) {
  await page.evaluate(ph => { const el = [...document.querySelectorAll('input')].find(e => e.placeholder === ph); if (el) el.focus() }, placeholder)
  await page.keyboard.type(value); await sleep(120); await page.keyboard.press('Enter'); await sleep(150)
}
const clickInDialog = (page, t) => page.evaluate((t) => { const d = document.querySelector('[role=dialog]'); if (!d) return false; const b = [...d.querySelectorAll('button')].find(x => (x.textContent || '').includes(t) && !x.disabled); if (b) { b.click(); return true } return false }, t)
async function next(page) { await clickInDialog(page, 'Next'); await sleep(500) }
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, null, 'Nurse', 'Ward Dashboard')

  // Ward gating: Kiran complete (quick) vs Sunita incomplete (wizard)
  console.log('ward: Kiran shows "Update Vitals" (profile complete):', await has(page, 'Update Vitals'))
  console.log('ward: incomplete patient shows "Complete profile":', await has(page, 'Complete profile'))

  // OPD first-visit wizard (Nalini, in vitals queue, no profile)
  await navClick(page, 'Vitals Requests'); await sleep(1200)
  console.log('OPD button is "Complete profile & vitals":', await has(page, 'Complete profile'))
  await clickMaybe(page, 'Complete profile', 'button'); await sleep(800)
  console.log('wizard opened (Step 1 of 6):', await has(page, 'Step 1 of 6'))
  await shot('profile-wizard-step1')

  // Step 1 — identity
  await setByPlaceholder(page, 'House, street, area', '5 MG Road, Camp')
  await setByPlaceholder(page, 'City', 'Pune')
  await next(page)
  // Step 2 — emergency contact
  await setByPlaceholder(page, 'Full name', 'Ramesh Kumar')
  await setBySelector(page, 'input[type=tel]', '+91 90000 00000')
  await setSelectByOption(page, 'Spouse')
  await next(page)
  // Step 3 — clinical + AI allergy↔med conflict
  await setSelectByOption(page, 'AB+')
  await chipAdd(page, 'e.g. Penicillin', 'Penicillin')
  await chipAdd(page, 'e.g. Metformin 500mg', 'Amoxicillin')
  await sleep(400)
  console.log('AI allergy↔med conflict flagged:', await has(page, 'AI allergy check') || await has(page, 'contraindicated'))
  await shot('profile-wizard-clinical')
  await next(page)
  // Step 4 — lifestyle + BMI band
  await setByPlaceholder(page, '170', '170')
  await setByPlaceholder(page, '70', '70')
  await sleep(300)
  console.log('BMI band computed:', await has(page, 'BMI:') && (await has(page, 'Normal') || await has(page, 'Overweight')))
  await next(page)
  // Step 5 — vitals (core required)
  await setVal(page, 'vital-hr', '82'); await setVal(page, 'vital-sys', '124'); await setVal(page, 'vital-dia', '80')
  await setVal(page, 'vital-rr', '16'); await setVal(page, 'vital-spo2', '98'); await setVal(page, 'vital-temp', '98.6')
  await sleep(300)
  await next(page)
  // Step 6 — review
  console.log('AI risk snapshot present:', await has(page, 'NEWS 0 (low)') || await has(page, 'allergy/med conflict'))
  console.log('profile complete (gating cleared):', await has(page, 'ready to send to the doctor') || await has(page, 'Profile complete'))
  await shot('profile-wizard-review')
  await clickInDialog(page, 'Complete profile'); await sleep(1400)
  console.log('Nalini advanced (queue now empty):', await has(page, 'No vitals requests'))
  await shot('profile-after-complete')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
