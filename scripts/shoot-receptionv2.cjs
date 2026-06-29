const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return true } await sleep(200) } throw new Error('nav not found: ' + label) }
async function clickAria(page, label) { return page.evaluate((l) => { const el = [...document.querySelectorAll('button,a')].find(e => e.getAttribute('aria-label') === l); if (el) { el.click(); return true } return false }, label) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function selectRole(page, tab, role, confirmText) {
  for (let i = 0; i < 60; i++) { if (tab) await clickMaybe(page, tab, 'button'); await clickMaybe(page, role, 'button'); await sleep(450); if (await has(page, confirmText)) { await sleep(800); return } }
  throw new Error('login did not reach portal: ' + role)
}
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
  await selectRole(page, 'Operations', 'Reception', 'OPD Queue')

  // M7: multi-OPD display board
  await navClick(page, 'OPD Display'); await sleep(1500)
  console.log('board groups General Medicine:', await has(page, 'General Medicine'))
  console.log('board groups Cardiology:', await has(page, 'Cardiology'))
  console.log('board groups Dermatology:', await has(page, 'Dermatology'))
  console.log('rooms shown (Room 1 / Room 5):', await has(page, 'Room 1') && await has(page, 'Room 5'))
  console.log('per-room now-serving (Anita Rao, Cardiology):', await has(page, 'Anita Rao'))
  console.log('multiple OPD doctors (Dr. Rohan Mehta):', await has(page, 'Dr. Rohan Mehta'))
  await shot('rv2-opd-board')

  // M7: walk-in doctor assignment
  await navClick(page, 'OPD Queue'); await sleep(1200)
  await clickMaybe(page, 'Register Walk-in', 'button'); await sleep(700)
  console.log('walk-in has doctor/room selector:', await has(page, 'OPD doctor / room'))
  await shot('rv2-walkin')
  await clickAria(page, 'Close'); await sleep(300)
  await page.keyboard.press('Escape'); await sleep(300)

  // M8: send to emergency
  const erBtn = await clickAria(page, 'Send Aarav Sharma to Emergency')
  console.log('ER button found & clicked:', erBtn)
  await sleep(900)
  console.log('toast: sent to Emergency:', await has(page, 'sent to Emergency'))
  await shot('rv2-emergency')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
