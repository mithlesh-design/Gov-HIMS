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
    if (ok) { await sleep(250); return } await sleep(200)
  }
  throw new Error('not found: ' + text)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await shot('m1-dashboard')
  // Check for a floating bottom-right FAB (the chatbot). The online-consult video widget is not present here.
  const fab = await page.evaluate(() => {
    const els = [...document.querySelectorAll('button, div')]
    return els.some(e => {
      const s = getComputedStyle(e)
      if (s.position !== 'fixed') return false
      const r = e.getBoundingClientRect()
      return r.right > window.innerWidth - 140 && r.bottom > window.innerHeight - 140 && r.width < 120 && r.width > 30 && r.height < 120 && r.height > 30
    })
  })
  console.log('bottom-right FAB present?', fab)
  await click(page, 'IPD / Inpatients', 'a'); await sleep(1400)
  await shot('m1-ipd')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
