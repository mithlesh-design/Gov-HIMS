/* Orders — lab / radiology / drug / procedure orders. */
import { z } from 'zod'
import { audit, id as newId, isoNow, table } from './_core'

export const OrderKind = z.enum(['lab', 'radiology', 'drug', 'procedure', 'referral'])
export const OrderUrgency = z.enum(['routine', 'urgent', 'stat'])
export const OrderStatus = z.enum([
  'draft', 'sent', 'received', 'collecting', 'in_progress',
  'reported', 'verified', 'released', 'cancelled',
])

export const OrderItemSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  qty: z.number().int().positive().default(1),
  meta: z.record(z.string(), z.string()).optional(),
})

export const OrderSchema = z.object({
  id: z.string(),                    // ORD-...
  visitId: z.string().optional(),
  encounterId: z.string().optional(),
  patientId: z.string(),
  doctorId: z.string(),
  doctorName: z.string().optional(),
  kind: OrderKind,
  urgency: OrderUrgency.default('routine'),
  status: OrderStatus.default('draft'),
  indication: z.string().optional(),
  items: z.array(OrderItemSchema).default([]),
  modality: z.string().optional(),                // radiology modality
  bench: z.string().optional(),                   // lab bench routing
  sentAt: z.string().optional(),
  completedAt: z.string().optional(),
  createdAt: z.string(),
  updatedAt: z.string(),
})
export type Order = z.infer<typeof OrderSchema>

const orders = table<Order>('orders', OrderSchema)

export const Orders = {
  list: (filter?: (o: Order) => boolean) => orders.list(filter),
  get: (id: string) => orders.get(id),
  byPatient: (patientId: string) => orders.list((o) => o.patientId === patientId),
  byKind: (kind: Order['kind']) => orders.list((o) => o.kind === kind),
  byVisit: (visitId: string) => orders.list((o) => o.visitId === visitId),
  active: () => orders.list((o) => !['released', 'cancelled'].includes(o.status)),
  async create(input: Omit<Order, 'id' | 'createdAt' | 'updatedAt' | 'status'> & { status?: Order['status'] }) {
    const row: Order = {
      ...input,
      id: newId('ORD'),
      status: input.status ?? 'sent',
      sentAt: input.sentAt ?? isoNow(),
      createdAt: isoNow(),
      updatedAt: isoNow(),
    }
    const saved = await orders.put(row)
    audit.emit({
      action: saved.kind === 'lab' ? 'lab_order'
            : saved.kind === 'radiology' ? 'radiology_order'
            : 'prescription_create',
      resource: 'order',
      resourceId: saved.id,
      userId: saved.doctorId,
      userName: saved.doctorName,
      detail: `${saved.kind} order: ${saved.items.map((i) => i.name).join(', ')} (${saved.urgency})`,
    })
    return saved
  },
  async transition(id: string, status: Order['status']) {
    const patched = await orders.patch(id, {
      status,
      updatedAt: isoNow(),
      completedAt: status === 'released' ? isoNow() : undefined,
    })
    return patched
  },
  patch: (id: string, partial: Partial<Order>) => orders.patch(id, { ...partial, updatedAt: isoNow() }),
  _table: orders,
}
