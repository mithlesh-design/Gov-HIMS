export type PayerType = 'cash' | 'insurance' | 'government' | 'corporate' | 'tpa'

export interface LineItem {
  code: string
  description: string
  quantity: number
  unitPrice: number
  discountPct?: number
  taxPct?: number
}

export interface BillCalculation {
  lineItems: Array<LineItem & { subtotal: number; discountAmount: number; taxAmount: number; total: number }>
  grossTotal: number
  totalDiscount: number
  totalTax: number
  netPayable: number
  payerContribution: number
  patientContribution: number
}

const INSURANCE_COVERAGE_PCT: Record<string, number> = {
  insurance: 80,
  government: 100,
  corporate: 90,
  tpa: 75,
  cash: 0,
}

const GST_EXEMPT_CODES = ['CONSULT', 'ROOM', 'NURSING', 'LAB-BASIC']

export function calculateBill(lineItems: LineItem[], payer: PayerType): BillCalculation {
  const calculated = lineItems.map((item) => {
    const taxPct = GST_EXEMPT_CODES.includes(item.code) ? 0 : (item.taxPct ?? 5)
    const discountPct = item.discountPct ?? 0
    const subtotal = item.quantity * item.unitPrice
    const discountAmount = (subtotal * discountPct) / 100
    const taxableAmount = subtotal - discountAmount
    const taxAmount = (taxableAmount * taxPct) / 100
    const total = taxableAmount + taxAmount
    return { ...item, subtotal, discountAmount, taxAmount, total }
  })
  const grossTotal = calculated.reduce((acc, i) => acc + i.subtotal, 0)
  const totalDiscount = calculated.reduce((acc, i) => acc + i.discountAmount, 0)
  const totalTax = calculated.reduce((acc, i) => acc + i.taxAmount, 0)
  const netPayable = calculated.reduce((acc, i) => acc + i.total, 0)
  const coveragePct = INSURANCE_COVERAGE_PCT[payer] ?? 0
  const payerContribution = Math.round((netPayable * coveragePct) / 100)
  const patientContribution = netPayable - payerContribution
  return { lineItems: calculated, grossTotal, totalDiscount, totalTax, netPayable, payerContribution, patientContribution }
}
