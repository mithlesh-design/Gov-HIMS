import type { LabSample } from '@/store/useLabStore'
import type { LabOrder } from '@/store/useLabOrdersStore'
import type { RadiologyScan } from '@/store/useRadiologyStore'
import type { Inpatient } from '@/store/useInpatientStore'

// Unifies lab, radiology and IPD investigation results that are finalised and
// awaiting the ordering doctor's sign-off. This is the "results come back to
// the doctor" half of the clinical loop.

export type ResultAck =
  | { source: 'lab'; id: string }
  | { source: 'radiology'; id: string }
  | { source: 'ipd'; patientId: string; testId: string }

export type ResultItem = {
  key: string
  source: 'lab' | 'radiology' | 'ipd'
  patient: string
  label: string
  value: string
  critical: boolean
  at: string
  ack: ResultAck
}

export function collectResults(
  doctorName: string,
  data: { labSamples?: LabSample[]; labOrders?: LabOrder[]; radScans: RadiologyScan[]; inpatients: Inpatient[] },
): ResultItem[] {
  const items: ResultItem[] = []

  // Prefer the rich LabOrder model — abnormal/critical analytes are surfaced
  // as a structured summary. Falls back to flat labSamples if labOrders isn't
  // provided (legacy callers).
  if (data.labOrders) {
    for (const order of data.labOrders) {
      if (order.doctorName !== doctorName) continue
      for (const t of order.tests) {
        if (t.status !== 'released' || t.acknowledgedAt) continue
        const critical = t.analytes.some(a => a.flag === 'CH' || a.flag === 'CL')
        const abnormal = t.analytes.filter(a => a.flag !== 'N')
        const summary = abnormal.length
          ? abnormal.map(a => `${a.analyte} ${a.value} ${a.unit} ${a.flag === 'CH' ? '⬆⬆' : a.flag === 'CL' ? '⬇⬇' : a.flag === 'H' ? '⬆' : '⬇'}`).join(' · ')
          : (t.micro?.finalReport ?? 'Within reference range')
        items.push({
          key: `lab-${t.id}`, source: 'lab', patient: order.patientName,
          label: t.name, value: summary, critical,
          at: t.releasedAt ?? t.orderedAt,
          ack: { source: 'lab', id: t.id },
        })
      }
    }
  } else if (data.labSamples) {
    for (const s of data.labSamples) {
      if (s.status === 'Completed' && s.orderedBy === doctorName && !s.acknowledgedAt) {
        items.push({ key: `lab-${s.id}`, source: 'lab', patient: s.patientName, label: s.testName, value: s.result ?? 'Result finalised', critical: !!s.criticalValue, at: s.orderedAt ?? '', ack: { source: 'lab', id: s.id } })
      }
    }
  }

  for (const r of data.radScans) {
    if ((r.status === 'Reported' || r.status === 'Ready for Review') && r.orderedBy === doctorName && !r.reviewedAt) {
      items.push({ key: `rad-${r.id}`, source: 'radiology', patient: r.patientName, label: `${r.scanType}${r.bodyPart ? ` — ${r.bodyPart}` : ''}`, value: r.aiFinding ?? 'Report ready', critical: false, at: r.scheduledAt ?? '', ack: { source: 'radiology', id: r.id } })
    }
  }

  for (const ip of data.inpatients) {
    if (ip.admittingDoctor !== doctorName) continue
    for (const t of ip.tests) {
      if (t.status === 'Ready' && t.result && !t.acknowledgedAt) {
        items.push({ key: `ipd-${ip.patientId}-${t.id}`, source: 'ipd', patient: ip.name, label: t.name, value: t.result, critical: !!t.critical, at: t.resultAt ?? t.orderedAt, ack: { source: 'ipd', patientId: ip.patientId, testId: t.id } })
      }
    }
  }

  // Critical first, then most recent.
  return items.sort((a, b) => (a.critical === b.critical ? b.at.localeCompare(a.at) : a.critical ? -1 : 1))
}
