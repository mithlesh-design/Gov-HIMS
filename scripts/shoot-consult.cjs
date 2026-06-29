/* Drives the ONLINE (video) onboarding → dashboard → teleconsult, plus an in-person toggle. */
const puppeteer = require('puppeteer-core')
const fs = require('fs')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function click(page, text) {
  const ok = await page.evaluate((t) => {
    const el = [...document.querySelectorAll('button, a')].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true }
    return false
  }, text)
  if (!ok) throw new Error('not found: ' + text)
  await sleep(220)
}
async function type(page, aria, val) {
  const sel = `input[aria-label="${aria}"]`
  await page.waitForSelector(sel, { timeout: 4000 }); await page.click(sel); await page.type(sel, val, { delay: 8 })
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: Number(process.env.H) || 760, deviceScaleFactor: 1 })
  const shot = async (n) => { await sleep(400); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/checkin/intake`, { waitUntil: 'networkidle2' }); await sleep(400)
  await click(page, 'Start')
  await shot('c1-consult-type')
  await click(page, 'Online video consult'); await click(page, 'Continue')
  await click(page, 'Type it myself'); await click(page, 'Continue')
  await type(page, 'Full name', 'Ramesh Kumar'); await type(page, 'Mobile number', '9812345670'); await type(page, 'Age in years', '45')
  await click(page, 'Male'); await click(page, 'Continue')
  await click(page, 'Chest Pain'); await click(page, 'Fever'); await click(page, 'Continue')
  await click(page, 'Cardiology'); await click(page, 'Continue')
  await shot('c2-slot')
  await click(page, 'Dr. Priya Nair'); await sleep(350)
  await page.evaluate(() => { const el = [...document.querySelectorAll('*')].find(e => { const s = getComputedStyle(e); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 4 }); if (el) el.scrollTop = el.scrollHeight })
  await shot('c2b-slot-times')
  await click(page, 'Today'); await click(page, '10:00 AM'); await click(page, 'Continue')
  await click(page, 'Continue') // reports
  await click(page, 'Continue') // family
  await click(page, 'Continue') // review
  await shot('c3-payment')
  await click(page, 'Cashless'); await sleep(200)
  await click(page, 'Star Health Insurance')
  await type(page, 'Policy or member ID', 'STAR-998877')
  await type(page, 'Policyholder name', 'Ramesh Kumar')
  await click(page, 'Verify policy'); await sleep(1100)
  await shot('c3b-cashless-verified')
  await click(page, 'Confirm booking')
  await sleep(2200); await shot('c4-video-success')
  await click(page, 'Go to My Dashboard'); await sleep(1800); await shot('c5-video-dashboard')
  await page.evaluate(() => { const m = document.getElementById('main-content'); if (m) m.scrollTop = 360 })
  await sleep(300); await shot('c5b-foryou-video')
  // teleconsult via quick action (client nav preserves state)
  await click(page, 'Teleconsult'); await sleep(1000); await shot('c6-teleconsult-precall')
  await click(page, 'Join now'); await sleep(1200); await shot('c7-teleconsult-incall')

  await browser.close(); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
