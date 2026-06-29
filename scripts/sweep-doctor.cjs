const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const PAGES = [
  '/doctor/dashboard', '/doctor/online', '/doctor/ipd', '/doctor/emergencies',
  '/doctor/records', '/doctor/ai-assistant', '/doctor/schedule', '/doctor/inbox',
  '/doctor/analytics', '/doctor/beds', '/doctor/registries',
]
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push(`[${page.url().split('/').slice(-1)}] ${m.text().slice(0, 140)}`) })
  page.on('pageerror', (e) => errors.push(`[${page.url().split('/').slice(-1)}] pageerror ${e.message.slice(0, 140)}`))

  // Establish doctor session (default user is already doctor) by visiting home first
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(400)
  for (const p of PAGES) {
    await page.goto(`${BASE}${p}`, { waitUntil: 'networkidle2' }).catch(() => {})
    await sleep(900)
    const status = await page.evaluate(() => document.body.innerText.length)
    console.log(p, '·', status > 200 ? 'OK' : 'THIN(' + status + ')')
  }
  await browser.close()
  console.log('\nERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
