/* M8 — Mock payment confirmation flow.
 *
 * Phase-1 stand-in for a real payment gateway. Caller submits an intent,
 * we simulate UPI / card / netbanking processing with an 800ms delay and
 * return a deterministic confirmation envelope. Phase-2 replaces the body
 * with the real Razorpay / PhonePe / etc. SDK; envelope stays.
 *
 *   const result = await processPayment({ amount: 4500, channel: 'upi', purpose: 'OPD Rx', patientId: 'PT-20394' })
 *   if (result.status === 'succeeded') toast.success(`Paid · ref ${result.transactionId}`)
 */

export type PaymentChannel = 'upi' | 'card' | 'netbanking' | 'cash' | 'insurance'
export type PaymentPurpose =
  | 'OPD consultation' | 'OPD Rx' | 'OPD investigation' | 'Pharmacy' | 'Lab' | 'Radiology'
  | 'IPD advance' | 'IPD final' | 'Discharge clearance'
  | 'Ambulance' | 'Other'

export interface PaymentIntent {
  amount: number
  channel: PaymentChannel
  purpose: PaymentPurpose
  patientId?: string
  patientName?: string
  invoiceId?: string
  description?: string
}

export type PaymentStatus = 'succeeded' | 'failed' | 'pending'

export interface PaymentResult {
  transactionId: string
  status: PaymentStatus
  channel: PaymentChannel
  amount: number
  paidAt: string
  failureReason?: string
  payerVPA?: string       // for UPI mock
  last4?: string          // for card mock
}

/** Simulated payment with an 800 ms "processing" delay. */
export async function processPayment(intent: PaymentIntent): Promise<PaymentResult> {
  // Demo mode: every UPI/card payment succeeds; insurance is always pending pre-auth.
  await new Promise((r) => setTimeout(r, 800))
  const transactionId = `TXN-${Date.now().toString(36).toUpperCase()}`
  const base: Omit<PaymentResult, 'status' | 'failureReason'> = {
    transactionId,
    channel: intent.channel,
    amount: intent.amount,
    paidAt: new Date().toISOString(),
    ...(intent.channel === 'upi' ? { payerVPA: 'patient@agentix' } : {}),
    ...(intent.channel === 'card' ? { last4: '4081' } : {}),
  }
  if (intent.channel === 'insurance') {
    return { ...base, status: 'pending', failureReason: 'Awaiting TPA pre-authorisation' }
  }
  // Reject obviously bad amounts as a sanity check.
  if (!intent.amount || intent.amount < 0) {
    return { ...base, status: 'failed', failureReason: 'Invalid amount' }
  }
  return { ...base, status: 'succeeded' }
}

/** Display-friendly channel labels. */
export const CHANNEL_LABEL: Record<PaymentChannel, string> = {
  upi: 'UPI',
  card: 'Debit / Credit card',
  netbanking: 'Net banking',
  cash: 'Cash at counter',
  insurance: 'Insurance · TPA',
}
