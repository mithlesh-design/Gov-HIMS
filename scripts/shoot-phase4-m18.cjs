const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) } throw new Error('not found: ' + text) }
const overflow = (page) => page.evaluate(() => document.documentElement.scrollWidth - document.documentElement.clientWidth)
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)

  // Registries (real cohort data)
  await click(page, 'Disease Registries', 'a'); await sleep(1500)
  const reg = await page.evaluate(() => { const m = document.body.innerText.match(/Diabetes Registry \((\d+) patients\)/); return m ? m[1] : 'none' })
  console.log('diabetes cohort size (from data):', reg)
  await shot('p4-m18-registries')

  // Tablet width — dashboard + IPD
  await page.setViewport({ width: 834, height: 1112, deviceScaleFactor: 1 })
  await click(page, 'OPD Consultations', 'a'); await sleep(1200)
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(900)
  console.log('dashboard h-overflow @834:', await overflow(page))
  await shot('p4-m18-dashboard-tablet')
  await click(page, 'IPD / Inpatients', 'a'); await sleep(1200)
  console.log('ipd h-overflow @834:', await overflow(page))
  await shot('p4-m18-ipd-tablet')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
