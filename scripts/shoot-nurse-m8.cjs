const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return } await sleep(200) } throw new Error('nav not found: ' + label) }
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
  await selectRole(page, null, 'Nurse', 'Ward Dashboard')
  await navClick(page, 'Ward Dashboard'); await sleep(1500)

  console.log('deterioration section present:', await has(page, 'AI Deterioration & Escalation'))
  console.log('NEWS trend shown:', await has(page, 'NEWS'))
  console.log('escalate button present:', await has(page, 'Escalate to doctor'))
  await shot('nurse-m8-dashboard')

  // Explicit escalation → AI-SBAR to the doctor
  await clickMaybe(page, 'Escalate to doctor', 'button'); await sleep(1200)
  await shot('nurse-m8-escalated')

  // Doctor side (SPA preserves the messaging + notification stores)
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, null, 'Doctor', 'OPD Consultations')
  // Bell notification
  await clickAria(page, 'Notifications'); await sleep(700)
  console.log('doctor bell shows Deterioration notification:', await has(page, 'Deterioration'))
  await page.keyboard.press('Escape'); await sleep(300)
  // Inbox SBAR
  await navClick(page, 'Inbox'); await sleep(1200)
  await clickMaybe(page, 'Anjali Desai', 'button, a, div, li'); await sleep(800)
  console.log('doctor inbox shows AI-SBAR:', await has(page, 'AI-SBAR'))
  console.log('SBAR has Recommendation (urgent review):', await has(page, 'urgent medical review'))
  console.log('SBAR references Sunita Devi:', await has(page, 'Sunita Devi'))
  await shot('nurse-m8-doctor-inbox')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
