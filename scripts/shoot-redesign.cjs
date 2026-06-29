const puppeteer = require('puppeteer-core')
const fs = require('fs')
const CHROME = '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome'
const OUT = '/tmp/hms-redesign'
const BASE = 'http://localhost:3000'
fs.mkdirSync(OUT, { recursive: true })
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

const USERS = {
  admin: { id: 'ADM-01', name: 'Rajesh Kulkarni', role: 'admin' },
  doctor: { id: 'DR-1012', name: 'Dr. Priya Nair', role: 'doctor', department: 'General Medicine' },
  nurse: { id: 'NR-402', name: 'Anjali Desai', role: 'nurse', department: 'General Ward' },
  reception: { id: 'RC-204', name: 'Sunita Joshi', role: 'reception' },
  lab: { id: 'LB-992', name: 'Neha Gupta', role: 'lab', department: 'Pathology' },
  patient: { id: 'PT-20394', name: 'Kiran Patil', role: 'patient' },
}

;(async () => {
  const browser = await puppeteer.launch({ executablePath: CHROME, headless: true, args: ['--no-sandbox'] })
  const page = await browser.newPage()
  await page.setViewport({ width: 1440, height: 1024, deviceScaleFactor: 1 })
  const shot = async (name) => { await sleep(600); await page.screenshot({ path: `${OUT}/${name}.png` }); console.log('shot', name) }

  await page.goto(`${BASE}/`, { waitUntil: 'networkidle2' }); await shot('01-login')

  const targets = [
    ['admin', '/admin/command-center', '02-admin-command'],
    ['doctor', '/doctor/dashboard', '03-doctor'],
    ['nurse', '/nurse/dashboard', '04-nurse'],
    ['reception', '/reception/opd', '05-reception-opd'],
    ['lab', '/lab/dashboard', '06-lab'],
    ['patient', '/patient/dashboard', '07-patient'],
  ]
  for (const [role, path, name] of targets) {
    const payload = JSON.stringify({ state: { currentUser: USERS[role], activeRole: role }, version: 1 })
    await page.evaluateOnNewDocument((p) => { localStorage.setItem('agentix-authstore', p) }, payload)
    await page.goto(`${BASE}${path}`, { waitUntil: 'networkidle2' })
    await sleep(900)
    await shot(name)
  }
  await browser.close()
  console.log('DONE ->', OUT)
})().catch((e) => { console.error('ERR', e.message); process.exit(1) })
