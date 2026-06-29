/* Drives the real intake flow in headless Chrome and screenshots each step. */
const puppeteer = require('puppeteer-core')
const fs = require('fs')

const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
fs.mkdirSync(OUT, { recursive: true })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickText(page, text, { tag = 'button' } = {}) {
  const ok = await page.evaluate((t, tag) => {
    const els = [...document.querySelectorAll(tag)]
    const el = els.find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true }
    return false
  }, text, tag)
  if (!ok) throw new Error('clickText not found/enabled: ' + text)
  await sleep(180)
}

async function typeInto(page, ariaLabel, value) {
  const sel = `input[aria-label="${ariaLabel}"]`
  await page.waitForSelector(sel, { timeout: 4000 })
  await page.click(sel)
  await page.type(sel, value, { delay: 10 })
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1280, height: Number(process.env.H) || 900, deviceScaleFactor: 1 })
  const shot = async (name) => { await sleep(350); await page.screenshot({ path: `${OUT}\\${name}.png` }); console.log('shot', name) }

  await page.goto(`${BASE}/checkin`, { waitUntil: 'networkidle2' }); await shot('01-checkin')

  await page.goto(`${BASE}/checkin/intake`, { waitUntil: 'networkidle2' }); await shot('02-welcome')
  await clickText(page, 'Start Check-In'); await shot('03-method')
  await clickText(page, 'Type it myself')
  await clickText(page, 'Continue'); await shot('04-details')

  await typeInto(page, 'Full name', 'Ramesh Kumar')
  await typeInto(page, 'Mobile number', '9812345670')
  await typeInto(page, 'Age in years', '45')
  await clickText(page, 'Male'); await shot('04b-details-filled')
  await clickText(page, 'Continue'); await shot('05-visit')

  await clickText(page, 'Follow-up')
  await clickText(page, 'Cashless'); await shot('05b-visit')
  await clickText(page, 'Continue'); await shot('06-insurance')

  await typeInto(page, 'Insurance card number', 'STAR12345')
  await clickText(page, 'Star Health Insurance'); await shot('06b-insurance')
  await clickText(page, 'Continue'); await shot('07-symptoms')

  await clickText(page, 'Chest Pain')
  await clickText(page, 'Fever'); await shot('07b-symptoms-ai')
  await page.evaluate(() => {
    const el = [...document.querySelectorAll('*')].find((e) => {
      const s = getComputedStyle(e); return (s.overflowY === 'auto' || s.overflowY === 'scroll') && e.scrollHeight > e.clientHeight + 4
    })
    if (el) el.scrollTop = el.scrollHeight
  })
  await shot('07d-symptoms-scrolled')
  await clickText(page, 'Other'); await shot('07c-symptoms-other')
  await clickText(page, 'Continue'); await shot('08-department')

  await clickText(page, 'Cardiology')
  await clickText(page, 'Continue'); await shot('09-reports')
  await clickText(page, 'Continue'); await shot('10-family')
  await clickText(page, 'Continue'); await shot('11-review')
  await clickText(page, 'Confirm Check-In'); await sleep(2000); await shot('12-success')
  await clickText(page, 'Go to My Dashboard'); await sleep(1800); await shot('13-new-patient-dashboard')

  await browser.close()
  console.log('DONE ->', OUT)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
