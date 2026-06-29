/* M4-W3 visual capture — S7 Predictive Ops Cockpit · S8 RCM Growth Cockpit. */
const puppeteer = require('puppeteer-core')
const path = require('path')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(__dirname, '..', 'docs', 'specs', 'screens', 'M4-W3')
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

async function clickByText(page, text, sel = 'button') {
  return page.evaluate((t, s) => {
    const el = [...document.querySelectorAll(s)].find((e) => (e.textContent || '').includes(t) && !e.disabled)
    if (el) { el.click(); return true } return false
  }, text, sel)
}

;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.setViewport({ width: 1500, height: 1100 })

  // Fresh seed
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear() } catch {} })
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  for (let i = 0; i < 60; i++) {
    const ready = await p.evaluate(() =>
      localStorage.getItem('agentix.api.v1.__bootstrap__') !== null &&
      Object.keys(localStorage).some((k) => k.startsWith('agentix.legacy-seed.anil-')))
    if (ready) break
    await sleep(500)
  }
  await sleep(2500)

  // Admin lives under the "Management" tab on the role picker.
  await clickByText(p, 'Management', 'button'); await sleep(1200)
  // Click the Admin tile by its description text
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button')]
      .find((b) => /Analytics, staff/.test(b.textContent || ''))
    if (btn) btn.click()
  })
  await sleep(6000)

  // ── S7 — Predictive Operations Cockpit (admin/operations) ──────────────
  // Now that admin role is loaded, navigating within /admin/* doesn't hit the gate.
  await p.evaluate(() => {
    const a = [...document.querySelectorAll('a')]
      .find((x) => /^Operations\b/.test((x.textContent || '').trim()) && (x.getAttribute('href') || '').includes('/admin/operations'))
    if (a) (a).click()
    else window.location.assign('/admin/operations')
  })
  await sleep(8000)
  await p.screenshot({ path: path.join(OUT, 'M4-W3-S7-predictive-ops.png'), fullPage: true })
  console.log('  shot S7 predictive ops')

  // ── S8 — Revenue-Cycle Growth Cockpit (admin/finance) ──────────────────
  await p.evaluate(() => {
    const a = [...document.querySelectorAll('a')]
      .find((x) => /Hospital P&L/.test(x.textContent || '') || (x.getAttribute('href') || '').includes('/admin/finance'))
    if (a) (a).click()
    else window.location.assign('/admin/finance')
  })
  await sleep(8000)
  await p.screenshot({ path: path.join(OUT, 'M4-W3-S8-rcm-growth.png'), fullPage: true })
  console.log('  shot S8 RCM growth')

  await b.close()
})()
