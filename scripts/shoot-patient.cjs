/* Opens the patient portal (via role picker) and screenshots each new page. */
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

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1366, height: 1700, deviceScaleFactor: 1 })
  const shot = async (n) => { await sleep(450); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Patient', 'button')        // Patient tab
  await click(page, 'Patient Portal', 'button')  // role card -> dashboard
  await sleep(2500); await shot('p-dashboard')

  // Click through each new nav page (SPA navigation keeps the session alive)
  const pages = [
    ['My Consultations', 'p-consultations'],
    ['IPD / Admission',  'p-ipd'],
    ['Pharmacy',         'p-pharmacy'],
    ['Pathology',        'p-pathology'],
    ['Radiology',        'p-radiology'],
    ['Blood Bank',       'p-blood-bank'],
    ['Ambulance',        'p-ambulance'],
    ['Download Center',  'p-downloads'],
  ]
  for (const [label, name] of pages) {
    try {
      await click(page, label, 'a')
      await sleep(1100); await shot(name)
    } catch (e) { console.error('SKIP', name, e.message) }
  }
  await browser.close()
  console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
