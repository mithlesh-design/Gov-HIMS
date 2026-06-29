// Secretary live simulator — pushes fake real-time updates to stores
// Pattern: same as CMO live-simulator. Singleton interval-based.

import { mockSecretaryApi } from './api'
import { seedDistricts }    from './seed-districts'

let _alertInterval:        ReturnType<typeof setInterval> | null = null
let _districtInterval:     ReturnType<typeof setInterval> | null = null
let _nitiInterval:         ReturnType<typeof setInterval> | null = null
let _mobilizationInterval: ReturnType<typeof setInterval> | null = null
let _etaInterval:          ReturnType<typeof setInterval> | null = null
let _ageInterval:          ReturnType<typeof setInterval> | null = null

const districtIds = seedDistricts.map(d => d.id)

export function startSecretaryLiveSimulator(callbacks: {
  onNewAlert:          (a: ReturnType<typeof mockSecretaryApi.pushLiveAlert>) => void
  onDistrictTick:      (d: ReturnType<typeof mockSecretaryApi.tickDistrictScore>) => void
  onNitiTick:          (n: ReturnType<typeof mockSecretaryApi.tickNitiIndicator>) => void
  onNewMobilization:   (r: ReturnType<typeof mockSecretaryApi.pushLiveMobilizationRequest>) => void
  onMobilizationEtaTick: () => void
  onAgeAlerts:         () => void
}) {
  if (_alertInterval) return // already running

  // New state-level alert every 90 seconds
  _alertInterval = setInterval(() => {
    const alert = mockSecretaryApi.pushLiveAlert()
    callbacks.onNewAlert(alert)
  }, 90_000)

  // District score tick every 60 seconds — one random district
  _districtInterval = setInterval(() => {
    const id    = districtIds[Math.floor(Math.random() * districtIds.length)]
    const delta = Math.random() > 0.5 ? 1 : -1
    const updated = mockSecretaryApi.tickDistrictScore(id, delta)
    callbacks.onDistrictTick(updated)
  }, 60_000)

  // NITI indicator update every 2 minutes
  _nitiInterval = setInterval(() => {
    const updated = mockSecretaryApi.tickNitiIndicator()
    callbacks.onNitiTick(updated)
  }, 120_000)

  // New mobilization request every 3 minutes
  _mobilizationInterval = setInterval(() => {
    const req = mockSecretaryApi.pushLiveMobilizationRequest()
    callbacks.onNewMobilization(req)
  }, 180_000)

  // ETA countdown for in-transit mobilizations every 30s
  _etaInterval = setInterval(() => {
    mockSecretaryApi.tickMobilizationEta()
    callbacks.onMobilizationEtaTick()
  }, 30_000)

  // Age alerts every 90s
  _ageInterval = setInterval(() => {
    mockSecretaryApi.ageAlerts()
    callbacks.onAgeAlerts()
  }, 90_000)
}

export function stopSecretaryLiveSimulator() {
  if (_alertInterval)        clearInterval(_alertInterval)
  if (_districtInterval)     clearInterval(_districtInterval)
  if (_nitiInterval)         clearInterval(_nitiInterval)
  if (_mobilizationInterval) clearInterval(_mobilizationInterval)
  if (_etaInterval)          clearInterval(_etaInterval)
  if (_ageInterval)          clearInterval(_ageInterval)
  _alertInterval = _districtInterval = _nitiInterval = _mobilizationInterval = _etaInterval = _ageInterval = null
}
