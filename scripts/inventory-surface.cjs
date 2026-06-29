/* M0 - Surface area inventory.
 *
 * Walks src/ to enumerate:
 *   - Every route (src/app/...../page.tsx)
 *   - Every interactive element class per page (button labels, link labels,
 *     form submits, native dialogs, store mutations, aria-labels)
 *   - Every store, with mutation method count and persist status
 *   - Every component
 *   - i18n key count per locale
 *
 * Emits a JSON blob to docs/specs/baseline-inventory.json that the docx
 * generator + regression sweep consume. */
const fs = require('fs')
const path = require('path')

const ROOT = path.join(__dirname, '..')

function walk(dir, ext, out = []) {
  if (!fs.existsSync(dir)) return out
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name)
    if (e.isDirectory()) walk(p, ext, out)
    else if (ext.some((x) => p.endsWith(x))) out.push(p)
  }
  return out
}

// ─── Routes ──────────────────────────────────────────────────────────
function routesFromAppDir() {
  const root = path.join(ROOT, 'src', 'app')
  const out = []
  const files = walk(root, ['page.tsx'])
  for (const f of files) {
    const rel = path.relative(root, f).replace(/\\/g, '/')
    // Convert "doctor/dashboard/page.tsx" -> "/doctor/dashboard"
    const url = '/' + rel.replace(/\/page\.tsx$/, '').replace(/^page\.tsx$/, '')
    out.push({ url: url === '/' ? '/' : url.replace(/^\/$/, '/'), file: 'src/app/' + rel })
  }
  out.sort((a, b) => a.url.localeCompare(b.url))
  return out
}

// ─── Per-page interactive scan ───────────────────────────────────────
function scanPage(file) {
  const src = fs.readFileSync(file, 'utf8')
  const onClicks = (src.match(/onClick=\{/g) || []).length
  const buttons  = (src.match(/<button\b/g) || []).length
  const links    = (src.match(/<Link\b|<a\b/g) || []).length
  const inputs   = (src.match(/<input\b/g) || []).length
  const forms    = (src.match(/<form\b/g) || []).length
  const submits  = (src.match(/type=["']submit["']/g) || []).length
  const dialogs  = (src.match(/useDialogs\(\)|<Dialog\b|<Sheet\b/g) || []).length
  const nativeDialogs = (src.match(/\bwindow\.(alert|confirm|prompt)\s*\(/g) || []).length
  const ariaLabels = [...src.matchAll(/aria-label=["']([^"']+)["']/g)].map((m) => m[1])
  const toasts = (src.match(/\btoast\.(success|error|info|warning)/g) || []).length
  const audits = (src.match(/useAuditStore\.getState\(\)\.log|useAuditStore\(\)\.log/g) || []).length
  const storeImports = [...src.matchAll(/from\s+['"]@\/store\/(use[A-Z][A-Za-z]+Store)/g)].map((m) => m[1])
  // Extract a flavour of button labels (best-effort)
  const buttonLabels = [...src.matchAll(/<(?:button|Button)[^>]*>([^<]{2,40})<\/(?:button|Button)>/g)]
    .map((m) => m[1].replace(/\s+/g, ' ').trim()).filter((s) => s && !/^\{/.test(s)).slice(0, 12)
  return { onClicks, buttons, links, inputs, forms, submits, dialogs, nativeDialogs,
           ariaLabels, toasts, audits, stores: Array.from(new Set(storeImports)), buttonLabels }
}

// ─── Stores inventory ───────────────────────────────────────────────
function storesInventory() {
  const dir = path.join(ROOT, 'src', 'store')
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir)) {
    if (!f.startsWith('use') || !f.endsWith('.ts')) continue
    const full = path.join(dir, f)
    const src = fs.readFileSync(full, 'utf8')
    const persisted = /persist\s*\(/.test(src) || /persist\(/.test(src)
    const auditEmits = (src.match(/useAuditStore\.getState\(\)\.log/g) || []).length
    const actionLines = src.match(/^\s+[a-zA-Z_]\w*:\s*\([^)]*\)\s*=>/gm) || []
    out.push({
      name: f.replace(/\.ts$/, ''),
      file: 'src/store/' + f,
      persisted,
      auditEmits,
      mutationActions: actionLines.length,
      bytes: src.length,
    })
  }
  out.sort((a, b) => a.name.localeCompare(b.name))
  return out
}

// ─── Components inventory ───────────────────────────────────────────
function componentsInventory() {
  const dir = path.join(ROOT, 'src', 'components')
  const out = walk(dir, ['.tsx']).map((f) => path.relative(ROOT, f).replace(/\\/g, '/'))
  out.sort()
  return out
}

// ─── i18n parity ────────────────────────────────────────────────────
function i18nParity() {
  const dir = path.join(ROOT, 'messages')
  if (!fs.existsSync(dir)) return {}
  const out = {}
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.json')) continue
    const text = fs.readFileSync(path.join(dir, f), 'utf8')
    const keys = (text.match(/"[A-Za-z_][\w.-]*":/g) || []).length
    out[f.replace(/\.json$/, '')] = keys
  }
  return out
}

// ─── API surface ────────────────────────────────────────────────────
function apiSurface() {
  const dir = path.join(ROOT, 'src', 'lib', 'api')
  const out = []
  if (!fs.existsSync(dir)) return out
  for (const f of fs.readdirSync(dir)) {
    if (!f.endsWith('.ts')) continue
    const full = path.join(dir, f)
    const src = fs.readFileSync(full, 'utf8')
    const methods = [...src.matchAll(/^\s+(\w+):\s*\([^)]*\)\s*=>/gm)].map((m) => m[1])
    const schemas = (src.match(/z\.object\(/g) || []).length
    out.push({ file: 'src/lib/api/' + f, methods, schemaCount: schemas })
  }
  return out
}

// ─── Build & emit ───────────────────────────────────────────────────
function main() {
  const routes = routesFromAppDir()
  const pageDetail = {}
  for (const r of routes) {
    const full = path.join(ROOT, r.file)
    pageDetail[r.url] = scanPage(full)
  }
  const inv = {
    capturedAt: new Date().toISOString(),
    capturedAtFrozen: '2026-06-01T18:00:00.000Z',
    summary: {
      routeCount: routes.length,
      storeCount: 0,
      componentCount: 0,
      apiSurfaceCount: 0,
    },
    routes,
    pages: pageDetail,
    stores: storesInventory(),
    components: componentsInventory(),
    api: apiSurface(),
    i18n: i18nParity(),
  }
  inv.summary.storeCount = inv.stores.length
  inv.summary.componentCount = inv.components.length
  inv.summary.apiSurfaceCount = inv.api.length
  // Aggregate signal counts across all pages
  inv.summary.totalOnClick      = Object.values(pageDetail).reduce((s, p) => s + p.onClicks, 0)
  inv.summary.totalButtons      = Object.values(pageDetail).reduce((s, p) => s + p.buttons, 0)
  inv.summary.totalLinks        = Object.values(pageDetail).reduce((s, p) => s + p.links, 0)
  inv.summary.totalInputs       = Object.values(pageDetail).reduce((s, p) => s + p.inputs, 0)
  inv.summary.totalForms        = Object.values(pageDetail).reduce((s, p) => s + p.forms, 0)
  inv.summary.totalAuditEmits   = Object.values(pageDetail).reduce((s, p) => s + p.audits, 0)
  inv.summary.totalNativeDialogs = Object.values(pageDetail).reduce((s, p) => s + p.nativeDialogs, 0)
  inv.summary.persistedStores   = inv.stores.filter((s) => s.persisted).length

  const outFile = path.join(ROOT, 'docs', 'specs', 'baseline-inventory.json')
  fs.writeFileSync(outFile, JSON.stringify(inv, null, 2))
  console.log('Wrote', outFile)
  console.log('Summary:', inv.summary)
}

main()
