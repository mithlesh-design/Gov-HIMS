import type { BedNetworkSummary, WardType, Bed } from '@/types/cmo'

const wardTypes: WardType[] = ['General', 'ICU', 'NICU', 'Ventilator', 'Isolation', 'Pediatric', 'Maternity']

function makeBeds(prefix: string, total: number, usedCount: number): Bed[] {
  return Array.from({ length: total }, (_, i) => ({
    id: `${prefix}-${String(i + 1).padStart(3, '0')}`,
    number: `${prefix}${String(i + 1).padStart(3, '0')}`,
    status: i < usedCount ? 'occupied' : i === usedCount ? 'cleaning' : 'free',
    patientId: i < usedCount ? `PT-${10000 + i}` : undefined,
    patientName: i < usedCount ? ['Ramesh Kumar', 'Sunita Devi', 'Ajay Sharma', 'Meena Patel', 'Vijay Singh', 'Asha Rani', 'Mohan Lal', 'Geeta Bai', 'Dinesh Yadav', 'Kavita Mishra'][i % 10] : undefined,
    admittedAt: i < usedCount ? new Date(Date.now() - (i + 1) * 3600000 * 6).toISOString() : undefined,
  }))
}

export const seedBeds: BedNetworkSummary = {
  totalBeds: 2847,
  occupied: 2103,
  byType: {
    General:    { used: 1680, total: 2200 },
    ICU:        { used: 78,   total: 89   },
    NICU:       { used: 24,   total: 30   },
    Ventilator: { used: 41,   total: 52   },
    Isolation:  { used: 12,   total: 24   },
    Pediatric:  { used: 187,  total: 230  },
    Maternity:  { used: 81,   total: 122  },
  },
  perFacility: [
    {
      facilityId: 'fac_dh_hamidia',
      facilityName: 'Hamidia DH',
      wards: {
        General:    { used: 380, total: 400, beds: makeBeds('HAM-G', 400, 380) },
        ICU:        { used: 31,  total: 33,  beds: makeBeds('HAM-I', 33, 31)   },
        NICU:       { used: 12,  total: 14,  beds: makeBeds('HAM-N', 14, 12)   },
        Ventilator: { used: 18,  total: 20,  beds: makeBeds('HAM-V', 20, 18)   },
        Isolation:  { used: 4,   total: 8,   beds: makeBeds('HAM-ISO', 8, 4)   },
        Pediatric:  { used: 48,  total: 60,  beds: makeBeds('HAM-P', 60, 48)   },
        Maternity:  { used: 22,  total: 30,  beds: makeBeds('HAM-M', 30, 22)   },
      },
    },
    {
      facilityId: 'fac_ch_kolar',
      facilityName: 'CH Kolar',
      wards: {
        General:    { used: 72, total: 80, beds: makeBeds('KOL-G', 80, 72) },
        ICU:        { used: 9,  total: 10, beds: makeBeds('KOL-I', 10, 9)  },
        NICU:       { used: 4,  total: 5,  beds: makeBeds('KOL-N', 5, 4)   },
        Ventilator: { used: 4,  total: 5,  beds: makeBeds('KOL-V', 5, 4)   },
        Isolation:  { used: 2,  total: 4,  beds: makeBeds('KOL-ISO', 4, 2) },
        Pediatric:  { used: 12, total: 15, beds: makeBeds('KOL-P', 15, 12) },
        Maternity:  { used: 8,  total: 10, beds: makeBeds('KOL-M', 10, 8)  },
      },
    },
    {
      facilityId: 'fac_ch_bairagarh',
      facilityName: 'CH Bairagarh',
      wards: {
        General:    { used: 58, total: 75, beds: makeBeds('BAI-G', 75, 58) },
        ICU:        { used: 7,  total: 10, beds: makeBeds('BAI-I', 10, 7)  },
        NICU:       { used: 3,  total: 5,  beds: makeBeds('BAI-N', 5, 3)   },
        Ventilator: { used: 4,  total: 6,  beds: makeBeds('BAI-V', 6, 4)   },
        Isolation:  { used: 1,  total: 3,  beds: makeBeds('BAI-ISO', 3, 1) },
        Pediatric:  { used: 18, total: 25, beds: makeBeds('BAI-P', 25, 18) },
        Maternity:  { used: 10, total: 15, beds: makeBeds('BAI-M', 15, 10) },
      },
    },
    {
      facilityId: 'fac_chc_berasia',
      facilityName: 'CHC Berasia',
      wards: {
        General:    { used: 38, total: 45, beds: makeBeds('BER-G', 45, 38) },
        ICU:        { used: 4,  total: 5,  beds: makeBeds('BER-I', 5, 4)   },
        NICU:       { used: 2,  total: 3,  beds: makeBeds('BER-N', 3, 2)   },
        Ventilator: { used: 2,  total: 3,  beds: makeBeds('BER-V', 3, 2)   },
        Isolation:  { used: 1,  total: 2,  beds: makeBeds('BER-ISO', 2, 1) },
        Pediatric:  { used: 8,  total: 10, beds: makeBeds('BER-P', 10, 8)  },
        Maternity:  { used: 12, total: 15, beds: makeBeds('BER-M', 15, 12) },
      },
    },
    {
      facilityId: 'fac_chc_phanda',
      facilityName: 'CHC Phanda',
      wards: {
        General:    { used: 28, total: 35, beds: makeBeds('PHA-G', 35, 28) },
        ICU:        { used: 3,  total: 4,  beds: makeBeds('PHA-I', 4, 3)   },
        NICU:       { used: 1,  total: 2,  beds: makeBeds('PHA-N', 2, 1)   },
        Ventilator: { used: 2,  total: 3,  beds: makeBeds('PHA-V', 3, 2)   },
        Isolation:  { used: 1,  total: 2,  beds: makeBeds('PHA-ISO', 2, 1) },
        Pediatric:  { used: 6,  total: 8,  beds: makeBeds('PHA-P', 8, 6)   },
        Maternity:  { used: 8,  total: 10, beds: makeBeds('PHA-M', 10, 8)  },
      },
    },
  ],
  aiSuggestion: {
    from: 'Hamidia DH ICU',
    to: 'JK Hospital (Private, Empanelled)',
    reason: 'Hamidia ICU at 94% occupancy. 3 stable post-op patients suitable for step-down transfer. JK Hospital 6 km away, 4 ICU beds available.',
    patients: 3,
  },
  recentTransfers: [
    { id: 'tr_001', from: 'CHC Berasia', to: 'Hamidia DH', patientName: 'Lata Bai', transferredAt: new Date(Date.now() - 2 * 3600000).toISOString(), status: 'completed' },
    { id: 'tr_002', from: 'PHC Phanda', to: 'CHC Berasia', patientName: 'Ramkali', transferredAt: new Date(Date.now() - 4 * 3600000).toISOString(), status: 'completed' },
    { id: 'tr_003', from: 'CH Kolar', to: 'Hamidia DH', patientName: 'Suresh M.', transferredAt: new Date(Date.now() - 6 * 3600000).toISOString(), status: 'completed' },
    { id: 'tr_004', from: 'CHC Phanda', to: 'CH Bairagarh', patientName: 'Meena D.', transferredAt: new Date(Date.now() - 8 * 3600000).toISOString(), status: 'completed' },
    { id: 'tr_005', from: 'Hamidia DH ICU', to: 'JK Hospital', patientName: 'Anil Kumar', transferredAt: new Date(Date.now() - 12 * 3600000).toISOString(), status: 'pending' },
  ],
}
