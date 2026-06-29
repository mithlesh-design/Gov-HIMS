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
// Click a button (by visible text) inside the smallest row/card that contains `name`.
async function rowAction(page, name, btnText) {
  return page.evaluate((name, btnText) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(name) && [...d.querySelectorAll('button')].some(b => (b.textContent || '').includes(btnText)))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const btn = [...row.querySelectorAll('button')].find(b => (b.textContent || '').includes(btnText) && !b.disabled)
    if (btn) { btn.click(); return true } return false
  }, name, btnText)
}
// Click an icon-only stepper button (svg.lucide-<icon>) inside the row for `name`.
async function rowIconBtn(page, name, icon) {
  return page.evaluate((name, icon) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(name) && d.querySelector('svg.lucide-' + icon))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const btn = [...row.querySelectorAll('button')].find(b => b.querySelector('svg.lucide-' + icon) && !b.disabled)
    if (btn) { btn.click(); return true } return false
  }, name, icon)
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
  await selectRole(page, null, 'Pharmacy', 'Prescription Queue')

  // Land on the Queue
  await navClick(page, 'Prescription Queue'); await sleep(1200)
  console.log('queue: one-row patients (Meera):', await has(page, 'Meera Pillai'))
  console.log('queue: Kiran (OPD, unclaimed):', await has(page, 'Kiran Patil'))
  console.log('queue: source tags ICU + Discharge:', (await has(page, 'ICU')) && (await has(page, 'Discharge')))
  console.log('queue: payment mode shows (UPI/Credit):', (await has(page, 'UPI')) || (await has(page, 'Credit')))
  console.log('queue: out-of-stock flag:', await has(page, 'not in stock'))
  await shot('v3-queue')

  // Multi-pharmacist claim: accept Kiran onto my counter
  console.log('accept Kiran:', await rowAction(page, 'Kiran Patil', 'Accept')); await sleep(700)
  console.log('after accept → your counter:', await has(page, 'your counter'))

  // Expand Kiran, raise PO for the out-of-stock line, edit a qty down
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(600)
  console.log('expanded shows ₹/unit + steppers:', await has(page, '/unit'))
  console.log('order from inventory manager:', await rowAction(page, 'Kiran Patil', 'Order from inventory manager')); await sleep(600)
  console.log('PO raised badge:', await has(page, 'PO RAISED'))
  const before = await page.evaluate(() => document.body.innerText)
  console.log('decrement qty (minus):', await rowIconBtn(page, 'Kiran Patil', 'minus')); await sleep(500)
  console.log('qty adjusted note:', await has(page, 'Adjusted from'))
  await shot('v3-queue-expanded')

  // Mark ready (patient notified) then collected (record collector)
  console.log('mark ready:', await rowAction(page, 'Kiran Patil', 'Mark ready')); await sleep(800)
  console.log('mark collected (opens picker):', await rowAction(page, 'Kiran Patil', 'Mark collected')); await sleep(600)
  console.log('collector picker shows:', await has(page, 'Collected by:'))
  console.log('confirm collect:', await rowAction(page, 'Kiran Patil', 'Confirm')); await sleep(900)

  // Collected tab: audit record present
  await clickMaybe(page, 'Collected (', 'button'); await sleep(800)
  console.log('collected tab has Kiran:', await has(page, 'Kiran Patil'))
  console.log('collected tab seed (Sanjay Gupta):', await has(page, 'Sanjay Gupta'))
  // Ensure Kiran's collected row is expanded (expandedId may persist across tabs → toggle as needed)
  for (let i = 0; i < 3 && !(await has(page, 'Dispensed by')); i++) { await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(500) }
  console.log('collected audit (Dispensed by / Collected by):', (await has(page, 'Dispensed by')) && (await has(page, 'Collected by')))
  await shot('v3-collected')

  // M3: Purchase Orders inbox in Inventory (Amoxicillin PO was raised from the queue above)
  await navClick(page, 'Inventory'); await sleep(1100)
  console.log('inventory PO inbox heading:', await has(page, 'Purchase Orders'))
  console.log('PO from queue (Amoxicillin 250mg):', await has(page, 'Amoxicillin 250mg'))
  console.log('PO seed (Heparin):', await has(page, 'Heparin'))
  console.log('mark Amoxicillin PO ordered:', await rowAction(page, 'Amoxicillin 250mg', 'Mark ordered')); await sleep(600)
  console.log('mark Amoxicillin PO received:', await rowAction(page, 'Amoxicillin 250mg', 'Mark received')); await sleep(700)
  console.log('PO now Received:', await has(page, 'Received'))
  await shot('v3-inventory')

  // M4: AI-generated Drug Master (read-only, no manual entry)
  await navClick(page, 'Drug Master'); await sleep(1000)
  console.log('drug master AI-generated badge:', await has(page, 'AI-generated'))
  console.log('drug master auto-maintained note:', await has(page, 'Maintained automatically by AI'))
  console.log('drug master no manual entry:', await has(page, 'No manual entry') || await has(page, 'never edit'))
  console.log('drug master lists drugs (Morphine):', await has(page, 'Morphine'))
  console.log('re-sync with AI:', await clickMaybe(page, 'Re-sync with AI', 'button')); await sleep(1400)
  console.log('re-sync confirmed (synced just now):', await has(page, 'just now'))
  await shot('v3-master')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
