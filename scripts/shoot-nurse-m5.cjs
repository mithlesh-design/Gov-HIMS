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
const indexOf = (page, t) => page.evaluate((x) => document.body.innerText.indexOf(x), t)
const roleVisible = (page, role) => page.evaluate((r) => [...document.querySelectorAll('button')].some(b => (b.textContent || '').includes(r) && (b.textContent || '').length < 140), role)
async function selectRole(page, tab, role, confirmText) {
  // Keep (re)selecting the tab + role card until the portal actually loads —
  // robust against hydration lag where an early click is a no-op.
  for (let i = 0; i < 60; i++) {
    if (tab) await clickMaybe(page, tab, 'button')
    await clickMaybe(page, role, 'button')
    await sleep(450)
    if (await has(page, confirmText)) { await sleep(800); return }
  }
  throw new Error('login did not reach portal: ' + role)
}
const countOrders = (page) => page.evaluate(() => [...document.querySelectorAll('button')].filter(b => (b.textContent || '').includes('Acknowledge')).length)
async function openChart(page, name) {
  return page.evaluate((name) => {
    const els = [...document.querySelectorAll('td,th,span,p,h3,div,tr,a,button')].filter(e => (e.textContent || '').replace(/\s+/g, ' ').includes(name))
    els.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const target = els[0]; if (!target) return false
    let el = target
    for (let i = 0; i < 7 && el; i++) { const cs = getComputedStyle(el); if (el.tagName === 'A' || el.tagName === 'TR' || el.getAttribute('role') === 'button' || cs.cursor === 'pointer') { el.click(); return true } el = el.parentElement }
    target.click(); return true
  }, name)
}
async function clickCardBtn(page, cardText, btnText) {
  return page.evaluate((cardText, btnText) => {
    const btns = [...document.querySelectorAll('button')].filter(b => (b.textContent || '').includes(btnText))
    for (const b of btns) { let el = b; for (let i = 0; i < 3 && el; i++) { el = el.parentElement; if (el && (el.textContent || '').includes(cardText)) { b.click(); return true } } }
    return false
  }, cardText, btnText)
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
  await navClick(page, 'Doctor Orders'); await sleep(1500)

  console.log('order: Arrange Lipid Profile (Kiran test):', await has(page, 'Arrange Lipid Profile'))
  console.log('order: Coordinate referral — Cardiology:', await has(page, 'Coordinate referral'))
  console.log('order: Arrange Echocardiogram (Vikram):', await has(page, 'Arrange Echocardiogram'))
  console.log('order: Verify IV line — NS (Sunita):', await has(page, 'Verify IV line'))
  // AI prioritisation: Critical-patient IV (HIGH) sorts above routine test
  const iIv = await indexOf(page, 'Verify IV line'), iLipid = await indexOf(page, 'Arrange Lipid Profile')
  console.log('AI priority: HIGH order above routine:', iIv > -1 && iLipid > -1 && iIv < iLipid)
  console.log('HIGH urgency badge present:', await has(page, 'HIGH'))
  await shot('nurse-m5-orders')

  // Acknowledge the Lipid Profile order → it clears from the queue
  const before = await countOrders(page)
  const acked = await clickCardBtn(page, 'Arrange Lipid Profile', 'Acknowledge'); await sleep(1200)
  const after = await countOrders(page)
  console.log('acknowledged Lipid Profile:', acked)
  console.log('order cleared from queue (count', before, '→', after, '):', after === before - 1)
  const persistedHasEvent = await page.evaluate(() => (localStorage.getItem('agentix-ipd') || '').includes('Order actioned'))
  console.log('[diag] persisted localStorage has "Order actioned":', persistedHasEvent)
  const pv = await page.evaluate(() => { try { return JSON.parse(localStorage.getItem('agentix-ipd')).version } catch { return 'none' } })
  console.log('[diag] persisted version:', pv)
  await shot('nurse-m5-after-ack')

  // Doctor chart timeline reflects the actioned order (page.goto rehydrates the
  // persisted shared record — the proven M2/M4 pattern).
  await page.goto(`${BASE}/doctor/ipd/PT-20394`, { waitUntil: 'networkidle2' }); await sleep(3000)
  let found = false
  for (let i = 0; i < 16; i++) { await clickMaybe(page, 'Timeline', 'button'); await sleep(600); if (await has(page, 'Order actioned')) { found = true; break } }
  console.log('doctor timeline shows "Order actioned":', found)
  const persistedAfter = await page.evaluate(() => (localStorage.getItem('agentix-ipd') || '').includes('Order actioned'))
  console.log('[diag] after doctor load, localStorage still has event:', persistedAfter)
  await shot('nurse-m5-doctor-timeline')

  await browser.close()
  console.log('ERRORS(' + errors.length + '):'); errors.forEach(e => console.log(' ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
