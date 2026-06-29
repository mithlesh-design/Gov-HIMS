/* M5 verification: bed / billing / tpa / diagnostics / ambulance visibility pages. */
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function click(page, text, sel = 'button, a', tries = 25) {
  for (let i = 0; i < tries; i++) {
    const ok = await page.evaluate((t, sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
      if (el) { el.click(); return true }
      return false
    }, text, sel)
    if (ok) { await sleep(250); return true }
    await sleep(200)
  }
  throw new Error('not found: ' + text)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1150, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(450); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Operations', 'button')
  await click(page, 'Reception', 'button')
  await sleep(2000)

  for (const [label, name] of [['Bed Status', 'm5-beds'], ['Billing Status', 'm5-billing'], ['TPA / Insurance', 'm5-tpa'], ['Diagnostics', 'm5-diagnostics'], ['Ambulance', 'm5-ambulance']]) {
    await click(page, label, 'a'); await sleep(1000); await shot(name)
  }

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e))
  console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
