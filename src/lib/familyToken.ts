/* Agentix HIMS — Family-tracking access token (frontend pattern)
 *
 * The public `/p/<uhid>` family-tracking page must not treat the UHID as the
 * sole credential (it is guessable/enumerable). This module issues a small,
 * stateless, JWT-style token that the page validates before rendering any
 * patient data — exactly the shape a real backend will later enforce.
 *
 * Frontend-only today:
 *   - Signed with a deterministic, NON-cryptographic hash (clearly a demo).
 *   - Phase-2 swap: replace `sign()` with server-side HMAC-SHA256 and verify
 *     in a route handler. The payload + validation contract stay identical.
 *
 * The token carries its own expiry + consent claim so it is self-validating
 * and works cross-device (it travels in the SMS link), with no shared state.
 */

export interface FamilyTokenPayload {
  /** UHID this token authorizes (upper-cased). */
  uhid: string
  /** Patient display name at issue time (for the authorization banner). */
  name: string
  /** Unique token id — used for revocation (denylist). */
  jti: string
  /** Issued-at, epoch ms. */
  iat: number
  /** Expires-at, epoch ms. */
  exp: number
  /** Whether the patient/guardian consented to family tracking. */
  consent: boolean
}

export type FamilyTokenInvalidReason =
  | 'missing'   // no token in the link
  | 'malformed' // not a token we issued / decode failed
  | 'badsig'    // signature mismatch (tampered)
  | 'mismatch'  // token is for a different UHID than the page
  | 'expired'   // past exp
  | 'no-consent'// valid but consent not granted

export type FamilyTokenResult =
  | { ok: true; payload: FamilyTokenPayload }
  | { ok: false; reason: FamilyTokenInvalidReason; payload?: FamilyTokenPayload }

// Demo signing salt. In Phase 2 this becomes a server-only HMAC secret and
// never ships to the client.
const DEMO_SALT = 'agentix.family.v1'

// ── base64url (Unicode-safe, SSR + browser) ──────────────────────────────
function b64urlEncode(s: string): string {
  const bytes = typeof Buffer !== 'undefined'
    ? Buffer.from(s, 'utf-8').toString('base64')
    : btoa(unescape(encodeURIComponent(s)))
  return bytes.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
}
function b64urlDecode(s: string): string {
  const pad = s.length % 4 === 0 ? '' : '='.repeat(4 - (s.length % 4))
  const b64 = s.replace(/-/g, '+').replace(/_/g, '/') + pad
  return typeof Buffer !== 'undefined'
    ? Buffer.from(b64, 'base64').toString('utf-8')
    : decodeURIComponent(escape(atob(b64)))
}

// Deterministic non-crypto hash (FNV-1a, 32-bit) — DEMO ONLY.
function sign(body: string): string {
  let h = 0x811c9dc5
  const input = `${body}.${DEMO_SALT}`
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i)
    h = Math.imul(h, 0x01000193)
  }
  return (h >>> 0).toString(36)
}

export function randomJti(): string {
  const t = Date.now().toString(36)
  const r = Math.random().toString(36).slice(2, 8)
  return `ft_${t}_${r}`
}

/** Build a self-validating token string: `<b64url(payload)>.<sig>`. */
export function encodeFamilyToken(payload: FamilyTokenPayload): string {
  const body = b64urlEncode(JSON.stringify(payload))
  return `${body}.${sign(body)}`
}

/** Issue a fresh token for a UHID. */
export function issueFamilyToken(
  uhid: string,
  name: string,
  opts: { ttlHours?: number; consent?: boolean } = {},
): { token: string; payload: FamilyTokenPayload } {
  const ttlHours = opts.ttlHours ?? 72
  const now = Date.now()
  const payload: FamilyTokenPayload = {
    uhid: uhid.toUpperCase(),
    name,
    jti: randomJti(),
    iat: now,
    exp: now + ttlHours * 3600_000,
    consent: opts.consent ?? false,
  }
  return { token: encodeFamilyToken(payload), payload }
}

/** Decode without validating (returns undefined if structurally invalid). */
export function decodeFamilyToken(token: string): FamilyTokenPayload | undefined {
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return undefined
  const body = token.slice(0, dot)
  try {
    const parsed = JSON.parse(b64urlDecode(body)) as FamilyTokenPayload
    if (!parsed?.uhid || typeof parsed.exp !== 'number') return undefined
    return parsed
  } catch {
    return undefined
  }
}

/**
 * Validate a token for a given UHID. `now` is injectable for tests.
 * `revoked` is the optional denylist of `jti`s (Phase-2: a server table).
 */
export function validateFamilyToken(
  token: string | null | undefined,
  uhid: string,
  opts: { now?: number; revoked?: ReadonlySet<string> | string[] } = {},
): FamilyTokenResult {
  if (!token) return { ok: false, reason: 'missing' }
  const dot = token.lastIndexOf('.')
  if (dot <= 0) return { ok: false, reason: 'malformed' }
  const body = token.slice(0, dot)
  const sig = token.slice(dot + 1)
  if (sign(body) !== sig) return { ok: false, reason: 'badsig' }

  const payload = decodeFamilyToken(token)
  if (!payload) return { ok: false, reason: 'malformed' }

  const revokedSet = Array.isArray(opts.revoked) ? new Set(opts.revoked) : opts.revoked
  if (revokedSet?.has(payload.jti)) return { ok: false, reason: 'malformed', payload }

  if (payload.uhid.toUpperCase() !== uhid.toUpperCase())
    return { ok: false, reason: 'mismatch', payload }

  const now = opts.now ?? Date.now()
  if (now > payload.exp) return { ok: false, reason: 'expired', payload }
  if (!payload.consent) return { ok: false, reason: 'no-consent', payload }

  return { ok: true, payload }
}
