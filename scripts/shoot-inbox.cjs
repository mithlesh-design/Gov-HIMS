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
async function typeInto(page, sel, text) {
  await page.evaluate((s, t) => {
    const el = document.querySelector(s)
    const proto = el.tagName === 'TEXTAREA' ? window.HTMLTextAreaElement.prototype : window.HTMLInputElement.prototype
    const setter = Object.getOwnPropertyDescriptor(proto, 'value').set
    setter.call(el, t); el.dispatchEvent(new Event('input', { bubbles: true }))
  }, sel, text); await sleep(150)
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
  await click(page, 'Inbox', 'a'); await sleep(1400)
  await shot('inbox-1-messages')

  // Reply in the open conversation, watch auto-reply
  await typeInto(page, 'input[placeholder^="Message"]', 'Hold the dose, recheck BP in 30 min and call me if >160 systolic.')
  await clickMaybe(page, '', 'button[aria-label="Send"]'); await sleep(2000)
  await shot('inbox-2-reply')

  // Compose to anyone
  await click(page, 'New message', 'button'); await sleep(600)
  await typeInto(page, 'input[placeholder^="Search staff"]', 'radio')
  await sleep(400)
  await clickMaybe(page, 'Dr. Sameer Khan', 'button'); await sleep(300)
  await typeInto(page, 'textarea', 'Please expedite the chest X-ray read for Raju Singh (bed 102) — planning discharge.')
  await shot('inbox-3-compose')
  await clickMaybe(page, 'Send', 'button'); await sleep(900)
  await shot('inbox-4-sent')

  // Alerts tab
  await click(page, 'Alerts', 'button'); await sleep(700)
  await shot('inbox-5-alerts')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
