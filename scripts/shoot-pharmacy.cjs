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
async function clickCardAction(page, name, btnText) {
  return page.evaluate((name, btnText) => {
    const cards = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(name) && [...d.querySelectorAll('button')].some(b => (b.textContent || '').includes(btnText)))
    cards.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const card = cards[0]; if (!card) return false
    const btn = [...card.querySelectorAll('button')].find(b => (b.textContent || '').includes(btnText) && !b.disabled)
    if (btn) { btn.click(); return true } return false
  }, name, btnText)
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

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, null, 'Pharmacy', 'Prescription Queue')

  // M1: sectioned menu
  console.log('menu section Fulfilment:', await has(page, 'Fulfilment'))
  console.log('menu section Stock & Compliance:', await has(page, 'Stock & Compliance'))
  console.log('menu has Dispense & Verify:', await has(page, 'Dispense & Verify'))
  console.log('menu has Discharge Meds:', await has(page, 'Discharge Meds'))
  console.log('menu has Messaging:', await has(page, 'Messaging'))
  await shot('ph-menu')

  // M2: Dispense reads the real queue + close the loop
  await navClick(page, 'Dispense & Verify'); await sleep(1200)
  console.log('dispense shows real Rx (Meera Pillai):', await has(page, 'Meera Pillai'))
  console.log('dispense shows real Rx (Kiran Patil):', await has(page, 'Kiran Patil'))
  // Kiran (queued) → preparing → ready (patient notified)
  await clickCardAction(page, 'Kiran Patil', 'Start preparing'); await sleep(700)
  await clickCardAction(page, 'Kiran Patil', 'Mark ready'); await sleep(900)
  console.log('mark ready notified the patient:', await has(page, 'notified'))
  // Meera (preparing) → ready → collected (stock updated)
  await clickCardAction(page, 'Meera Pillai', 'Mark ready'); await sleep(800)
  await clickCardAction(page, 'Meera Pillai', 'Mark collected'); await sleep(900)
  console.log('collected → stock updated:', await has(page, 'stock updated'))
  await shot('ph-dispense')

  // M5: inventory decremented (Paracetamol 3200 - 15 = 3185)
  await navClick(page, 'Inventory'); await sleep(1000)
  console.log('inventory live + Paracetamol decremented to 3185:', await has(page, '3185'))
  console.log('inventory reorder alert + controlled (Sch. X):', await has(page, 'Sch. X'))
  await shot('ph-inventory')

  // M4: discharge TTO → clear pharmacy pillar
  await navClick(page, 'Discharge Meds'); await sleep(1000)
  console.log('discharge TTO shows Mohan Lal:', await has(page, 'Mohan Lal'))
  await clickCardAction(page, 'Mohan Lal', 'Dispense & clear'); await sleep(900)
  console.log('TTO dispensed (pharmacy clearance):', await has(page, 'pharmacy clearance') || await has(page, 'Dispensed'))
  await shot('ph-discharge-meds')

  // Narcotics + Messaging load
  await navClick(page, 'Narcotics Log'); await sleep(900)
  console.log('narcotics log loads (Morphine):', await has(page, 'Morphine'))

  // M3: patient sees real ready status (Kiran's Rx is now ready)
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Pharmacy'); await sleep(1200)
  console.log('patient pharmacy shows live orders:', await has(page, 'Your pharmacy orders'))
  console.log('patient sees Ready for collection:', await has(page, 'Ready for collection'))
  await shot('ph-patient')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
