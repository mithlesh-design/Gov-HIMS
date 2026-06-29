// Audit v2 E2E: dashboard (KPIs + NABH evidence) + log (filter by module/severity/expand JSON)
const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots'
const BASE = 'http://localhost:3000'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const has = (page, t) => page.evaluate((x) => document.body.innerText.includes(x), t)
async function clickMaybe(page, text, sel = 'button, a') {
  return page.evaluate((t, sel) => { const el = [...document.querySelectorAll(sel)].find((e) => (e.textContent || '').replace(/\s+/g, ' ').trim().includes(t) && !e.disabled); if (el) { el.click(); return true } return false }, text, sel)
}
async function navClick(page, label, sel = 'a, button', tries = 30) { for (let i = 0; i < tries; i++) { if (await clickMaybe(page, label, sel)) { await sleep(700); return true } await sleep(200) } throw new Error('nav not found: ' + label) }
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
  page.on('console', (m) => { if (m.type() === 'error') errors.push('console: ' + m.text().slice(0, 160)) })
  page.on('pageerror', (e) => errors.push('pageerror: ' + e.message.slice(0, 160)))
  const shot = async (n) => { await sleep(500); await page.screenshot({ path: `${OUT}\\${n}.png` }); console.log('shot', n) }

  await page.goto(`${BASE}/`, { waitUntil: 'domcontentloaded' }); await sleep(2500)
  await selectRole(page, 'Support Services', 'Audit', 'Compliance Overview')

  // ── Audit dashboard with KPIs + NABH evidence ─────────────────────────
  console.log('audit dashboard heading:', await has(page, 'Audit') && await has(page, 'Compliance'))
  console.log('Total events KPI:', await has(page, 'TOTAL EVENTS') || await has(page, 'Total events'))
  console.log('Critical events KPI:', await has(page, 'CRITICAL EVENTS') || await has(page, 'Critical events'))
  console.log('Events by module card:', await has(page, 'Events by module'))
  console.log('NABH evidence card:', await has(page, 'NABH evidence'))
  console.log('AAC chapter listed:', await has(page, 'AAC'))
  console.log('COP chapter listed:', await has(page, 'COP'))
  console.log('MOM chapter listed:', await has(page, 'MOM'))
  console.log('AI HITL summary:', await has(page, 'AI HITL'))
  console.log('Latest events feed:', await has(page, 'Latest events'))
  await shot('aud-rev-dashboard')

  // ── Audit Trail (full log) ────────────────────────────────────────────
  await navClick(page, 'Audit Trail'); await sleep(900)
  console.log('audit trail heading:', await has(page, 'Full Audit Trail'))
  console.log('Pharmacy module pill visible:', await has(page, 'Pharmacy'))
  console.log('Lab module pill visible:', await has(page, 'Lab'))
  console.log('Sample seed entry (Substituted Amoxicillin):', await has(page, 'Amoxicillin'))
  console.log('Sample seed entry (qSOFA / sepsis):', await has(page, 'qSOFA') || await has(page, 'sepsis'))
  // Filter by Pharmacy module
  console.log('click Pharmacy filter:', await clickMaybe(page, 'Pharmacy', 'button')); await sleep(500)
  console.log('still shows pharmacy seed (Amoxicillin):', await has(page, 'Amoxicillin'))
  // Filter by Critical severity
  console.log('reset modules to All:', await clickMaybe(page, 'All modules', 'button')); await sleep(300)
  console.log('click Critical severity filter:', await clickMaybe(page, 'critical', 'button')); await sleep(500)
  console.log('critical event surfaced (callback / discrepancy):', await has(page, 'callback') || await has(page, 'discrepancy'))
  // Expand JSON of one event
  console.log('reset severity to all:', await clickMaybe(page, 'all', 'button')); await sleep(300)
  await shot('aud-rev-log')

  await browser.close()
  console.log('\nERRORS(' + errors.length + '):'); errors.forEach(e => console.log('  ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
