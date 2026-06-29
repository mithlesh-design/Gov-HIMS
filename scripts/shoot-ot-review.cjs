// OT v2 E2E: WHO checklist (3 phases) + clearance pillars + anaesthesia + counts + specimens + debrief
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
  await selectRole(page, 'Operations', 'Operation Theater', 'Pre-Op Checklist')

  // ── WHO Case Workflow ─────────────────────────────────────────────────
  await navClick(page, 'Pre-Op Checklist'); await sleep(1100)
  console.log('case workflow heading:', await has(page, 'OT Case Workflow'))
  console.log('pre-op clearance card:', await has(page, 'Pre-op clearance'))
  console.log('pillars labelled (Surgical / Anaesthesia / CSSD):', await has(page, 'Surgical') && await has(page, 'Anaesthesia') && await has(page, 'CSSD'))
  console.log('WHO phases present:', await has(page, 'Sign In') && await has(page, 'Time Out') && await has(page, 'Sign Out'))
  console.log('Time Out subtitle:', await has(page, 'Before skin incision'))

  // Pick Meena Sharma's case (pre-op laparoscopic chole)
  console.log('switch to Meena Sharma case:', await clickMaybe(page, 'Meena Sharma', 'button')); await sleep(700)
  // Mark all pre-op clearance as cleared
  console.log('clear Lab pillar:', await page.evaluate(() => {
    const cards = [...document.querySelectorAll('div')].filter(d => /^laboratory$/i.test((d.querySelector('p')?.textContent || '').trim()))
    for (const c of cards) {
      const btn = [...c.querySelectorAll('button')].find(b => (b.textContent || '').trim() === '✓')
      if (btn) { btn.click(); return true }
    }
    // Fall back: find any pillar card with text "LAB"-like and click ✓
    return false
  }))
  await sleep(300)
  console.log('clear Imaging pillar:', await page.evaluate(() => {
    const cards = [...document.querySelectorAll('div')].filter(d => /^imaging$/i.test((d.querySelector('p')?.textContent || '').trim()))
    for (const c of cards) {
      const btn = [...c.querySelectorAll('button')].find(b => (b.textContent || '').trim() === '✓')
      if (btn) { btn.click(); return true }
    }
    return false
  }))
  await sleep(400)

  // Sign In is open by default; verify content directly
  console.log('Sign In list has Pulse oximeter item:', await has(page, 'Pulse oximeter'))

  // Pick ASA 2, Mallampati 2, technique
  console.log('set ASA 3 (live update):', await page.evaluate(() => {
    const btns = [...document.querySelectorAll('button')]
    const target = btns.find(b => b.textContent?.trim() === '3' && b.className.includes('flex-1'))
    if (target) { target.click(); return true }
    return false
  })); await sleep(300)
  console.log('ASA description visible:', await has(page, 'Severe systemic disease'))

  // Open Sign Out and exercise counts + specimen
  console.log('expand Sign Out:', await clickMaybe(page, 'Before patient leaves', 'button')); await sleep(600)
  console.log('Counts section header:', await has(page, 'COUNTS'))
  // Find sponges initial input via DOM
  await page.evaluate(() => {
    const labels = [...document.querySelectorAll('span')].filter(s => s.textContent?.trim().toLowerCase() === 'sponges')
    if (labels[0]) {
      const row = labels[0].parentElement
      const inputs = [...row.querySelectorAll('input[type="number"]')]
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(inputs[0], '20'); inputs[0].dispatchEvent(new Event('input', { bubbles: true })); inputs[0].dispatchEvent(new Event('blur', { bubbles: true }))
      setter.call(inputs[1], '20'); inputs[1].dispatchEvent(new Event('input', { bubbles: true })); inputs[1].dispatchEvent(new Event('blur', { bubbles: true }))
    }
  })
  await sleep(300)
  console.log('confirm sponge count:', await clickMaybe(page, 'Confirm', 'button')); await sleep(500)
  console.log('toast — sponges count correct:', await has(page, 'count correct') || await has(page, 'correct'))

  // Add a specimen
  await page.evaluate(() => {
    const input = [...document.querySelectorAll('input')].find(i => i.placeholder?.includes('Gallbladder'))
    if (input) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, 'value').set
      setter.call(input, 'Appendix - HPE')
      input.dispatchEvent(new Event('input', { bubbles: true }))
      input.dispatchEvent(new Event('blur', { bubbles: true }))
    }
  })
  await sleep(200)
  console.log('log specimen:', await clickMaybe(page, 'Log', 'button')); await sleep(500)
  console.log('specimen visible in list:', await has(page, 'Appendix'))

  // Add debrief
  await page.evaluate(() => {
    const txts = [...document.querySelectorAll('textarea')]
    const complications = txts.find(t => t.placeholder?.includes('Complications'))
    if (complications) {
      const setter = Object.getOwnPropertyDescriptor(window.HTMLTextAreaElement.prototype, 'value').set
      setter.call(complications, 'No intra-op complications. Routine course.')
      complications.dispatchEvent(new Event('input', { bubbles: true }))
    }
  })
  await sleep(200)
  console.log('save debrief:', await clickMaybe(page, 'Save debrief', 'button')); await sleep(500)
  console.log('debrief recorded confirm:', await has(page, 'Recorded'))

  await shot('ot-rev-checklist')

  // Verify existing /ot/dashboard still renders (back-compat)
  await navClick(page, 'OT Live'); await sleep(1100)
  console.log('OT Live still renders:', (await page.evaluate(() => document.body.innerText.length)) > 400)
  await shot('ot-rev-dashboard')

  await browser.close()
  console.log('\nERRORS(' + errors.length + '):'); errors.forEach(e => console.log('  ', e)); console.log('DONE')
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
