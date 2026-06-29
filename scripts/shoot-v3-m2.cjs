const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function click(page, text, sel = 'button, a', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, text, sel)) { await sleep(250); return } await sleep(200) } throw new Error('not found: ' + text) }
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
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

  // Fee shown in consultation bar
  await clickMaybe(page, 'Kiran Patil', 'button'); await sleep(900)
  console.log('consult bar shows Fee ₹600:', await has(page, 'Fee ₹600'))
  await shot('v3-m2-fee')

  // Toggle On leave in Settings
  await page.goto(`${BASE}/doctor/settings`, { waitUntil: 'networkidle2' }); await sleep(1500)
  console.log('settings breadcrumb fixed:', await page.evaluate(() => (document.querySelector('h1')?.textContent || '') === 'Profile & Settings' || document.body.innerText.includes('Profile & Settings')))
  await clickMaybe(page, 'On leave', 'button'); await sleep(500)

  // Online page shows leave banner
  await click(page, 'Online Consultation', 'a'); await sleep(1200)
  console.log('online leave banner:', await has(page, 'on leave'))
  await shot('v3-m2-online-leave')

  // Schedule shows availability card with On leave
  await click(page, 'My Schedule', 'a'); await sleep(1200)
  console.log('schedule shows On leave + hours:', (await has(page, 'On leave')) && (await has(page, '09:00')))
  await shot('v3-m2-schedule')

  // Stats not persisted
  const statsPersisted = await page.evaluate(() => localStorage.getItem('agentix-doctor-stats'))
  console.log('stats NOT persisted (should be null):', statsPersisted)

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
