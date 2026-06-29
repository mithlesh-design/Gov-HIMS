/* Audit — persisted, append-only evidence chain.
 *
 * This module:
 *   1. owns the audit table (so audit survives F5)
 *   2. exposes the bridge callback that the in-memory useAuditStore will register
 *   3. supports read queries for the /audit/* surfaces
 */
import { z } from 'zod'
import { id as newId, isoNow, registerAuditBridge, table, type AuditEmit } from './_core'

export const AuditEntrySchema = z.object({
  id: z.string(),
  userId: z.string(),
  userName: z.string(),
  action: z.string(),
  resource: z.string(),
  resourceId: z.string().optional(),
  detail: z.string().optional(),
  before: z.unknown().optional(),
  after: z.unknown().optional(),
  timestamp: z.string(),
  ipStub: z.string(),
})
export type AuditEntry = z.infer<typeof AuditEntrySchema>

const audit = table<AuditEntry>('audit_entries', AuditEntrySchema)

let bridgeRegistered = false

/** Subscribers that want notifications when audit emits happen (the in-memory store). */
type Listener = (entry: AuditEntry) => void
const listeners = new Set<Listener>()
export function onAudit(listener: Listener): () => void {
  listeners.add(listener)
  return () => listeners.delete(listener)
}

/** Install the bridge so other api modules' `audit.emit(...)` calls land here.
 *  Idempotent — safe to call from layout / store bootstrap multiple times. */
export function installAuditBridge(): void {
  if (bridgeRegistered) return
  bridgeRegistered = true
  registerAuditBridge((e: AuditEmit) => {
    const entry: AuditEntry = {
      id: newId('AUD'),
      userId: e.userId ?? 'system',
      userName: e.userName ?? 'System',
      action: e.action,
      resource: e.resource,
      resourceId: e.resourceId,
      detail: e.detail,
      before: e.before,
      after: e.after,
      timestamp: isoNow(),
      ipStub: '192.168.1.x',
    }
    void audit.put(entry).then(() => {
      for (const l of listeners) {
        try { l(entry) } catch (err) { console.error('[audit] listener failed:', err) }
      }
    })
  })
}

export const Audit = {
  list: (filter?: (a: AuditEntry) => boolean) => audit.list(filter),
  recent: async (limit = 200) => (await audit.list()).slice(0, limit),
  byModule: async (module: string) => {
    return audit.list((a) => a.action.startsWith(module.toLowerCase()))
  },
  byPatient: async (patientId: string) =>
    audit.list((a) => a.resourceId === patientId || a.detail?.includes(patientId) === true),
  put: (e: AuditEntry) => audit.put(e),
  putMany: (rows: AuditEntry[]) => audit.putMany(rows),
  count: () => audit.count(),
  _table: audit,
}
