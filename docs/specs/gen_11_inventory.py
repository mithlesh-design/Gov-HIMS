"""Generate 11_Feature_Flow_Inventory_v1_0.docx — the M0 preservation contract.

Reads docs/specs/baseline-inventory.json (produced by scripts/inventory-surface.cjs)
and renders an exhaustive, machine-grounded list of every route, store,
component, API surface, and per-page interactive class. This document is the
regression contract for every subsequent milestone.
"""
import json
from pathlib import Path
from collections import defaultdict
from _helpers import *


HERE = Path(__file__).parent
INV  = json.loads((HERE / "baseline-inventory.json").read_text(encoding="utf-8"))


# Route → role bucket (rough categorization from the path prefix)
def role_of(url: str) -> str:
    if url == "/" or url.startswith("/checkin"):                 return "Entry"
    parts = url.strip("/").split("/")
    role  = parts[0] if parts else "(other)"
    return {
        "admin":      "Admin (COO)",
        "doctor":     "Doctor",
        "nurse":      "Nurse",
        "pharmacy":   "Pharmacy",
        "lab":        "Lab",
        "radiology":  "Radiology",
        "emergency":  "Emergency",
        "reception":  "Reception",
        "admission":  "Bed Manager",
        "discharge":  "Discharge",
        "ot":         "OT",
        "billing":    "Billing",
        "insurance":  "Insurance",
        "audit":      "Audit",
        "quality":    "Quality",
        "bloodbank":  "Blood Bank",
        "cssd":       "CSSD",
        "dietary":    "Dietary",
        "bmw":        "BMW",
        "mortuary":   "Mortuary",
        "ambulance":  "Ambulance",
        "housekeeping": "Housekeeping",
        "inventory":  "Inventory",
        "patient":    "Patient portal",
        "api":        "API routes",
        "actions":    "Server actions",
    }.get(role, role.title())


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "11 - Feature/Flow Inventory",
          "Feature & Flow Inventory (M0 baseline)",
          "Preservation contract for every subsequent milestone")
    toc(doc)

    s = INV["summary"]

    # ── Purpose ─────────────────────────────────────────────────────────
    h1(doc, "1. Purpose")
    p(doc,
      "This document is the M0 preservation contract. It enumerates every "
      "route, store, component, API surface and interactive element class "
      "that exists in the repo as of the baseline. It is paired with "
      "scripts/regression-suite.cjs, which re-runs the same contract via "
      "Puppeteer after every milestone. Any divergence from this inventory "
      "is a regression and must be resolved before the next checkpoint.")

    callout(doc, "Snapshot",
            "Captured from src/ at the M0 baseline. Re-running "
            "scripts/inventory-surface.cjs regenerates the underlying "
            "docs/specs/baseline-inventory.json; this docx is rebuilt from "
            "that JSON. The numbers are exact, not approximate.",
            kind="note")

    # ── Surface area totals ─────────────────────────────────────────────
    h1(doc, "2. Surface Area at M0")
    table(doc, ["Surface", "Count"],
          [
              ["Page routes (src/app/**/page.tsx)",         str(s["routeCount"])],
              ["Zustand stores (src/store/use*.ts)",         str(s["storeCount"])],
              ["  - of which persisted to localStorage",    str(s["persistedStores"])],
              ["React components (src/components/**.tsx)",   str(s["componentCount"])],
              ["Mock-API surface files (src/lib/api/*.ts)",   str(s["apiSurfaceCount"])],
              ["onClick handlers across pages",              str(s["totalOnClick"])],
              ["<button> elements across pages",              str(s["totalButtons"])],
              ["<Link>/<a> elements across pages",            str(s["totalLinks"])],
              ["<input> elements across pages",                str(s["totalInputs"])],
              ["<form> elements across pages",                  str(s["totalForms"])],
              ["Page-level audit emits (most live in stores)",  str(s["totalAuditEmits"])],
              ["Native window.alert/confirm/prompt sites",     str(s["totalNativeDialogs"])],
              ["i18n locales", " + ".join(f"{k} ({v})" for k, v in INV["i18n"].items())],
          ],
          col_widths_cm=[9.0, 6.0])
    callout(doc,
            "Contract",
            "These numbers are the contract. The regression sweep must keep "
            "the route count constant; the persisted-store count cannot drop; "
            "the native-dialog count must remain zero. Compaction can lower the "
            "onClick/button counts (consolidation), but every named element in "
            "Section 4 must still be reachable.", kind="warn")

    # ── Routes by role ──────────────────────────────────────────────────
    h1(doc, "3. Routes by Role")
    buckets = defaultdict(list)
    for r in INV["routes"]:
        buckets[role_of(r["url"])].append(r)

    table(doc, ["Role bucket", "Route count"],
          sorted([[k, str(len(v))] for k, v in buckets.items()], key=lambda r: -int(r[1])),
          col_widths_cm=[8.0, 4.0])

    for bucket in sorted(buckets, key=lambda k: -len(buckets[k])):
        h2(doc, f"3.{bucket}  ({len(buckets[bucket])} routes)")
        rows = []
        for r in buckets[bucket]:
            pg = INV["pages"].get(r["url"], {})
            rows.append([
                r["url"],
                str(pg.get("buttons", 0)),
                str(pg.get("onClicks", 0)),
                str(pg.get("inputs", 0)),
                str(pg.get("dialogs", 0)),
                ", ".join(pg.get("stores", []))[:80],
            ])
        table(doc, ["URL", "Btns", "onClk", "Inputs", "Dlg", "Stores used"], rows,
              col_widths_cm=[5.5, 1.0, 1.0, 1.0, 1.0, 7.5])

    page_break(doc)

    # ── Stores inventory ────────────────────────────────────────────────
    h1(doc, "4. Stores (Zustand)")
    p(doc, "Every store under src/store/. Persisted stores survive a page "
           "refresh; non-persisted ones are intentionally transient.")
    table(doc, ["Store", "Persisted", "Mutation actions (est.)", "Audit emits"],
          [[st["name"], "Yes" if st["persisted"] else "No",
            str(st["mutationActions"]), str(st["auditEmits"])]
           for st in INV["stores"]],
          col_widths_cm=[5.5, 2.0, 4.5, 3.0])

    # ── API surface ─────────────────────────────────────────────────────
    h1(doc, "5. Mock API Surface")
    p(doc, "Every module under src/lib/api/. Method lists are the public "
           "names exposed by each domain. Shapes are zod-validated and mirror "
           "the future REST contracts in 02 TRD §5.")
    for a in INV["api"]:
        h3(doc, a["file"])
        p(doc, f"Methods: {', '.join(a['methods']) if a['methods'] else '(none)'}")
        p(doc, f"Zod schemas: {a['schemaCount']}")

    # ── Components ─────────────────────────────────────────────────────
    h1(doc, "6. Components")
    p(doc, f"{len(INV['components'])} component files across src/components/.")
    chunks = [INV["components"][i:i+3] for i in range(0, len(INV["components"]), 3)]
    table(doc, ["Component file (1)", "Component file (2)", "Component file (3)"],
          [c + [""] * (3 - len(c)) for c in chunks],
          col_widths_cm=[5.5, 5.5, 5.5])

    page_break(doc)

    # ── Regression contract ────────────────────────────────────────────
    h1(doc, "7. Regression Contract")
    p(doc, "scripts/regression-suite.cjs encodes the live behaviour contract. "
           "It is re-run after every milestone before any checkpoint is taken. "
           "A milestone is blocked from checkpointing while any of the items "
           "below are red.")

    h2(doc, "7.1 Role-portal contract (16 surfaces)")
    table(doc, ["Tab",                "Card label",            "Portal badge",        "Content marker"],
          [
              ["Management",           "Admin",                 "Admin Portal",        "Hospital Analytics"],
              ["Management",           "Quality",               "Quality & Safety",    "Quality"],
              ["Clinical",             "Doctor",                "Doctor Portal",       "OPD"],
              ["Clinical",             "Nurse",                 "Nursing Station",     "Ward"],
              ["Clinical",             "Pharmacy",              "Pharmacy",            "Pharmacy"],
              ["Clinical",             "Laboratory",            "Laboratory",          "Lab"],
              ["Clinical",             "Radiology",             "Radiology Dept",      "Radiology"],
              ["Clinical",             "Emergency",             "Emergency Room",      "ER"],
              ["Operations",           "Reception",             "Reception",           "OPD"],
              ["Operations",           "Admission / Beds",      "Admission Desk",      "Admission"],
              ["Operations",           "Discharge",             "Discharge Desk",      "Discharge"],
              ["Operations",           "Operation Theater",     "Operation Theater",   "Schedule"],
              ["Finance",              "Billing",               "Billing Dept",        "Billing"],
              ["Finance",              "Insurance / TPA",       "TPA & Insurance",     "Insurance"],
              ["Support Services",     "Audit / Compliance",    "Audit & Compliance",  "Compliance"],
              ["Patient",              "Patient Portal",        "Patient Portal",      "AI Care"],
          ],
          col_widths_cm=[3.0, 4.0, 4.5, 4.0])

    h2(doc, "7.2 Hero-journey contract (Anil Kumar Verma, PT-44012)")
    bullet(doc, "Mock-API patients table contains PT-44012 with allergies = ['Penicillin'].")
    bullet(doc, "IPD stay record exists, ward = 'Surgical', bed = BED-SUR-1.")
    bullet(doc, "Vitals timeline includes at least one NEWS2 = 5 transient row.")
    bullet(doc, "Bill exists with at least one line where duplicateFlag = true.")
    bullet(doc, "Lab results, radiology study, prescriptions, discharge all present.")
    bullet(doc, "Legacy stores: ER triage (ESI 3), insurance claim (denial-risk 72), OT lap appendectomy, narcotic Morphine row, Augmentin in drug master with allergyClasses including 'Penicillin', Inpatient row at bed SW-301.")

    h2(doc, "7.3 Cross-cutting contract")
    bullet(doc, "Persisted localStorage keys ≥ 20 (api.v1.* tables + 11 persisted stores + auth + notifications).")
    bullet(doc, "Audit trail ≥ 20 events at fresh seed; never empty.")
    bullet(doc, "Zero native window.alert / window.confirm / window.prompt in the codebase.")
    bullet(doc, "TypeScript: `tsc --noEmit` exits clean.")
    bullet(doc, "Production build: `next build` exits successfully with 162 routes.")
    bullet(doc, "Puppeteer console errors during the full sweep ≤ 0 (warnings allowed).")

    h2(doc, "7.4 Parallel inpatient contract (Kiran Patil, PT-20394)")
    bullet(doc, "Kiran's NSTEMI / post-PCI thread remains intact: IPD in ICU, post-PCI prescription, discharge, audit trail.")
    bullet(doc, "Compaction may resurface or reorganise her data; it must not be deleted.")

    page_break(doc)

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "M0 baseline inventory captured from src/."]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(HERE / "11_Feature_Flow_Inventory_v1_0.docx")
