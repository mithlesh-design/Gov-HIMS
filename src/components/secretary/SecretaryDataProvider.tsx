'use client'

import { useEffect } from 'react'
import { useSecretarySessionStore }       from '@/store/useSecretarySessionStore'
import { useSecretaryAlertsStore }        from '@/store/useSecretaryAlertsStore'
import { useSecretaryApprovalsStore }     from '@/store/useSecretaryApprovalsStore'
import { useSecretaryDistrictsStore }     from '@/store/useSecretaryDistrictsStore'
import { useSecretaryMobilizationStore }  from '@/store/useSecretaryMobilizationStore'
import { useSecretaryNitiStore }          from '@/store/useSecretaryNitiStore'
import { useSecretaryAbdmStore }          from '@/store/useSecretaryAbdmStore'
import { useSecretaryMedicalCollegesStore } from '@/store/useSecretaryMedicalCollegesStore'
import { useSecretaryAssemblyStore }      from '@/store/useSecretaryAssemblyStore'
import { useSecretaryCentreStore }        from '@/store/useSecretaryCentreStore'
import { useSecretaryAuditStore }         from '@/store/useSecretaryAuditStore'
import { startSecretaryLiveSimulator, stopSecretaryLiveSimulator } from '@/lib/mocks/secretary/live-simulator'

export function SecretaryDataProvider({ children }: { children: React.ReactNode }) {
  const { fetchSession }    = useSecretarySessionStore()
  const alertsStore         = useSecretaryAlertsStore()
  const approvalsStore      = useSecretaryApprovalsStore()
  const districtsStore      = useSecretaryDistrictsStore()
  const mobilizationStore   = useSecretaryMobilizationStore()
  const nitiStore           = useSecretaryNitiStore()
  const abdmStore           = useSecretaryAbdmStore()
  const collegesStore       = useSecretaryMedicalCollegesStore()
  const assemblyStore       = useSecretaryAssemblyStore()
  const centreStore         = useSecretaryCentreStore()
  const auditStore          = useSecretaryAuditStore()

  useEffect(() => {
    // Fetch all data on mount
    fetchSession()
    alertsStore.fetchAlerts()
    approvalsStore.fetchApprovals()
    districtsStore.fetchDistricts()
    mobilizationStore.fetchRequests()
    nitiStore.fetchIndicators()
    abdmStore.fetchMilestones()
    collegesStore.fetchColleges()
    assemblyStore.fetchQuestions()
    centreStore.fetchCorrespondence()
    auditStore.fetchLog()

    // Start live simulator
    startSecretaryLiveSimulator({
      onNewAlert:            (a) => alertsStore.pushAlert(a),
      onDistrictTick:        (d) => districtsStore.tickDistrict(d.id, 0),
      onNitiTick:            (n) => nitiStore.tickIndicator(n),
      onNewMobilization:     (r) => mobilizationStore.pushRequest(r),
      onMobilizationEtaTick: ()  => mobilizationStore.tickEtas(),
      onAgeAlerts:           ()  => alertsStore.ageAlerts(),
    })

    return () => stopSecretaryLiveSimulator()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return <>{children}</>
}
