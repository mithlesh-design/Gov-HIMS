const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
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
  // Nurse completes discharge clearance for Kiran (Cardiac Care)
  await selectRole(page, null, 'Nurse', 'Ward Dashboard')
  await clickMaybe(page, 'Discharge', 'button'); await sleep(700)
  const n = await tickDialogChecks(page); await sleep(300)
  await clickInDialog(page, 'Clear &'); await sleep(900)
  console.log('nurse cleared (checklist items', n, '):', await has(page, 'discharge desk'))

  // Discharge desk receives the patient with nursing cleared (SPA preserves store)
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Operations', 'Discharge', 'Discharge Queue')
  await sleep(800)
  console.log('discharge desk shows Kiran Patil (routed by nurse):', await has(page, 'Kiran Patil'))
  await shot('discharge-desk-received')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
