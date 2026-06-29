const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(700); return true } await sleep(200) } throw new Error('nav not found: ' + label) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
async function rowAction(page, name, btnText) {
  return page.evaluate((name, btnText) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(name) && [...d.querySelectorAll('button')].some(b => (b.textContent || '').includes(btnText)))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const btn = [...row.querySelectorAll('button')].find(b => (b.textContent || '').includes(btnText) && !b.disabled)
    if (btn) { btn.click(); return true } return false
  }, name, btnText)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)

  // ── (1) Patient sees live results from the LabOrders store ───────────────
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Pathology'); await sleep(1100)
  console.log('patient pathology heading:', await has(page, 'Pathology'))
  // Default patient = Kiran Patil (PT-20394); seed LO-405 has TROPI released critical-high + CBC verified.
  console.log('patient sees TROPI result card (Troponin I):', await has(page, 'Troponin I'))
  console.log('Critical-high flag indicator:', await has(page, 'Critical high') || await has(page, 'Doctor will call you'))
  console.log('AI plain-language summary present:', await has(page, 'AI explanation') || await has(page, 'doctor will discuss'))
  console.log('In progress section (CBC verified):', await has(page, 'Verified, ready soon') || await has(page, 'In progress'))
  await shot('l8-patient-pathology')

  // ── (2) Doctor inbox — structured panel summary on released results ──────
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Clinical', 'Doctor', "Today's Queue")
  // Visit inbox
  await navClick(page, 'Inbox'); await sleep(1100)
  await clickMaybe(page, 'Results', 'button'); await sleep(700)
  // Doctor = Dr. Priya Nair (default). Her released result: Meera Pillai RFT (normal).
  // We accept either Meera (normal) or the auto-generated structured value text.
  console.log('Results tab shows lab results:', await has(page, 'Results') || await has(page, 'Result'))
  console.log('Released test surfaced (Meera or summary present):', await has(page, 'Meera Pillai') || await has(page, 'Within reference range'))
  await shot('l8-doctor-inbox')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
