const puppeteer = require('puppeteer-core')
;(async () => {
  const b = await puppeteer.launch({ executablePath: 'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe', headless: true, args: ['--no-sandbox'] })
  const page = await b.newPage()
  await page.goto('http://localhost:3000/', { waitUntil: 'domcontentloaded' })
  await new Promise(r => setTimeout(r, 4500))
  const out = await page.evaluate(() => {
    const all = []
    for (let i = 0; i < window.localStorage.length; i++) {
      const k = window.localStorage.key(i)
      if (k && (k.startsWith('agentix'))) all.push(k)
    }
    return all.sort()
  })
  console.log('PRESENT:', out.length)
  out.forEach(k => console.log('  ' + k))
  await b.close()
})()
