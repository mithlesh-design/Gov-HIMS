const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => {
    const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim() === t || (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t))
    if (el && !el.disabled) { el.click(); return true }; return false
  }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) {
  for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) }
  throw new Error('not found: ' + text)
}
async function addMed(page, name) {
  await page.evaluate((n) => {
    const el = document.querySelector('input[placeholder="Search medicine..."]')
    Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set.call(el, n)
    el.dispatchEvent(new Event('input', { bubbles: true }))
  }, name)
  await sleep(200)
  await clickMaybe(page, 'Add', 'button')
  await sleep(400)
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
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(900)

  await addMed(page, 'Warfarin 5mg')
  await addMed(page, 'Aspirin 75mg')
  const warned = await page.evaluate(() => document.body.innerText.includes('Warfarin + Aspirin'))
  console.log('major interaction banner shown?', warned)
  await shot('p3-m10-warning')

  // First Send = blocked; second = override
  await clickMaybe(page, 'Send to Pharmacy', 'button'); await sleep(700)
  await shot('p3-m10-blocked')
  await clickMaybe(page, 'Send to Pharmacy', 'button'); await sleep(700)
  const sent = await page.evaluate(() => document.body.innerText.includes('Sent to Pharmacy'))
  console.log('override sent?', sent)
  await shot('p3-m10-override')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
