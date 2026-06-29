const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) } throw new Error('not found: ' + text) }
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await page.goto(`${BASE}/doctor/ipd/PT-20394`, { waitUntil: 'networkidle2' }); await sleep(2000)
  const sparkline = await page.evaluate(() => document.querySelectorAll('path.recharts-line-curve').length)
  const hasNews = await page.evaluate(() => document.body.innerText.includes('Early-warning (NEWS) trend'))
  console.log('NEWS trend present:', hasNews, '· sparkline lines:', sparkline)
  await shot('v3-m5-overview')

  // Rounds tab → Start round → check RR/consciousness inputs
  await clickMaybe(page, 'Rounds', 'button'); await sleep(600)
  await clickMaybe(page, 'Start round', 'button'); await sleep(700)
  const hasRR = await page.evaluate(() => !!document.querySelector('input[placeholder="Resp. rate"]'))
  const hasAvpu = await page.evaluate(() => [...document.querySelectorAll('option')].some(o => o.textContent === 'Unresponsive'))
  console.log('round modal has RR input:', hasRR, '· AVPU select:', hasAvpu)
  await shot('v3-m5-round')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
