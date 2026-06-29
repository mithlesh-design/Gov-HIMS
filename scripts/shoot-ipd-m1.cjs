const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function click(page, text, sel = 'button, a', tries = 30) {
  for (let i = 0; i < tries; i++) {
    const ok = await page.evaluate((t, sel) => {
      const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
      if (el) { el.click(); return true }; return false
    }, text, sel)
    if (ok) { await sleep(250); return true }; await sleep(200)
  }
  return false
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1080, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(600); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await click(page, 'IPD / Inpatients', 'a'); await sleep(1500); await shot('m1-ipd')
  await click(page, 'Open chart', 'button'); await sleep(900); await shot('m1-ipd-chart')
  await page.keyboard.press('Escape'); await sleep(400)
  await click(page, 'Start round', 'button'); await sleep(800); await shot('m1-ipd-round')
  await page.type('textarea', 'Reviewed — improving, vitals stable.'); await sleep(200)
  await click(page, 'Record round', 'button'); await sleep(900); await shot('m1-ipd-after')
  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
