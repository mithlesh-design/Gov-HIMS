const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(800); return true } await sleep(200) } return false }
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

  // Patient portal — real profile (Kiran, seeded complete)
  await selectRole(page, 'Patient', 'Patient Portal', 'My Health Story')
  await navClick(page, 'Profile & Privacy'); await sleep(1200)
  console.log('portal: verified-by-nursing badge:', await has(page, 'Verified by nursing'))
  console.log('portal: blood group AB+:', await has(page, 'AB+'))
  console.log('portal: address (Shanti Nagar):', await has(page, 'Shanti Nagar'))
  console.log('portal: language (Marathi):', await has(page, 'Marathi'))
  console.log('portal: current med (Metformin):', await has(page, 'Metformin'))
  console.log('portal: emergency (Sunita Patil):', await has(page, 'Sunita Patil'))
  await shot('profile-m4-portal')

  // Doctor consult — surfaces the nurse-completed profile
  await clickAria(page, 'Log out'); await sleep(1200)
  await selectRole(page, null, 'Doctor', 'OPD Consultations')
  await navClick(page, 'OPD Consultations'); await sleep(1200)
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(1800)
  console.log('doctor consult: allergy (Penicillin) surfaced:', await has(page, 'Penicillin'))
  console.log('doctor consult: blood group (AB+):', await has(page, 'AB+'))
  console.log('doctor consult: emergency (Sunita Patil):', await has(page, 'Sunita Patil'))
  console.log('doctor consult: completed-by stamp:', await has(page, 'by N. Anjali Desai') || await has(page, 'by Anjali Desai'))
  await shot('profile-m4-doctor')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
