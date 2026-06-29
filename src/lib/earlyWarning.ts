import { lastRound, isRoundDue, latestVitalsRecord, type Inpatient, type Vitals } from '@/store/useInpatientStore'
import { news2FromRecord, type Band, type News2 } from '@/lib/vitals'

// Deterministic early-warning scoring. `news2` approximates the NEWS2 score from
// the doctor's round vitals (strings). The nurse now records a comprehensive
// numeric vitals set; `ipdInsights` prefers that (via `news2FromRecord`) when
// available, falling back to the round vitals otherwise. It's a decision aid,
// not a substitute for the full chart.

export type { Band, News2 } from '@/lib/vitals'

const num = (s: string | undefined) => { const m = (s ?? '').match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN }
const fToC = (f: number) => (f - 32) * 5 / 9

export function news2(vitals?: Vitals): News2 {
  if (!vitals) return { score: 0, band: 'low', drivers: [], partial: true }
  let score = 0
  const drivers: string[] = []
  let anyThree = false
  const bump = (pts: number, label: string) => { score += pts; if (pts >= 2) drivers.push(label); if (pts === 3) anyThree = true }

  const spo2 = num(vitals.spo2)
  if (!isNaN(spo2)) {
    if (spo2 <= 91) bump(3, `SpO₂ ${spo2}%`)
    else if (spo2 <= 93) bump(2, `SpO₂ ${spo2}%`)
    else if (spo2 <= 95) bump(1, `SpO₂ ${spo2}%`)
  }
  const sys = num((vitals.bp ?? '').split('/')[0])
  if (!isNaN(sys)) {
    if (sys >= 220) bump(3, `BP ${vitals.bp}`)
    else if (sys <= 90) bump(3, `BP ${vitals.bp}`)
    else if (sys <= 100) bump(2, `BP ${vitals.bp}`)
    else if (sys <= 110) bump(1, `BP ${vitals.bp}`)
  }
  const pulse = num(vitals.pulse)
  if (!isNaN(pulse)) {
    if (pulse <= 40 || pulse >= 131) bump(3, `Pulse ${pulse}`)
    else if (pulse >= 111) bump(2, `Pulse ${pulse}`)
    else if (pulse <= 50 || pulse >= 91) bump(1, `Pulse ${pulse}`)
  }
  const tRaw = num(vitals.temp)
  if (!isNaN(tRaw)) {
    const c = (vitals.temp ?? '').toLowerCase().includes('f') ? fToC(tRaw) : tRaw
    if (c <= 35) bump(3, `Temp ${vitals.temp}`)
    else if (c >= 39.1) bump(2, `Temp ${vitals.temp}`)
    else if (c <= 36 || c >= 38.1) bump(1, `Temp ${vitals.temp}`)
  }
  const rr = num(vitals.rr)
  if (!isNaN(rr)) {
    if (rr <= 8 || rr >= 25) bump(3, `RR ${rr}`)
    else if (rr >= 21) bump(2, `RR ${rr}`)
    else if (rr <= 11) bump(1, `RR ${rr}`)
  }
  const avpu = (vitals.avpu ?? '').toUpperCase()
  if (avpu && avpu !== 'A') bump(3, `Consciousness ${avpu}`)

  const band: Band = score >= 7 ? 'high' : (score >= 5 || anyThree) ? 'medium' : 'low'
  // "partial" when respiratory rate wasn't captured (the main missing parameter).
  return { score, band, drivers, partial: isNaN(rr) }
}

// NEWS score for each completed round that has vitals (oldest→newest) — the trend.
export function newsTrend(ip: Inpatient): { at: string; score: number }[] {
  return ip.rounds
    .filter(r => r.done && r.vitals)
    .sort((a, b) => (a.doneAt ?? '').localeCompare(b.doneAt ?? ''))
    .map(r => ({ at: r.doneAt ?? '', score: news2(r.vitals).score }))
}

export type IpdInsight = {
  risk: Band
  flag: string                 // short chip text for the table
  actions: string[]            // suggested next actions for the doctor
  news: News2
  patientReassurance: string   // plain-language version for the patient portal
}

const CONDITION_RANK: Record<string, number> = { Critical: 3, Serious: 2, Stable: 1, Improving: 0, 'Discharge-ready': 0 }
const rankToBand = (r: number): Band => r >= 3 ? 'high' : r >= 2 ? 'medium' : 'low'
const maxBand = (a: Band, b: Band): Band => { const o = { low: 0, medium: 1, high: 2 } as const; return o[a] >= o[b] ? a : b }

export function ipdInsights(ip: Inpatient): IpdInsight {
  const rec = latestVitalsRecord(ip)
  const news = rec ? news2FromRecord(rec) : news2(lastRound(ip)?.vitals)
  const due = isRoundDue(ip)
  const criticalResult = ip.tests.some(t => t.critical && t.status === 'Ready')
  const condBand = rankToBand(CONDITION_RANK[ip.condition] ?? 1)

  const trend = newsTrend(ip)
  const rising = trend.length >= 2 && trend[trend.length - 1].score > trend[trend.length - 2].score

  let risk = maxBand(news.band, condBand)
  if (criticalResult) risk = maxBand(risk, 'high')
  if (rising) risk = maxBand(risk, 'medium')
  if (due && risk === 'low') risk = 'medium'

  const actions: string[] = []
  if (criticalResult) actions.push('Review the flagged critical result now')
  if (rising) actions.push('NEWS rising vs last round — reassess sooner')
  if (news.band === 'high') actions.push('Escalate — early-warning score is high; consider ICU/senior review')
  else if (news.band === 'medium') actions.push('Increase monitoring frequency')
  if (due) actions.push('Overdue round — review at the bedside')
  if (ip.condition === 'Discharge-ready') actions.push('Fit for discharge — start TTO + follow-up')
  if (!actions.length) actions.push('Continue current management; reassess at next round')

  let flag: string
  if (criticalResult) flag = 'Critical result to review'
  else if (news.band === 'high') flag = `High NEWS${news.drivers[0] ? ` · ${news.drivers[0]}` : ''}`
  else if (due) flag = 'Round overdue'
  else if (ip.condition === 'Critical') flag = 'Critical — close monitoring'
  else if (ip.condition === 'Discharge-ready') flag = 'Ready for discharge'
  else if (news.band === 'medium') flag = `Watch${news.drivers[0] ? ` · ${news.drivers[0]}` : ''}`
  else if (ip.condition === 'Serious') flag = 'Serious — monitor'
  else flag = ip.condition === 'Improving' ? 'Improving' : 'Stable'

  const patientReassurance = ip.condition === 'Critical'
    ? 'Your care team is monitoring you very closely and is by your side.'
    : ip.condition === 'Discharge-ready'
      ? 'Good news — you are doing well and almost ready to go home.'
      : ip.condition === 'Improving'
        ? 'You are improving steadily — keep it up.'
        : 'You are stable and being looked after closely.'

  return { risk, flag, actions, news, patientReassurance }
}
