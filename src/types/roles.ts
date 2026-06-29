export const ALL_ROLES = [
  // Clinical
  'doctor',
  'nurse',
  'pharmacy',
  'lab',
  'radiology',
  'emergency',
  // Operations
  'reception',
  'bed_manager',
  'discharge',
  // Inpatient Care
  'ot',
  // Finance
  'billing',
  'insurance',
  // Management
  'admin',
  'hr',
  'quality',
  'feedback_analyst',
  'housekeeping',
  'inventory',
  'vendor_manager',
  // Support (7 new)
  'blood_bank',
  'cssd',
  'dietary',
  'bmw',
  'mortuary',
  'ambulance',
  'audit_officer',
  // Patient
  'patient',
  // Government / District
  'cmo',
  // Government / State
  'secretary',
] as const

export type Role = (typeof ALL_ROLES)[number]
