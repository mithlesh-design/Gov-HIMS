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
async function ask(page, text) {
  await page.evaluate((t) => {
    const ta = document.querySelector('textarea')
    const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
    setter.call(ta, t); ta.dispatchEvent(new Event('input', { bubbles: true }))
  }, text)
  await sleep(200)
  await clickMaybe(page, '', 'button[aria-label="Send"]')
  await sleep(1100)
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
  await click(page, 'AI Assistant', 'a'); await sleep(1500)
  await shot('ai-1-empty')

  await ask(page, 'Which rounds are due?')
  await ask(page, 'Who has diabetes?')
  await shot('ai-2-answers')

  await ask(page, 'Draft a discharge summary for Mohan Lal')
  await sleep(400)
  await shot('ai-3-draft')

  // New chat persists separately + draft round note with Save-to-chart
  await click(page, 'New chat', 'button'); await sleep(500)
  await ask(page, 'Summarise Kiran Patil')
  await ask(page, 'Draft a round note for Kiran Patil')
  await sleep(400)
  await shot('ai-4-roundnote')
  // exercise Save to chart
  await clickMaybe(page, 'Save to chart', 'button'); await sleep(700)
  await shot('ai-5-saved')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
