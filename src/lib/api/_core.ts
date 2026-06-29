/* Agentix HIMS — Mock API / Repository Boundary · Phase 1
 *
 * One typed, async, zod-validated layer between the UI/Zustand stores and the
 * real REST API that will replace it in Phase 2. Browser-persisted via
 * localStorage today (swap to IndexedDB later by replacing this file only).
 *
 * Convention:
 *   - All domain modules import `table<T>(name, schema)` from this file.
 *   - All mutations route through `audit.emit(...)` so we have one place to
 *     enforce the NABH evidence chain.
 *   - Public shapes (zod) mirror 02_TRD §5 endpoint contracts so the Phase-2
 *     swap is a transport change, not an API change.
 */

import { z } from 'zod'

// ─────────────────────────────────────────────────────────────────────────
// Storage primitives
// ─────────────────────────────────────────────────────────────────────────

const NS = 'agentix.api.v1'
const isBrowser = typeof window !== 'undefined'

function readRaw(key: string): unknown {
  if (!isBrowser) return undefined
  try {
    const raw = window.localStorage.getItem(`${NS}.${key}`)
    return raw ? JSON.parse(raw) : undefined
  } catch {
    return undefined
  }
}

function writeRaw(key: string, value: unknown): void {
  if (!isBrowser) return
  try {
    window.localStorage.setItem(`${NS}.${key}`, JSON.stringify(value))
  } catch (err) {
    console.error('[api] storage write failed:', key, err)
  }
}

function removeRaw(key: string): void {
  if (!isBrowser) return
  try {
    window.localStorage.removeItem(`${NS}.${key}`)
  } catch { /* ignore */ }
}

export function listTableKeys(): string[] {
  if (!isBrowser) return []
  const out: string[] = []
  for (let i = 0; i < window.localStorage.length; i++) {
    const k = window.localStorage.key(i)
    if (k?.startsWith(`${NS}.`)) out.push(k.slice(NS.length + 1))
  }
  return out
}

export function wipeAll(): void {
  if (!isBrowser) return
  for (const k of listTableKeys()) removeRaw(k)
}

// ─────────────────────────────────────────────────────────────────────────
// Table: typed CRUD over a localStorage-backed array
// ─────────────────────────────────────────────────────────────────────────

export interface Table<T extends { id: string }> {
  name: string
  list: (filter?: (row: T) => boolean) => Promise<T[]>
  get: (id: string) => Promise<T | undefined>
  put: (row: T) => Promise<T>
  putMany: (rows: T[]) => Promise<T[]>
  patch: (id: string, partial: Partial<T>) => Promise<T | undefined>
  remove: (id: string) => Promise<boolean>
  count: () => Promise<number>
  replaceAll: (rows: T[]) => Promise<T[]>
}

export function table<T extends { id: string }>(name: string, schema: z.ZodType<T>): Table<T> {
  const load = (): T[] => {
    const raw = readRaw(name)
    if (!Array.isArray(raw)) return []
    const out: T[] = []
    for (const r of raw) {
      const parsed = schema.safeParse(r)
      if (parsed.success) out.push(parsed.data)
      else console.warn(`[api/${name}] skipping invalid row`, parsed.error.message)
    }
    return out
  }
  const save = (rows: T[]) => writeRaw(name, rows)

  return {
    name,
    async list(filter) {
      const rows = load()
      return filter ? rows.filter(filter) : rows
    },
    async get(id) {
      return load().find((r) => r.id === id)
    },
    async put(row) {
      const validated = schema.parse(row)
      const rows = load()
      const idx = rows.findIndex((r) => r.id === validated.id)
      if (idx >= 0) rows[idx] = validated
      else rows.unshift(validated)
      save(rows)
      return validated
    },
    async putMany(rows) {
      const validated = rows.map((r) => schema.parse(r))
      const all = load()
      for (const v of validated) {
        const idx = all.findIndex((r) => r.id === v.id)
        if (idx >= 0) all[idx] = v
        else all.unshift(v)
      }
      save(all)
      return validated
    },
    async patch(id, partial) {
      const rows = load()
      const idx = rows.findIndex((r) => r.id === id)
      if (idx < 0) return undefined
      const merged = schema.parse({ ...rows[idx], ...partial })
      rows[idx] = merged
      save(rows)
      return merged
    },
    async remove(id) {
      const rows = load()
      const next = rows.filter((r) => r.id !== id)
      if (next.length === rows.length) return false
      save(next)
      return true
    },
    async count() {
      return load().length
    },
    async replaceAll(rows) {
      const validated = rows.map((r) => schema.parse(r))
      save(validated)
      return validated
    },
  }
}

// ─────────────────────────────────────────────────────────────────────────
// IDs + common schemas
// ─────────────────────────────────────────────────────────────────────────

let _seq = 0
export function id(prefix = 'ID'): string {
  _seq++
  const t = isBrowser ? Date.now().toString(36) : 't'
  const r = isBrowser ? Math.random().toString(36).slice(2, 6) : 'seed'
  return `${prefix}-${t}-${r}-${_seq}`
}

export const isoNow = (): string =>
  isBrowser ? new Date().toISOString() : '2026-06-01T00:00:00.000Z'

export const tenantId = 'tenant.main'

export const TimestampSchema = z.string()  // ISO 8601
export const TenantSchema = z.string()

// ─────────────────────────────────────────────────────────────────────────
// Audit emission — the single fan-in for evidence
// ─────────────────────────────────────────────────────────────────────────

export interface AuditEmit {
  action: string
  resource: string
  resourceId?: string
  userId?: string
  userName?: string
  detail?: string
  before?: unknown
  after?: unknown
}

type AuditBridge = (e: AuditEmit) => void
let auditBridge: AuditBridge | undefined

/** Register the bridge to useAuditStore (called from the audit-store side once mounted). */
export function registerAuditBridge(fn: AuditBridge): void {
  auditBridge = fn
}

export const audit = {
  emit(e: AuditEmit): void {
    if (!auditBridge) return
    try {
      auditBridge(e)
    } catch (err) {
      console.error('[api/audit] bridge failed:', err)
    }
  },
}

// ─────────────────────────────────────────────────────────────────────────
// Bootstrap + reset
// ─────────────────────────────────────────────────────────────────────────

const BOOT_KEY = '__bootstrap__'
const SCHEMA_VERSION = 2

interface BootstrapState {
  schemaVersion: number
  seededAt: string
  seedName: string
}

export async function isBootstrapped(): Promise<boolean> {
  const s = readRaw(BOOT_KEY) as BootstrapState | undefined
  return Boolean(s && s.schemaVersion === SCHEMA_VERSION)
}

export async function markBootstrapped(seedName: string): Promise<void> {
  const state: BootstrapState = {
    schemaVersion: SCHEMA_VERSION,
    seededAt: isoNow(),
    seedName,
  }
  writeRaw(BOOT_KEY, state)
}

export async function getBootstrapState(): Promise<BootstrapState | undefined> {
  return readRaw(BOOT_KEY) as BootstrapState | undefined
}

export async function resetAll(seedName = 'manual-reset'): Promise<void> {
  wipeAll()
  await markBootstrapped(seedName)
}
