const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return true } await sleep(200) } throw new Error('nav not found: ' + label) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
const setSelect = (page, sel, val) => page.evaluate((sel, val) => { const el = document.querySelector(sel); if (!el) return false; const set = Object.getOwnPropertyDescriptor(window.HTMLSelectElement.prototype, 'value').set; set.call(el, val); el.dispatchEvent(new Event('change', { bubbles: true })); return true }, sel, val)
const tickDialogChecks = (page) => page.evaluate(() => { const d = document.querySelector('[role=dialog]'); if (!d) return 0; const cs = [...d.querySelectorAll('input[type=checkbox]')]; cs.forEach(c => { if (!c.checked) c.click() }); return cs.length })
const clickInDialog = (page, t) => page.evaluate((t) => { const d = document.querySelector('[role=dialog]'); if (!d) return false; const b = [...d.querySelectorAll('button')].find(x => (x.textContent || '').includes(t) && !x.disabled); if (b) { b.click(); return true } return false }, t)
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

  // M1: shift banner + ward scoping
  console.log('shift banner (Morning shift):', await has(page, 'Morning shift'))
  console.log('assigned ward Cardiac Care:', await has(page, 'Cardiac Care'))
  console.log('ward-scoped: Kiran (Cardiac Care) shown:', await has(page, 'Kiran Patil'))
  console.log('ward-scoped: Sunita (ICU) hidden by default:', !(await has(page, 'Sunita Devi')))
  await shot('nv3-dashboard')
  await setSelect(page, '#ward-switcher', 'ICU'); await sleep(900)
  console.log('after switch → ICU shows Sunita:', await has(page, 'Sunita Devi'))
  console.log('after switch → Kiran hidden:', !(await has(page, 'Kiran Patil')))
  await shot('nv3-ward-switched')
  await setSelect(page, '#ward-switcher', 'Cardiac Care'); await sleep(700)

  // M4: doctor orders clarity + notify
  await navClick(page, 'Doctor Orders'); await sleep(1200)
  console.log('order shows requesting doctor:', await has(page, 'Ordered by Dr. Priya Nair'))
  console.log('order shows Mark done:', await has(page, 'Mark done'))
  await shot('nv3-orders')
  await clickMaybe(page, 'Mark done', 'button'); await sleep(1000)

  // M3: handover two-sided
  await navClick(page, 'Handover Brief'); await sleep(1200)
  console.log('incoming handover present:', await has(page, 'Incoming handover'))
  console.log('can receive handover:', await has(page, 'Receive'))
  await clickMaybe(page, 'Receive & acknowledge', 'button'); await sleep(800)
  console.log('handover log shows received:', await has(page, 'received'))
  await clickMaybe(page, 'Sign & hand over', 'button'); await sleep(800)
  console.log('handover log shows signed:', await has(page, 'signed'))
  await shot('nv3-handover')

  // M5: discharge clearance
  await navClick(page, 'Ward Dashboard'); await sleep(1000)
  await clickMaybe(page, 'Discharge', 'button'); await sleep(700)
  console.log('nursing clearance modal open:', await has(page, 'Nursing discharge clearance'))
  const n = await tickDialogChecks(page); await sleep(300)
  console.log('clearance checklist items:', n)
  await clickInDialog(page, 'Clear &'); await sleep(900)
  console.log('discharge toast (sent to discharge desk):', await has(page, 'discharge desk'))
  await shot('nv3-discharge')

  // M6: nurse AI assistant
  await navClick(page, 'AI Assistant'); await sleep(1200)
  console.log('nursing copilot loaded:', await has(page, 'Nursing Copilot') || await has(page, 'nursing copilot'))
  await clickMaybe(page, 'Which rounds are due?', 'button'); await sleep(1200)
  console.log('AI gave a grounded answer:', await has(page, 'round') || await has(page, 'No rounds'))
  await shot('nv3-ai')

  // doctor notified of completed order (cross-portal)
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, null, 'Doctor', 'OPD Consultations')
  await clickAria(page, 'Notifications'); await sleep(700)
  console.log('doctor bell shows Order completed:', await has(page, 'Order completed'))
  await shot('nv3-doctor-bell')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
