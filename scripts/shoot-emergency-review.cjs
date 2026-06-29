// Emergency v2 E2E: triage (record vitals + AI ESI + route) → floor (claim + sepsis + disposition) → overview (KPIs + MCI)
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
async function rowAction(page, name, btnText) {
  return page.evaluate((name, btnText) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(name) && [...d.querySelectorAll('button')].some(b => (b.textContent || '').includes(btnText)))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    const row = rows[0]; if (!row) return false
    const btn = [...row.querySelectorAll('button')].find(b => (b.textContent || '').includes(btnText) && !b.disabled)
    if (btn) { btn.click(); return true } return false
  }, name, btnText)
}
// Set a vital input inside the smallest expanded row containing `patient`
async function setVital(page, patient, label, value) {
  return page.evaluate((p, lbl, val) => {
    const rows = [...document.querySelectorAll('div')].filter(d => (d.textContent || '').includes(p))
    rows.sort((a, b) => (a.textContent || '').length - (b.textContent || '').length)
    for (const row of rows) {
      const labels = [...row.querySelectorAll('label')].filter(l => (l.textContent || '').trim().startsWith(lbl))
      for (const l of labels) {
        const input = l.parentElement?.querySelector('input[type="number"]')
        if (input) {
          const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
          setter.call(input, String(val))
          input.dispatchEvent(new Event('input', { bubbles: true }))
          input.dispatchEvent(new Event('blur', { bubbles: true }))
          return true
        }
      }
    }
    return false
  }, patient, label, value)
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
  await selectRole(page, 'Clinical', 'Emergency', 'Triage')

  // ── Triage flow ───────────────────────────────────────────────────────
  await navClick(page, 'Triage'); await sleep(1000)
  console.log('triage heading:', await has(page, 'Triage'))
  console.log('Sandeep Yadav awaiting:', await has(page, 'Sandeep Yadav'))

  // Expand Sandeep, fill vitals matching STEMI presentation
  console.log('expand Sandeep:', await clickMaybe(page, 'Sandeep Yadav', 'button')); await sleep(600)
  await setVital(page, 'Sandeep Yadav', 'RR', 18)
  await setVital(page, 'Sandeep Yadav', 'SpO2', 96)
  await setVital(page, 'Sandeep Yadav', 'SBP', 140)
  await setVital(page, 'Sandeep Yadav', 'HR', 98)
  await setVital(page, 'Sandeep Yadav', 'Temp', 37.0)
  await setVital(page, 'Sandeep Yadav', 'GCS', 15)
  await sleep(400)
  console.log('AI ESI suggestion appears:', await has(page, 'AI ESI suggestion'))
  console.log('chest pain → ESI 2:', await has(page, 'ESI 2'))
  console.log('save vitals:', await rowAction(page, 'Sandeep Yadav', 'Save vitals')); await sleep(500)
  console.log('apply ESI suggested:', await rowAction(page, 'Sandeep Yadav', 'ESI 2')); await sleep(700)
  console.log('routed toast:', await has(page, 'triaged ESI'))
  await shot('er-rev-triage')

  // ── Floor flow: claim Lalita (already in Critical), update vitals, set disposition ──
  await navClick(page, 'ER Floor'); await sleep(1000)
  console.log('floor heading:', await has(page, 'ER Floor'))
  console.log('Critical default tab shows Lalita Devi:', await has(page, 'Lalita Devi'))
  console.log('NEWS2 + qSOFA badges visible:', await has(page, 'NEWS2') && await has(page, 'qSOFA'))
  // Claim Lalita
  console.log('accept Lalita:', await rowAction(page, 'Lalita Devi', 'Accept')); await sleep(700)
  console.log('your counter on Lalita:', await has(page, 'your counter'))
  // Expand the row to reveal disposition controls
  console.log('expand Lalita:', await clickMaybe(page, 'Lalita Devi', 'button')); await sleep(500)
  // Set disposition
  console.log('admit ICU:', await rowAction(page, 'Lalita Devi', 'Admit ICU')); await sleep(700)
  console.log('disposition toast:', await has(page, 'Disposition'))
  await shot('er-rev-floor')

  // ── Overview ─────────────────────────────────────────────────────────
  await navClick(page, 'ER Overview'); await sleep(1100)
  console.log('overview heading:', await has(page, 'ER Overview'))
  console.log('KPI In department:', await has(page, 'IN DEPARTMENT') || await has(page, 'In department'))
  console.log('NEWS2 high section:', await has(page, 'NEWS2 high'))
  console.log('Sepsis suspected section:', await has(page, 'Sepsis suspected'))
  console.log('Pipeline by area card:', await has(page, 'Pipeline by area'))
  console.log('Doctor load card:', await has(page, 'Doctor load'))
  console.log('AI exception triage:', await has(page, 'AI exception triage'))
  // MCI toggle
  console.log('declare MCI:', await clickMaybe(page, 'Declare MCI', 'button')); await sleep(500)
  console.log('MCI mode toast:', await has(page, 'MCI MODE activated'))
  console.log('MCI ACTIVE badge:', await has(page, 'MCI ACTIVE'))
  await shot('er-rev-overview')

  await browser.close()
  console.log('\nERRORS(' + errors.length + '):'); errors.forEach(e => console.log('  ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
