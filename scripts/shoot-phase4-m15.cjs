const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled)
    if (el) { el.click(); return true }; return false
  }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) {
  for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) }
  throw new Error('not found: ' + text)
}
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
async function typeInto(page, sel, text) {
  await page.evaluate((s, t) => { const el = document.querySelector(s); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, t); el.dispatchEvent(new Event('input', { bubbles: true })) }, sel, text); await sleep(150)
}
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }
  const marker = 'XPORT-' + Date.now()

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await sleep(500)
  await click(page, 'Doctor', 'button'); await sleep(2500)
  await click(page, 'Inbox', 'a'); await sleep(1400)
  await clickMaybe(page, 'Anjali Desai', 'button'); await sleep(700)
  await typeInto(page, 'input[placeholder^="Message"]', marker + ' — please hold the morning antihypertensive')
  await clickMaybe(page, '', 'button[aria-label="Send"]'); await sleep(900)
  await shot('p4-m15-doctor')

  // Switch to nurse (Anjali Desai = NR-402)
  await clickAria(page, 'Log out'); await sleep(1200)
  await click(page, 'Nurse', 'button'); await sleep(2500)
  // Some role tiles need a second confirm button; try common labels
  await clickMaybe(page, 'Nursing', 'button'); await sleep(1500)
  await click(page, 'Messages', 'a'); await sleep(1500)
  await clickMaybe(page, 'Priya Nair', 'button'); await sleep(800)
  const seen = await page.evaluate((m) => document.body.innerText.includes(m), marker)
  console.log('doctor message visible in NURSE portal?', seen)
  await shot('p4-m15-nurse')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
