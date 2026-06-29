export interface NextOfKin {
  name: string
  relationship: 'Spouse' | 'Parent' | 'Child' | 'Sibling' | 'Guardian' | 'Other'
  phone: string
}

export type ConsentStatus = 'pending' | 'sent' | 'viewed' | 'signed' | 'expired' | 'rejected'

export interface ConsentRecord {
  id: string
  patientId: string
  patientName: string
  procedureName: string
  requestedBy: string
  requestedAt: string
  nok: NextOfKin
  token: string
  tokenJti: string
  otp: string
  status: ConsentStatus
  viewedAt?: string
  otpVerifiedAt?: string
  signedAt?: string
  signatureBase64?: string
  signedByName?: string
  expiresAt: string
}
