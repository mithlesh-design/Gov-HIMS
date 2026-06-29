/* Drug master — formulary entries. */
import { z } from 'zod'
import { table } from './_core'

export const DrugSchema = z.object({
  id: z.string(),
  code: z.string().optional(),
  name: z.string(),
  form: z.string().optional(),
  strength: z.string().optional(),
  route: z.string().optional(),
  classClass: z.string().optional(),
  narcoticSchedule: z.string().optional(),
  allergyTags: z.array(z.string()).default([]),
  interactionTags: z.array(z.string()).default([]),
  onHand: z.number().int().nonnegative().default(0),
  reorderLevel: z.number().int().nonnegative().default(0),
  unitPrice: z.number().nonnegative().default(0),
  active: z.boolean().default(true),
})
export type Drug = z.infer<typeof DrugSchema>

const drugs = table<Drug>('drugs', DrugSchema)

export const Drugs = {
  list: (filter?: (d: Drug) => boolean) => drugs.list(filter ?? ((d) => d.active)),
  get: (id: string) => drugs.get(id),
  byName: (q: string) => drugs.list((d) => d.name.toLowerCase().includes(q.toLowerCase())),
  put: (row: Drug) => drugs.put(row),
  patch: (id: string, partial: Partial<Drug>) => drugs.patch(id, partial),
  _table: drugs,
}
