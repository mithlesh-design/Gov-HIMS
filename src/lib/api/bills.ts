/* Bills — itemised invoices + payments + duplicate-charge flagging. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const BillLineSchema = z.object({
  id: z.string(),
  source: z.enum(['order', 'drug', 'bed', 'procedure', 'consult', 'misc']),
  sourceId: z.string().optional(),
  code: z.string().optional(),
  name: z.string(),
  qty: z.number().positive().default(1),
  unitPrice: z.number().nonnegative(),
  total: z.number().nonnegative(),
  duplicateFlag: z.boolean().default(false),
  notes: z.string().optional(),
})
export type BillLine = z.infer<typeof BillLineSchema>

export const PaymentSchema = z.object({
  id: z.string(),
  billId: z.string(),
  mode: z.enum(['cash', 'upi', 'card', 'bank', 'insurance']),
  amount: z.number().positive(),
  ref: z.string().optional(),
  capturedBy: z.string().optional(),
  capturedAt: z.string(),
})
export type Payment = z.infer<typeof PaymentSchema>

export const BillSchema = z.object({
  id: z.string(),                          // BIL-...
  patientId: z.string(),
  visitId: z.string().optional(),
  ipdStayId: z.string().optional(),
  payerType: z.enum(['cash', 'corporate', 'insurance', 'govt']),
  payerName: z.string().optional(),
  status: z.enum(['draft', 'open', 'partial', 'paid', 'frozen', 'cancelled']).default('draft'),
  lines: z.array(BillLineSchema).default([]),
  total: z.number().nonnegative().default(0),
  paid: z.number().nonnegative().default(0),
  balance: z.number().default(0),
  frozenAt: z.string().optional(),
  freezeOverrideBy: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Bill = z.infer<typeof BillSchema>

const bills = table<Bill>('bills', BillSchema)
const payments = table<Payment>('payments', PaymentSchema)

function recompute(b: Bill): Bill {
  const total = b.lines.reduce((s, l) => s + l.total, 0)
  const balance = Math.max(0, total - b.paid)
  return { ...b, total, balance }
}

export const Bills = {
  list: (filter?: (b: Bill) => boolean) => bills.list(filter),
  get: (id: string) => bills.get(id),
  byPatient: (patientId: string) => bills.list((b) => b.patientId === patientId),
  byVisit: (visitId: string) => bills.list((b) => b.visitId === visitId).then((r) => r[0]),
  byIpd: (ipdStayId: string) => bills.list((b) => b.ipdStayId === ipdStayId).then((r) => r[0]),
  async create(input: Omit<Bill, 'id' | 'createdAt' | 'updatedAt' | 'total' | 'paid' | 'balance' | 'status' | 'lines'> & {
    lines?: BillLine[]; status?: Bill['status']
  }) {
    const row: Bill = recompute({
      ...input,
      id: newId('BIL'),
      lines: input.lines ?? [],
      paid: 0,
      total: 0,
      balance: 0,
      status: input.status ?? 'open',
      createdAt: isoNow(),
      updatedAt: isoNow(),
    })
    return bills.put(row)
  },
  async addLine(id: string, line: Omit<BillLine, 'id'>) {
    const bill = await bills.get(id)
    if (!bill || bill.status === 'frozen') return undefined
    const lineRow: BillLine = { ...line, id: newId('LIN') }
    const updated = recompute({ ...bill, lines: [...bill.lines, lineRow], updatedAt: isoNow() })
    const saved = await bills.put(updated)
    audit.emit({
      action: 'billing_charge',
      resource: 'bill',
      resourceId: id,
      detail: `+${lineRow.name} ₹${lineRow.total}`,
    })
    return saved
  },
  async removeLine(id: string, lineId: string) {
    const bill = await bills.get(id)
    if (!bill || bill.status === 'frozen') return undefined
    const updated = recompute({
      ...bill,
      lines: bill.lines.filter((l) => l.id !== lineId),
      updatedAt: isoNow(),
    })
    return bills.put(updated)
  },
  async capturePayment(billId: string, p: Omit<Payment, 'id' | 'capturedAt' | 'billId'>) {
    const bill = await bills.get(billId)
    if (!bill) return undefined
    const pay: Payment = { ...p, id: newId('PAY'), billId, capturedAt: isoNow() }
    await payments.put(pay)
    const newPaid = bill.paid + pay.amount
    const status: Bill['status'] = newPaid >= bill.total ? 'paid' : 'partial'
    const updated = recompute({ ...bill, paid: newPaid, status, updatedAt: isoNow() })
    await bills.put(updated)
    audit.emit({
      action: 'billing_charge',
      resource: 'payment',
      resourceId: pay.id,
      detail: `Payment ${pay.mode} ₹${pay.amount}`,
    })
    return pay
  },
  async freeze(id: string, by: { userId: string; userName: string }) {
    const patched = await bills.patch(id, { status: 'frozen', frozenAt: isoNow(), updatedAt: isoNow() })
    if (patched) {
      audit.emit({
        action: 'billing_charge',
        resource: 'bill',
        resourceId: id,
        userId: by.userId,
        userName: by.userName,
        detail: 'Bill frozen (discharge gate)',
      })
    }
    return patched
  },
  async unfreeze(id: string, by: { userId: string; userName: string }, reason: string) {
    const patched = await bills.patch(id, {
      status: 'open', freezeOverrideBy: by.userId, updatedAt: isoNow(),
    })
    if (patched) audit.emit({
      action: 'billing_charge',
      resource: 'bill',
      resourceId: id,
      userId: by.userId,
      userName: by.userName,
      detail: `Freeze override: ${reason}`,
    })
    return patched
  },
  paymentsByBill: (billId: string) => payments.list((p) => p.billId === billId),
  _bills: bills,
  _payments: payments,
}
