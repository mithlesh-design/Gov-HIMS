const puppeteer = require('puppeteer-core')
;(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] })
  const page = await b.newPage()
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 4500))

  // Trigger a mutation by clicking the Doctor role button
  const before = await page.evaluate(() => Object.keys(window.localStorage).filter(k => k.startsWith('agentix')).length)
  console.log('keys before mutation:', before)

  // Click a Clinical tab + Doctor card to enter the portal — this mutates useAuthStore
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('button')].find(b => (b.textContent || '').includes('Clinical'))
    t?.click()
  })
  await new Promise(r => setTimeout(r, 500))
  await page.evaluate(() => {
    const t = [...document.querySelectorAll('button')].find(b => (b.textContent || '').includes('Doctor'))
    t?.click()
  })
  await new Promise(r => setTimeout(r, 4000))

  const after = await page.evaluate(() => {
    return Object.keys(window.localStorage).filter(k => k.startsWith('agentix')).sort()
  })
  console.log('keys after auth mutation:', after.length)
  after.forEach(k => console.log('  ' + k))
  await b.close()
})()
