/* M4-W4 visual capture — S9 NABH Evidence Live Cockpit · S10 DPDP/DISHA Self-Audit. */
const puppeteer = require('puppeteer-core')
const path = require('path')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const OUT = path.join(__dirname, '..', 'docs', 'specs', 'screens', 'M4-W4')
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

  // Admin role (Management tab → Admin tile)
  await clickByText(p, 'Management', 'button'); await sleep(1200)
  await p.evaluate(() => {
    const btn = [...document.querySelectorAll('button')].find((b) => /Analytics, staff/.test(b.textContent || ''))
    if (btn) btn.click()
  })
  await sleep(6000)

  // ── S9 — NABH Evidence Live Cockpit ──────────────────────────────────────
  await p.evaluate(() => {
    const a = [...document.querySelectorAll('a')]
      .find((x) => /Compliance/.test(x.textContent || '') && (x.getAttribute('href') || '').includes('/admin/compliance'))
    if (a) a.click(); else window.location.assign('/admin/compliance')
  })
  await sleep(8000)
  await p.screenshot({ path: path.join(OUT, 'M4-W4-S9-nabh-evidence.png'), fullPage: true })
  console.log('  shot S9 NABH evidence')

  // ── S10 — DPDP / DISHA Self-Audit ────────────────────────────────────────
  await p.evaluate(() => {
    const a = [...document.querySelectorAll('a')]
      .find((x) => (/DISHA|DPDP/.test(x.textContent || '')) && (x.getAttribute('href') || '').includes('/admin/disha'))
    if (a) a.click(); else window.location.assign('/admin/disha')
  })
  await sleep(8000)
  await p.screenshot({ path: path.join(OUT, 'M4-W4-S10-dpdp-selfaudit.png'), fullPage: true })
  console.log('  shot S10 DPDP self-audit')

  await b.close()
})()
