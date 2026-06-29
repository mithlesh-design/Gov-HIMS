/* Staff — read-only directory of clinicians, nurses, billing, etc. */
import { z } from 'zod'
import { table } from './_core'

export const StaffSchema = z.object({
  id: z.string(),             // DR-1012 / NU-205 / RC-204 / PH-301 / etc.
  fullName: z.string(),
  role: z.string(),           // matches src/types/roles.ts
  dept: z.string(),
  primaryDept: z.string().optional(),
  registrationNo: z.string().optional(),
  contactPhone: z.string().optional(),
  contactEmail: z.string().optional(),
  active: z.boolean().default(true),
  shift: z.enum(['Morning', 'Evening', 'Night', 'Off']).optional(),
})
export type Staff = z.infer<typeof StaffSchema>

const staff = table<Staff>('staff', StaffSchema)

export const StaffApi = {
  list: (filter?: (s: Staff) => boolean) => staff.list(filter),
  get: (id: string) => staff.get(id),
  byRole: async (role: string) => staff.list((s) => s.role === role && s.active),
  put: (row: Staff) => staff.put(row),
  _table: staff,
}
