const puppeteer = require('puppeteer-core')
const CHROME = 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
;(async () => {
  const b = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const p = await b.newPage()
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await p.evaluate(() => { try { localStorage.clear() } catch {} })
  await p.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  // Wait for both seed markers
  for (let i = 0; i < 60; i++) {
    const ready = await p.evaluate(() => {
      const boot = localStorage.getItem('agentix.api.v1.__bootstrap__') !== null
      const legacy = Object.keys(localStorage).some((k) => k.startsWith('agentix.legacy-seed.anil-'))
      return boot && legacy
    })
    if (ready) break
    await sleep(500)
  }
  await sleep(3000)

  // Click Operations + Reception
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Operations'))
    t?.click()
  })
  await sleep(600)
  await p.evaluate(() => {
    const t = [...document.querySelectorAll('button')].find((b) => (b.textContent || '').includes('Reception'))
    t?.click()
  })
  // GIVE THE LOGIN TONS OF TIME
  await sleep(5000)
  console.log('After login URL:', p.url())

  // Now navigate
  await p.goto('http://localhost:3000/reception/patients', { waitUntil: 'domcontentloaded' })
  await sleep(5000)
  console.log('After goto URL:', p.url())
  await p.screenshot({ path: 'C:\\Users\\Dell\\AppData\\Local\\Temp\\hms-shots\\debug-reception2.png', fullPage: true })

  const out = await p.evaluate(() => {
    const ps = JSON.parse(localStorage.getItem('agentix-patientstore') || '{}')?.state || {}
    const anil = (ps.patients || []).find((x) => x.id === 'PT-44012')
    const visible = document.body.innerText
    const today = new Date().toISOString().slice(0, 10)
    return {
      url: window.location.pathname,
      anilInStore: !!anil,
      anilRegDate: anil?.registeredDate,
      today,
      bodyHasAnil: visible.includes('Anil'),
      bodyHasReceptionPatients: visible.includes("Today's Queue") || visible.includes('Patients'),
      firstBodySnippet: visible.slice(0, 400),
    }
  })
  console.log(JSON.stringify(out, null, 2))
  await b.close()
})()
