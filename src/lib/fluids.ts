import type { Inpatient, IoEntry, IvLine } from "@/store/useInpatientStore"

// Fluid-balance + infusion math for the nurse's I/O chart. Deterministic and
// explainable; the AI alerts are simple grounded thresholds on real numbers.

export type Balance = { intake: number; output: number; net: number; windowHrs: number }

const num = (s?: string) => { const m = (s ?? "").match(/-?\d+(\.\d+)?/); return m ? parseFloat(m[0]) : NaN }
const hoursSince = (iso: string) => (Date.now() - new Date(iso).getTime()) / 3600000

// Net fluid balance over the trailing window (default 24h).
export function fluidBalance(io: IoEntry[] | undefined, windowHrs = 24): Balance {
  const recent = (io ?? []).filter(e => hoursSince(e.at) <= windowHrs)
  const intake = recent.filter(e => e.kind === "intake").reduce((a, e) => a + e.volume, 0)
  const output = recent.filter(e => e.kind === "output").reduce((a, e) => a + e.volume, 0)
  return { intake, output, net: intake - output, windowHrs }
}

export type IvStatus = {
  rateMlHr?: number
  remaining?: number      // mL left in a finite bag
  minutesLeft?: number    // until the bag empties
  ageHrs: number
  endingSoon: boolean     // < 30 min left
  resiteDue: boolean      // cannula in > 72h
}

export function ivStatus(line: IvLine): IvStatus {
  const rate = num(line.rate)
  const ageHrs = hoursSince(line.startedAt)
  const out: IvStatus = { ageHrs, endingSoon: false, resiteDue: ageHrs > 72 && line.status === "Running" }
  if (!isNaN(rate)) out.rateMlHr = rate
  if (line.volume && !isNaN(rate) && rate > 0 && line.status === "Running") {
    const infused = rate * ageHrs
    const remaining = Math.max(0, Math.round(line.volume - infused))
    out.remaining = remaining
    out.minutesLeft = Math.round((remaining / rate) * 60)
    out.endingSoon = out.minutesLeft <= 60
  }
  return out
}

export type FluidAlert = { severity: "warning" | "critical"; text: string }

// AI fluid alerts for one patient: imbalance + infusion/cannula attention.
export function fluidAlerts(ip: Inpatient): FluidAlert[] {
  const alerts: FluidAlert[] = []
  const bal = fluidBalance(ip.io)
  if (bal.intake + bal.output > 0) {
    if (bal.net <= -500) alerts.push({ severity: "critical", text: `Negative fluid balance (${bal.net} mL) — review hydration` })
    else if (bal.net >= 1500) alerts.push({ severity: "warning", text: `Positive balance (+${bal.net} mL) — fluid overload risk` })
  }
  for (const l of ip.ivLines ?? []) {
    const s = ivStatus(l)
    if (s.endingSoon) alerts.push({ severity: "warning", text: `${l.fluid} ending in ~${s.minutesLeft} min — prepare next bag` })
    if (s.resiteDue) alerts.push({ severity: "warning", text: `${l.fluid} cannula in >72h — resite due` })
  }
  return alerts
}
