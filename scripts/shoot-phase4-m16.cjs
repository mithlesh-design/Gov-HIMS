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

  // Bell first (before search nav)
  await clickMaybe(page, '', 'button[aria-label="Notifications"]'); await sleep(600)
  const notifItems = await page.evaluate(() => document.body.innerText.includes('Critical Lab Value') || document.body.innerText.includes('Deterioration'))
  console.log('bell shows real notifications?', notifItems)
  await shot('p4-m16-bell')
  await clickMaybe(page, '', 'button[aria-label="Close"]'); await sleep(300)

  // Search → navigate to Mohan Lal (inpatient → chart)
  await page.evaluate(() => { const el = document.querySelector('input[aria-label="Search"]'); Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, 'Mohan'); el.dispatchEvent(new Event('input', { bubbles: true })) })
  await sleep(500)
  await shot('p4-m16-search')
  await clickMaybe(page, 'Mohan Lal', 'button'); await sleep(1500)
  const url = page.url()
  console.log('navigated to:', url)
  await shot('p4-m16-navigated')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
