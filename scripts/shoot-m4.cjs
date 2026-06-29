/* Drives the Doctor's Orders -> review/reduce/skip -> pay flow and the M6 pages. */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function click(page, text, sel = 'button, a') {
  const ok = await page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true }
    return false
  }, text, sel)
  if (!ok) throw new Error('not found: ' + text)
  await sleep(250)
}
async function clickAria(page, label) {
  const ok = await page.evaluate((l) => {
    const el = [...document.querySelectorAll('button')].find((e) => e.getAttribute('aria-label') === l && !e.disabled)
    if (el) { el.click(); return true }
    return false
  }, label)
  return ok
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 1700, deviceScaleFactor: 1 })
  const shot = async (n) => { await sleep(450); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Patient', 'button')
  await click(page, 'Patient Portal', 'button')
  await sleep(2200)

  // 1) Open Doctor's Orders (receives the orders)
  await click(page, "Doctor's Orders", 'a'); await sleep(1100); await shot('m4-orders-initial')

  // 2) Dashboard now shows the action-needed card
  await click(page, 'Dashboard', 'a'); await sleep(1200); await shot('m4-dashboard-card')

  // 3) Care & Follow-up shows the prescribed meds
  await click(page, 'Care & Follow-up', 'a'); await sleep(1100); await shot('m4-followup')

  // 4) Billing shows the pending orders bill
  await click(page, 'Billing', 'a'); await sleep(1100); await shot('m4-billing-pending')

  // 5) Back to orders, reduce a medicine + skip an item, then pay
  await click(page, "Doctor's Orders", 'a'); await sleep(900)
  await clickAria(page, 'Reduce'); await sleep(200); await clickAria(page, 'Reduce'); await sleep(300) // reduce first med
  await click(page, 'Skip', 'button'); await sleep(400)                                                 // open reason chooser on first item
  await click(page, 'I already have this', 'button'); await sleep(500)
  await shot('m4-orders-edited')
  await click(page, 'Pay ₹', 'button'); await sleep(900); await shot('m4-orders-paid')

  // 6) Pharmacy + Pathology now show the paid orders banner
  await click(page, 'Pharmacy', 'a'); await sleep(1100); await shot('m4-pharmacy-banner')
  await click(page, 'Pathology', 'a'); await sleep(1100); await shot('m4-pathology-banner')

  // 7) Billing now shows the orders bill as paid
  await click(page, 'Billing', 'a'); await sleep(1100); await shot('m4-billing-paid')

  await browser.close()
  console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
