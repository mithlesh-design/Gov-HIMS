import type { AbdmMilestone } from '@/types/secretary'

export const seedAbdmMilestones: AbdmMilestone[] = [
  {
    id: 'M1',
    name: 'Basic ABDM Compliance',
    description: 'All public health facilities registered on HFR (Health Facility Registry). State ABDM nodal officer appointed. ABHA creation drive completed at district hospitals.',
    status: 'achieved',
    progressPct: 100,
    incentiveAmountCr: 15,
    earnedCr: 15,
    achievedAt: '2024-01-15',
  },
  {
    id: 'M2',
    name: 'ABHA Creation & HFR Registration',
    description: 'ABHA IDs created for ≥70% target population. All 1,247 facilities registered and verified on HFR. Health professional registry (HPR) linked for ≥60% of doctors and nurses.',
    status: 'achieved',
    progressPct: 74,
    incentiveAmountCr: 25,
    earnedCr: 18.5,
    achievedAt: '2024-03-22',
  },
  {
    id: 'M3',
    name: 'FHIR Exchange & UHI Integration',
    description: 'HL7 FHIR-compliant health data exchange enabled at ≥30% of facilities. UHI (Unified Health Interface) plugin deployed for teleconsultation. Linked health records pilot in 5 districts.',
    status: 'in-progress',
    progressPct: 32,
    incentiveAmountCr: 40,
    earnedCr: 0,
  },
  {
    id: 'M4',
    name: 'Clinical Decision Support & Advanced Analytics',
    description: 'AI-based clinical decision support deployed at medical colleges. Population health management dashboard operational. Real-time disease surveillance integrated with IHIP and ABDM.',
    status: 'not-started',
    progressPct: 0,
    incentiveAmountCr: 50,
    earnedCr: 0,
  },
]
