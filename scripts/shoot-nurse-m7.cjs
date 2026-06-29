const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function clickExact(page, text, sel = 'button') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim() === t && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return } await sleep(200) } throw new Error('nav not found: ' + label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
// Open the I/O form in a specific patient's card by finding the SMALLEST element
// that contains the patient name AND a "Record intake" button (= that card).
async function openIoForm(page, name) {
  return page.evaluate((name) => {
    const cands = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(name) && [...d.querySelectorAll('button')].some(b => (b.textContent || '').includes('Record intake')))
    cands.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const card = cands[0]; if (!card) return false
    const btn = [...card.querySelectorAll('button')].find(b => (b.textContent || '').includes('Record intake'))
    if (btn) { btn.click(); return true }
    return false
  }, name)
}
async function setNum(page, sel, val) { return page.evaluate((sel, val) => { const el = document.querySelector(sel); if (!el) return false; const set = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set; set.call(el, val); el.dispatchEvent(new Event('input', { bubbles: true })); return true }, sel, val) }
;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  page.setDefaultNavigationTimeout(60000)
  await page.setViewport({ width: 1500, height: 1000, deviceScaleFactor: 1 })
  const errors = []
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 150)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 150)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2200)
  await selectRole(page, null, 'Nurse', 'Ward Dashboard')
  await navClick(page, 'Fluid Balance'); await sleep(1500)

  console.log('Sunita seeded intake 380:', await has(page, '380 mL'))
  console.log('Sunita seeded output 130:', await has(page, '130 mL'))
  console.log('net balance shown (+250):', await has(page, '+250 mL'))
  console.log('IV ending-soon alert:', await has(page, 'Ending soon'))
  console.log('AI fluid alert (ending in ~ min):', await has(page, 'ending in'))
  console.log('IV remaining volume shown (mL left):', await has(page, 'mL left'))
  await shot('nurse-m7-fluids')

  // Add an output (Urine 200) to Sunita → balance updates
  const opened = await openIoForm(page, 'Sunita Devi'); await sleep(600)
  console.log('opened Sunita I/O form:', opened)
  await clickExact(page, 'Output'); await sleep(300)
  await setNum(page, 'input[placeholder="mL"]', '200'); await sleep(200)
  await clickExact(page, 'Add'); await sleep(1000)
  console.log('balance updated (output 330):', await has(page, '330 mL'))
  console.log('balance updated (net +50):', await has(page, '+50 mL'))
  await shot('nurse-m7-after-io')

  // Doctor chart timeline reflects the I/O entry
  await page.goto(`${BASE}/doctor/ipd/IP-3001`, { waitUntil: 'networkidle2' }); await sleep(3000)
  let found = false
  for (let i = 0; i < 14; i++) { await clickMaybe(page, 'Timeline', 'button'); await sleep(600); if (await has(page, 'Output recorded')) { found = true; break } }
  console.log('doctor timeline shows Output recorded:', found)
  await shot('nurse-m7-doctor-timeline')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
