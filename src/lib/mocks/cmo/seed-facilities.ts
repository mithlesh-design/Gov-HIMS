import type { Facility } from '@/types/cmo'

const blocks = ['Bhopal Urban', 'Berasia', 'Phanda', 'Bairagarh', 'Kolar']

function rnd(min: number, max: number) {
  return Math.floor(Math.random() * (max - min + 1)) + min
}

// Seeded random using index so it's deterministic
function seededRnd(seed: number, min: number, max: number) {
  const x = Math.sin(seed + 1) * 10000
  const r = x - Math.floor(x)
  return Math.floor(r * (max - min + 1)) + min
}

function makeStatus(seed: number): Facility['status'] {
  const v = seededRnd(seed, 0, 9)
  if (v <= 0) return 'critical'
  if (v <= 2) return 'warning'
  if (v <= 4) return 'watch'
  return 'ok'
}

export const seedFacilities: Facility[] = [
  // DH — always critical
  {
    id: 'fac_dh_hamidia',
    name: 'Hamidia District Hospital',
    type: 'DH',
    block: 'Bhopal Urban',
    status: 'critical',
    beds: { used: 459, total: 487 },
    opdToday: 1247,
    ipdCensusToday: 459,
    nqasScore: 78,
    lastVisited: '2026-05-14',
    alertsCount: 3,
    population: 380000,
    staffCount: 412,
    lat: 23.2599,
    lng: 77.4126,
  },
  // CH
  {
    id: 'fac_ch_kolar',
    name: 'Community Hospital Kolar',
    type: 'CH',
    block: 'Kolar',
    status: 'critical',
    beds: { used: 88, total: 100 },
    opdToday: 312,
    ipdCensusToday: 88,
    nqasScore: 61,
    lastVisited: '2026-04-22',
    alertsCount: 2,
    population: 95000,
    staffCount: 87,
    lat: 23.1750,
    lng: 77.5200,
  },
  {
    id: 'fac_ch_bairagarh',
    name: 'Community Hospital Bairagarh',
    type: 'CH',
    block: 'Bairagarh',
    status: 'watch',
    beds: { used: 71, total: 100 },
    opdToday: 267,
    ipdCensusToday: 71,
    nqasScore: 70,
    lastVisited: '2026-05-30',
    alertsCount: 1,
    population: 110000,
    staffCount: 74,
    lat: 23.2900,
    lng: 77.3200,
  },
  // CHCs
  {
    id: 'fac_chc_berasia',
    name: 'CHC Berasia',
    type: 'CHC',
    block: 'Berasia',
    status: 'warning',
    beds: { used: 47, total: 60 },
    opdToday: 218,
    ipdCensusToday: 47,
    nqasScore: 65,
    lastVisited: '2026-06-01',
    alertsCount: 2,
    population: 65000,
    staffCount: 42,
    lat: 23.6200,
    lng: 77.4300,
  },
  {
    id: 'fac_chc_phanda',
    name: 'CHC Phanda',
    type: 'CHC',
    block: 'Phanda',
    status: 'warning',
    beds: { used: 38, total: 50 },
    opdToday: 187,
    ipdCensusToday: 38,
    nqasScore: 58,
    lastVisited: '2026-05-18',
    alertsCount: 1,
    population: 48000,
    staffCount: 31,
    lat: 23.3100,
    lng: 77.2100,
  },
  ...Array.from({ length: 6 }, (_, i) => ({
    id: `fac_chc_${i + 6}`,
    name: `CHC ${['Ratibad', 'Fanda', 'Obaidullahganj', 'Huzur', 'Mandideep', 'Raisen Road'][i]}`,
    type: 'CHC' as const,
    block: blocks[seededRnd(i + 20, 0, 4)],
    status: makeStatus(i + 30),
    beds: { used: seededRnd(i + 40, 20, 45), total: 50 },
    opdToday: seededRnd(i + 50, 80, 200),
    ipdCensusToday: seededRnd(i + 60, 18, 40),
    nqasScore: seededRnd(i + 70, 50, 85),
    lastVisited: `2026-0${seededRnd(i + 80, 3, 6)}-${String(seededRnd(i + 90, 1, 28)).padStart(2, '0')}`,
    alertsCount: seededRnd(i + 100, 0, 2),
    population: seededRnd(i + 110, 30000, 70000),
    staffCount: seededRnd(i + 120, 22, 38),
  })),
  // PHCs — 52 of them
  ...Array.from({ length: 52 }, (_, i) => ({
    id: `fac_phc_${i + 1}`,
    name: `PHC ${['Lalghati', 'Ayodhya Nagar', 'Shahpura', 'Govindpura', 'Karond', 'Vidisha Road', 'Misrod', 'Kolar Road', 'Katara Hills', 'Ashoka Garden', 'Nehru Nagar', 'TT Nagar', 'Arera Colony', 'Shivaji Nagar', 'Habibganj', 'Piplani', 'Trilanga', 'Bagh Mugaliya', 'Danish Kunj', 'Barkheda', 'Kotra Sultanabad', 'Nayapura', 'Khajuri Sadak', 'Chunabhatti', 'Khatlapura', 'Berasia Road', 'Gulmohar', 'MP Nagar', 'Malviya Nagar', 'Hoshangabad Road', 'Kalkheda', 'Jawaharpur', 'Dhanora', 'Parsakheda', 'Berasia Block 1', 'Berasia Block 2', 'Silwani', 'Pachama', 'Goharganj', 'Udaypur', 'Phanda Block 1', 'Phanda Block 2', 'Sehore Road', 'Bilkhiria', 'Ratanpur', 'Pipalner', 'Bairagarh Block 1', 'Bairagarh Block 2', 'Bairasia', 'Mandav', 'Sanchi Road', 'Depalpur'][i] ?? `Block PHC ${i + 1}`}`,
    type: 'PHC' as const,
    block: blocks[seededRnd(i + 200, 0, 4)],
    status: makeStatus(i + 300),
    beds: { used: seededRnd(i + 400, 2, 10), total: 10 },
    opdToday: seededRnd(i + 500, 20, 120),
    ipdCensusToday: seededRnd(i + 600, 0, 8),
    nqasScore: null,
    lastVisited: seededRnd(i + 700, 0, 1) === 1 ? `2026-0${seededRnd(i + 800, 4, 6)}-${String(seededRnd(i + 900, 1, 28)).padStart(2, '0')}` : null,
    alertsCount: seededRnd(i + 1000, 0, 1),
    population: seededRnd(i + 1100, 8000, 25000),
    staffCount: seededRnd(i + 1200, 4, 12),
  })),
  // HWC/SHCs — 79
  ...Array.from({ length: 79 }, (_, i) => ({
    id: `fac_hwc_${i + 1}`,
    name: `HWC-${String(i + 1).padStart(3, '0')} · ${['Village', 'Gram', 'Colony', 'Mohalla', 'Basti'][seededRnd(i + 1300, 0, 4)]} ${i + 1}`,
    type: i % 2 === 0 ? 'HWC' as const : 'SHC' as const,
    block: blocks[seededRnd(i + 1400, 0, 4)],
    status: makeStatus(i + 1500),
    beds: { used: 0, total: 0 },
    opdToday: seededRnd(i + 1600, 5, 40),
    ipdCensusToday: 0,
    nqasScore: null,
    lastVisited: null,
    alertsCount: 0,
    population: seededRnd(i + 1700, 2000, 8000),
    staffCount: seededRnd(i + 1800, 1, 3),
  })),
]
