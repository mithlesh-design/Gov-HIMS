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

  // 1) Pharmacy Queue → substitute Kiran's out-of-stock Amoxicillin
  await selectRole(page, null, 'Pharmacy', 'Prescription Queue')
  await navClick(page, 'Prescription Queue'); await sleep(1200)
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(700) // expand
  console.log('substitute button shows count:', await has(page, 'Substitute ('))
  console.log('click Substitute:', await rowAction(page, 'Kiran Patil', 'Substitute (')); await sleep(600)
  console.log('picker shows alternatives in stock:', (await has(page, 'Amoxicillin 500mg')) && (await has(page, 'Azithromycin 500mg')))
  console.log('pick Amoxicillin 500mg:', await rowAction(page, 'Kiran Patil', 'Amoxicillin 500mg')); await sleep(800)
  console.log('substituted badge on line:', await has(page, 'substituted ← Amoxicillin 250mg'))
  await shot('n-queue-substituted')

  // 2) Pharmacy Inventory → request-only · request restock for a low item
  await navClick(page, 'Inventory'); await sleep(1100)
  console.log('inventory ownership banner:', await has(page, 'Stock is managed by the Inventory Manager'))
  console.log('PO inbox is read-only (no Mark ordered button on pharmacy side):', !(await clickMaybe(page, 'Mark ordered', 'button')))
  console.log('request restock — Morphine (low stock):', await rowAction(page, 'Morphine 10mg/mL', 'Request restock')); await sleep(700)
  console.log('row now shows Requested:', await has(page, 'Requested'))
  await shot('n-pharmacy-inventory')

  // 3) Inventory Manager → Pharmacy Requests page · fulfilment moves here
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Management', 'Inventory', 'Pharmacy Requests')
  await navClick(page, 'Pharmacy Requests'); await sleep(1100)
  console.log('requests page heading:', await has(page, 'Pharmacy Requests'))
  console.log('shows the just-raised Morphine restock:', await has(page, 'Morphine 10mg/mL'))
  console.log('shows seeded patient procurement (Heparin):', await has(page, 'Heparin 5000U (IV)'))
  console.log('mark Morphine ordered:', await rowAction(page, 'Morphine 10mg/mL', 'Mark ordered')); await sleep(600)
  console.log('mark Morphine received:', await rowAction(page, 'Morphine 10mg/mL', 'Mark received')); await sleep(700)
  // History section is collapsed by default — expand it to verify Morphine landed there
  await clickMaybe(page, 'Show', 'button'); await sleep(500)
  console.log('Morphine in Recently received history:', (await has(page, 'Morphine 10mg/mL')) && (await has(page, 'Received')))
  await shot('n-inventory-manager')

  // 4) Patient panel — substituted med shows on Kiran's order
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Pharmacy'); await sleep(1200)
  console.log('patient sees substituted (was Amoxicillin 250mg):', await has(page, 'substituted (was Amoxicillin 250mg)'))
  await shot('n-patient-substituted')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
