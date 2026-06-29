"use client"
import { useEffect } from 'react'
import { useCmoSessionStore }    from '@/store/useCmoSessionStore'
import { useCmoAlertsStore }     from '@/store/useCmoAlertsStore'
import { useCmoApprovalsStore }  from '@/store/useCmoApprovalsStore'
import { useCmoBedsStore }       from '@/store/useCmoBedsStore'
import { useCmoAmbulancesStore } from '@/store/useCmoAmbulancesStore'
import { startLiveSimulator }    from '@/lib/mocks/cmo/live-simulator'

export function CmoDataProvider({ children }: { children: React.ReactNode }) {
  const fetchSession   = useCmoSessionStore(s => s.fetchSession)
  const fetchAlerts    = useCmoAlertsStore(s => s.fetchAlerts)
  const fetchApprovals = useCmoApprovalsStore(s => s.fetchApprovals)
  const pushAlert      = useCmoAlertsStore(s => s.pushAlert)
  const ageAlerts      = useCmoAlertsStore(s => s.ageAlerts)
  const tickBeds       = useCmoBedsStore(s => s.tick)
  const fetchBeds      = useCmoBedsStore(s => s.fetchBedNetwork)
  const tickAmb        = useCmoAmbulancesStore(s => s.tickVitalsAndEta)
  const fetchAmb       = useCmoAmbulancesStore(s => s.fetchAmbulances)

  useEffect(() => {
    fetchSession()
    fetchAlerts()
    fetchApprovals()
    fetchBeds()
    fetchAmb()
  }, [fetchSession, fetchAlerts, fetchApprovals, fetchBeds, fetchAmb])

  useEffect(() => {
    startLiveSimulator(pushAlert, ageAlerts)
  }, [pushAlert, ageAlerts])

  useEffect(() => {
    const t = setInterval(tickBeds, 30_000)
    return () => clearInterval(t)
  }, [tickBeds])

  useEffect(() => {
    const t = setInterval(tickAmb, 5_000)
    return () => clearInterval(t)
  }, [tickAmb])

  return <>{children}</>
}
