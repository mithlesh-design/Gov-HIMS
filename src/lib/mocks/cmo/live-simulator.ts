import type { Alert } from '@/types/cmo'

let started = false

const surpriseAlerts: Alert[] = [
  {
    id: 'sim_1',
    severity: 'warning',
    iconTabler: 'thermometer',
    title: 'Fever clinic surge · PHC Phanda',
    detail: '23 walk-ins in last hour · 3× baseline · possible viral cluster',
    facility: 'PHC Phanda',
    source: 'surveillance',
    ageMinutes: 0,
    acknowledged: false,
    owner: null,
    recommendedActions: ['Deploy RDT kits to PHC Phanda', 'Alert BMO Phanda', 'Monitor for 24h'],
    timeline: [{ timestamp: new Date().toISOString(), actor: 'System', action: 'Surge alert auto-generated' }],
  },
  {
    id: 'sim_2',
    severity: 'critical',
    iconTabler: 'baby-carriage',
    title: 'Neonatal distress · PHC Karond',
    detail: 'Preterm delivery 30 weeks · NICU referral needed · ambulance dispatched',
    facility: 'PHC Karond',
    source: 'quality',
    ageMinutes: 0,
    acknowledged: false,
    owner: null,
    recommendedActions: ['Confirm NICU bed at Hamidia DH', 'Dispatch 102 ambulance', 'Alert neonatologist'],
    timeline: [{ timestamp: new Date().toISOString(), actor: 'PHC Karond', action: 'Emergency alert raised' }],
  },
  {
    id: 'sim_3',
    severity: 'warning',
    iconTabler: 'building-hospital',
    title: 'Generator failure · CHC Bairagarh',
    detail: 'Main power out since 10 min · backup generator failed · OT halted',
    facility: 'CHC Bairagarh',
    source: 'quality',
    ageMinutes: 0,
    acknowledged: false,
    owner: null,
    recommendedActions: ['Contact MPEB emergency line', 'Reschedule OT procedures', 'Activate crisis protocol'],
    timeline: [{ timestamp: new Date().toISOString(), actor: 'Equipment System', action: 'Power failure detected' }],
  },
  {
    id: 'sim_4',
    severity: 'info',
    iconTabler: 'ambulance',
    title: 'Mass casualty alert · NH-12 RTA',
    detail: 'Bus accident reported · est. 18 casualties · trauma team on standby',
    facility: 'Hamidia DH',
    source: 'surveillance',
    ageMinutes: 0,
    acknowledged: false,
    owner: null,
    recommendedActions: ['Activate MCI protocol', 'Alert all trauma surgeons', 'Clear ER bays'],
    timeline: [{ timestamp: new Date().toISOString(), actor: '108 Control Room', action: 'MCI notification received' }],
  },
]

export function startLiveSimulator(
  addAlert: (alert: Alert) => void,
  ageAlerts: () => void,
) {
  if (started) return
  started = true

  let idx = 0

  // Push new alert every 90 seconds
  setInterval(() => {
    if (idx < surpriseAlerts.length) {
      addAlert({
        ...surpriseAlerts[idx],
        id: `${surpriseAlerts[idx].id}_${Date.now()}`,
        ageMinutes: 0,
        timeline: [{ timestamp: new Date().toISOString(), actor: 'System', action: 'Live alert pushed' }],
      })
      idx++
    }
  }, 90_000)

  // Age existing alerts every 10 seconds
  setInterval(() => {
    ageAlerts()
  }, 10_000)
}

export function resetSimulator() {
  started = false
}
