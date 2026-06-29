"""Generate 08_Phase1_UI_Interactivity_Audit_v1_0.docx.

Audit of every interactive element across all 24 staff roles + patient portal,
graded against 03_App_Flow_Document for Phase 1 (UI-only demo) readiness.

Status legend:
  Works           — button wired + store mutation + persists in-session + audit emit
  Partial         — wired + mutates, but missing audit OR uses native alert/confirm/prompt
  Lost-on-refresh — mutates a NON-persisted store (data vanishes on F5)
  Dead            — no real handler / "coming soon" toast / unwired
  Missing         — feature from 03 has no UI surface yet
"""
from pathlib import Path
from _helpers import *


# ──────────────────────────────────────────────────────────────────────────
#  ROLE-LEVEL AUDIT DATA
#  Columns: (Flow, Screen/Route, Element/Button, Expected, Current, Status, Fix, Effort)
# ──────────────────────────────────────────────────────────────────────────

ADMIN = [
    ("Dashboard",   "/admin/dashboard",      "All KPI widgets",                    "Reflect live ops state",
     "Read multiple stores; non-persisted ones reset on F5",                          "Lost-on-refresh", "Phase-1 seed via mock-API; persist all", "M"),
    ("Dashboard",   "/admin/dashboard",      "Quick-action shortcuts",             "Deep-link to roster / compliance",
     "Work today",                                                                     "Works",          "—",                                       "S"),
    ("Users",       "/admin/users",          "Broadcast button",                     "Open composer",
     "toast.info('Broadcast composer arrives in Phase 10')",                          "Dead",           "Build broadcast composer dialog",         "M"),
    ("Users",       "/admin/users",          "Bulk deactivate button",               "Confirm + deactivate",
     "toast.info('Bulk deactivate — confirm modal in M1.3')",                          "Dead",           "Dialog + multi-select bulk action",       "M"),
    ("Credentials", "/admin/credentials",    "Renew credential button",              "Open renewal workflow",
     "toast.info('Renew workflow ships in M1.4 follow-up')",                          "Dead",           "Build renew dialog + emit + store push",  "M"),
    ("Roster",       "/admin/roster",         "Cell drag / template apply",          "Drop assignment; conflict engine fires",
     "Works (shift store persists); conflicts inline",                                "Works",          "—",                                       "S"),
    ("Roster",       "/admin/roster",         "Bulk publish week",                    "Confirm + publish + audit",
     "Publishes; uses uses HR store",                                                  "Works",          "—",                                       "S"),
    ("Coverage",     "/admin/coverage",       "Remove minimum row",                   "Confirm + remove",
     "Uses native window.confirm()",                                                  "Partial",        "Replace with Dialog",                      "S"),
    ("On-call",       "/admin/on-call",        "Edit slot",                            "Open swap workflow",
     "toast.info('Edit slot ships in M3.4')",                                          "Dead",           "Build swap-request dialog + store",       "M"),
    ("Duty",         "/admin/duty",           "Copy yesterday",                        "Copy if data exists",
     "no-op toast when empty; otherwise works",                                       "Partial",        "Show clear empty-state guidance",         "S"),
    ("Finance",      "/admin/finance",        "P&L drill-down",                      "Open detail drawer",
     "Drawer opens; numbers from non-persisted stores",                                "Lost-on-refresh","Mock-API persistence + seed reconcile",   "M"),
    ("Disputes",     "/admin/disputes",       "Resolve dispute",                       "Resolve + audit",
     "Vendor store emits audit; vendor store IS persisted",                            "Works",          "—",                                       "S"),
    ("Payroll",      "/admin/payroll",        "Lock payroll button",                   "Confirm + lock + audit",
     "Uses window.confirm()",                                                          "Partial",        "Replace with Dialog",                     "S"),
    ("Compliance",   "/admin/compliance",     "Filter chips + stream tiles",           "Filter + drill",
     "Works today; non-persisted modules reset",                                       "Lost-on-refresh","Mock-API persist all evidence sources",   "M"),
    ("DISHA",         "/admin/disha",           "Log breach",                            "Confirm + capture + audit",
     "Uses window.prompt() for summary",                                              "Partial",        "Replace with Dialog + zod form",          "S"),
    ("Statutory",    "/admin/statutory",       "File obligation",                       "Capture ack#/amount + audit",
     "Uses 2× window.prompt(); store IS persisted",                                   "Partial",        "Replace with multi-field Dialog",         "M"),
    ("Statutory",    "/admin/statutory",       "Mark exempt",                            "Capture reason + audit",
     "Uses window.prompt()",                                                          "Partial",        "Replace with Dialog",                     "S"),
    ("Vendors",      "/admin/vendors",         "Raise dispute",                         "Capture reason + audit",
     "Uses window.prompt(); vendor store persists",                                   "Partial",        "Replace with Dialog",                     "S"),
    ("Vendors",      "/admin/vendors",         "Pay invoice / mark paid",               "Status flip + audit",
     "Works; vendor store persists, audits",                                          "Works",          "—",                                       "S"),
    ("AI Performance","/admin/ai-performance",  "Feature drill cards",                    "Real AI metrics",
     "Falls back to DEMO_FEATURE_DATA when feedback empty",                          "Partial",        "Always render seed data so demo is clean", "S"),
    ("Disha RTBF",    "/admin/disha",           "Process RTBF",                          "Approver gate + tombstone",
     "Status flip; not persisted across refresh",                                     "Lost-on-refresh","Persist via mock-API",                    "M"),
]

DOCTOR = [
    ("Dashboard",   "/doctor/dashboard",     "Start consult from OPD queue",      "Open consult ticket",
     "Works incl. shift gate (window.confirm fallback)",                              "Partial",        "Replace window.confirm with Dialog",        "S"),
    ("Dashboard",   "/doctor/dashboard",     "Structure note (AI)",                 "AI structures notes",
     "Disabled correctly when empty; toast on success",                              "Works",          "—",                                       "S"),
    ("OPD",         "/doctor/opd/[id]",      "Save SOAP note",                       "Note saved + audit",
     "Saves via useConsultationStore (NOT persisted, NOT audited)",                  "Lost-on-refresh","Mock-API persist; emit audit",            "M"),
    ("OPD",         "/doctor/opd/[id]",      "Submit Rx",                            "Drug-safety run + sign + audit",
     "Safety runs; Rx state held in non-persisted store; no audit emit",             "Lost-on-refresh","Persist + add prescription.signed audit", "M"),
    ("OPD",         "/doctor/opd/[id]",      "Voice scribe",                          "Capture + edit + save",
     "Capture works; transcript stored in browser only",                              "Lost-on-refresh","Persist transcript via mock-API",         "S"),
    ("OPD",         "/doctor/opd/[id]",      "Order labs / imaging",                  "Send order + queue + audit",
     "Orders added to non-persisted lab/rad stores; no audit",                       "Lost-on-refresh","Persist + audit",                          "M"),
    ("OPD",         "/doctor/opd/[id]",      "AI pre-brief accept/reject",            "HITL emit + audit",
     "UI exists; envelopes returned by stub; no audit",                              "Partial",        "Emit ai.suggestion.handled audit",        "S"),
    ("IPD",         "/doctor/ipd",           "Open patient drawer",                  "Show chart link",
     "Works; inpatient store IS persisted",                                          "Works",          "—",                                       "S"),
    ("IPD",         "/doctor/ipd",           "Actions menu (med add/remove/refer)",  "Mutate chart + audit",
     "useInpatientStore persists; no audit on mutation",                              "Partial",        "Add audit emits in store",                "S"),
    ("IPD",         "/doctor/ipd",           "Initiate discharge",                    "Hand off to /discharge",
     "Initiates; useDischargeStore NOT persisted",                                    "Lost-on-refresh","Persist discharge state",                 "M"),
    ("Online",      "/doctor/online",        "Open consult tile",                     "Show vitals + Rx",
     "Demo data only (src/data/onlineConsults.ts)",                                  "Partial",        "Persist patient demo seed",               "S"),
    ("Activity",    "/doctor/activity",       "Filter by date range",                  "Re-render graph",
     "Works client-side from seeded prand() data",                                   "Partial",        "Drive from mock-API persisted facts",     "M"),
    ("Copilot",      "/doctor/copilot",       "Send + tool calls",                    "Real AI suggestion",
     "Stub returns canned envelope",                                                 "Partial",        "Keep stub for demo; vary by intent",      "S"),
    ("Settings",    "/doctor/settings",       "Profile / preferences",                "Save + persist",
     "Saves; useDoctorProfileStore IS persisted",                                    "Works",          "—",                                       "S"),
    ("AI Asst",     "/doctor/ai-assistant",   "Send message",                          "AI reply",
     "Disabled correctly when empty; reply via stub",                                 "Works",          "—",                                       "S"),
]

NURSE = [
    ("Dashboard",   "/nurse/dashboard",      "Ward / bed selection",              "Open bed",
     "Works; useWardStore reads + useInpatientStore (persisted)",                     "Works",         "—",                                       "S"),
    ("Rounds",      "/nurse/rounds",          "Capture vitals + NEWS2",            "Save + NEWS2 compute + escalate",
     "Saves to useNursingStore (persisted); no audit",                                "Partial",        "Add audit emit on vitals.captured",       "S"),
    ("Rounds",      "/nurse/rounds",          "Add medicine / test / instruction", "Append to round + audit",
     "Persisted; not audited",                                                        "Partial",        "Add audit emits",                          "S"),
    ("MAR",          "/nurse/mar",             "Administer dose",                     "Mark on-time + audit",
     "MAR state in nursing store (persisted); no audit",                              "Partial",        "Add mar.administered audit",              "S"),
    ("MAR",          "/nurse/mar",             "Late / refused entry",                 "Capture reason + audit",
     "Persisted; no audit",                                                           "Partial",        "Add audit + require reason field",        "S"),
    ("Handover",     "/nurse/handover",        "Save SBAR + AI summary",              "Save + acknowledge incoming",
     "useNursingStore persists; no audit",                                            "Partial",        "Add handover.save + handover.ack audits", "S"),
    ("Escalation",   "/nurse/escalation",      "Trigger escalation",                  "Push notification + banner + audit",
     "Notification store persists; no audit on trigger",                              "Partial",        "Add nurse.escalation.fired audit",        "S"),
    ("Camera",       "/nurse/camera",          "Capture photo",                       "Attach to chart + audit",
     "useCameraStore captures; not persisted; not audited",                           "Lost-on-refresh","Persist via mock-API blob layer",         "M"),
    ("AI Asst",      "/nurse/ai-assistant",    "Send + receive",                       "Stub envelope",
     "Works; disabled on empty",                                                      "Works",          "—",                                       "S"),
]

PHARMACY = [
    ("Queue",        "/pharmacy/queue",        "Claim Rx",                             "Pharmacist claims + audit",
     "Claim flips; useNursingStore via pharmacy store; no claim audit",               "Lost-on-refresh","Persist + audit pharmacy.claim",          "M"),
    ("Queue",        "/pharmacy/queue",        "Substitute drug",                       "Suggest sub + doctor approve + audit",
     "Subs flip; useDrugMasterStore NOT persisted; pharmacy store audits on dispense","Lost-on-refresh","Persist drug master + emit substitution","M"),
    ("Queue",        "/pharmacy/queue",        "Dispense (bedside / counter)",          "Dispense + MAR push + audit",
     "Dispense works + audits; pharmacy store NOT persisted",                          "Lost-on-refresh","Persist pharmacy store via mock-API",     "M"),
    ("Narcotics",    "/pharmacy/narcotics",    "Sign-out with witness",                "Two-sig + audit",
     "useNarcoticsStore NOT persisted; logs via audit store (not persisted)",         "Lost-on-refresh","Persist both; witness sig required",      "M"),
    ("Inventory",    "/pharmacy/inventory",    "Adjust stock / receive PO",             "Update qty + lot + audit",
     "usePharmacyInventoryStore NOT persisted; no audit",                              "Lost-on-refresh","Persist + audit inventory.adjust",        "M"),
    ("Discharge",    "/pharmacy/discharge",    "Process returns",                       "Mark returned + push to discharge pillar",
     "Discharge store NOT persisted; pharmacy returns not synced",                     "Lost-on-refresh","Persist + cross-store sync",              "M"),
]

LAB = [
    ("Dashboard",   "/lab/dashboard",         "Sample collected",                      "Move to bench queue",
     "useLabStore NOT persisted; no audit",                                            "Lost-on-refresh","Persist + emit lab.sample.collected",     "M"),
    ("Bench",        "/lab/bench/[k]",         "Claim / run / submit result",            "Tech claim + result + audit",
     "Mutates non-persisted store; no audit",                                          "Lost-on-refresh","Persist + audit per step",                "M"),
    ("QC",            "/lab/qc",                "QC pass / fail",                         "Gate next step + audit",
     "useLabQCStore NOT persisted; no audit",                                          "Lost-on-refresh","Persist + audit",                          "M"),
    ("Verify",        "/lab/verify",            "Verifier sign-off + critical check",      "Release + notify on critical",
     "Verify flips; critical notification not wired",                                  "Partial",        "Add critical-value notify path",          "M"),
    ("Microbiology", "/lab/microbiology",      "Add organism / sensitivity",              "Multi-day workflow + audit",
     "Wired with disabled-when-empty; no persist + no audit",                          "Lost-on-refresh","Persist + audit",                          "M"),
    ("Reflex",        "/lab/reflex",            "Apply reflex rule",                      "Auto-add panel + audit",
     "Rules in lib; trigger flips lab store (not persisted)",                          "Lost-on-refresh","Persist + audit",                          "S"),
]

RADIOLOGY = [
    ("Inbox",        "/radiology/inbox",        "Schedule modality",                     "Move to acquisition",
     "useRadiologyStore NOT persisted; no audit",                                      "Lost-on-refresh","Persist + audit",                          "M"),
    ("Acquisition",  "/radiology/scans",        "View DICOM",                              "Open viewer",
     "toast.info('DICOM viewer integration coming soon')",                            "Dead",            "Mock viewer iframe / image stub",          "S"),
    ("Reading",      "/radiology/reading",      "AI draft + edit + sign",                 "Sign + release + audit",
     "Draft from stub; sign flips non-persisted store",                                "Lost-on-refresh","Persist + emit radiology.signed",         "M"),
    ("Studies",      "/radiology/studies",      "Open study card",                         "Show metadata",
     "Works against non-persisted seed",                                               "Lost-on-refresh","Persist via mock-API",                    "S"),
]

EMERGENCY = [
    ("Triage",       "/emergency/triage",       "ESI 1-5 + AI suggest",                   "Triage + bay + doctor + audit",
     "Triage flips useERStore (NOT persisted) — store DOES audit",                    "Lost-on-refresh","Persist ER store",                         "M"),
    ("Floor",        "/emergency/floor",        "Bay status transitions",                  "Resus / observation / dispo",
     "Flips non-persisted store",                                                      "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Dashboard",   "/emergency/dashboard",     "KPI cards",                                "Live counts",
     "Counts derived from non-persisted store",                                        "Lost-on-refresh","Persist via mock-API",                    "S"),
]

RECEPTION = [
    ("OPD",           "/reception/opd",            "Walk-in registration",                   "Create patient + token + audit",
     "Patient store mutate + audit; not persisted",                                   "Lost-on-refresh","Persist patient store via mock-API",       "M"),
    ("OPD",           "/reception/opd",            "Promote / cancel queue row",              "State flip + audit",
     "Queue flips; not persisted",                                                    "Lost-on-refresh","Persist + audit",                          "S"),
    ("Appointments",  "/reception/appointments",   "Book slot",                                "Reserve + patient + shift gate",
     "Books; not persisted",                                                          "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Walk-in",       "/reception/walk-in",         "Quick form submit",                       "Register + token",
     "Works; not persisted",                                                          "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Insurance",     "/reception/insurance",       "Verify card",                              "Validate + log",
     "useInsuranceStore NOT persisted; no audit",                                     "Lost-on-refresh","Persist + audit",                          "S"),
    ("Messages",      "/reception/messages",        "Send reply",                               "Append + recipient",
     "useMessagingStore IS persisted; reply works",                                   "Works",          "—",                                       "S"),
    ("Ambulance",     "/reception/ambulance",       "Pre-notify ER",                           "Dispatch + audit",
     "useAmbulanceStore audits; not persisted",                                       "Lost-on-refresh","Persist via mock-API",                    "S"),
]

ADMISSION = [
    ("Requests",      "/admission/dashboard",       "Cancel request",                           "Status flip + audit",
     "Works (admission store audits, but NOT persisted)",                              "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Bed map",       "/admission/beds",             "Assign / transfer / swap",                 "Bed flip + housekeeping push",
     "Flip works; housekeeping cascade is non-persisted",                              "Lost-on-refresh","Persist + cross-store sync",              "M"),
    ("Forecast",       "/admission/forecast",         "Forecast cards",                            "Show projections",
     "Read-only widget",                                                              "Works",          "—",                                       "S"),
]

DISCHARGE = [
    ("Dashboard",    "/discharge/dashboard",       "Mark pillar cleared",                       "Pillar flip + audit",
     "Flip works; useDischargeStore NOT persisted, NOT audited",                       "Lost-on-refresh","Persist + audit pillar.cleared",          "M"),
    ("Dashboard",    "/discharge/dashboard",       "Add blocker (toast)",                       "Blocker recorded",
     "toast.info('Blocker added') — store changes inferred",                          "Partial",        "Verify the actual store mutation",         "S"),
    ("Summary",       "/discharge/summary/[id]",    "Regenerate AI summary",                     "Stub re-roll",
     "Works (toast); summary state non-persisted",                                    "Partial",        "Persist; emit audit",                      "S"),
    ("Dashboard",    "/discharge/dashboard",       "Issue exit clearance",                       "Final gate + audit",
     "Disabled state correct; no audit emit",                                         "Partial",        "Add discharge.exit.cleared audit",         "S"),
]

OT = [
    ("Schedule",     "/ot/schedule",                "Schedule case",                              "Reserve slot + team + audit",
     "useOTStore NOT persisted; no audit",                                             "Lost-on-refresh","Persist + audit",                          "M"),
    ("Checklist",    "/ot/checklist",                "Sign-in / Time-out / Sign-out",              "Each step required + audit",
     "Checklist flip; not persisted; no audit",                                       "Lost-on-refresh","Persist + audit per step",                "M"),
    ("Dashboard",    "/ot/dashboard",                "Case-of-day cards",                          "Mark complete + push to recovery",
     "Flips; not persisted",                                                          "Lost-on-refresh","Persist via mock-API",                    "S"),
]

BILLING = [
    ("Dashboard",    "/billing/dashboard",          "Open bill",                                  "Show line items + payer",
     "Reads useBillingStore (NOT persisted, DOES audit)",                              "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Patient bill",  "/billing/patient/[id]",       "Add / remove line",                          "Edit + audit",
     "Mutates billing store (audits); not persisted",                                  "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Patient bill",  "/billing/patient/[id]",       "Freeze / unfreeze",                          "Lock with audit",
     "Works (freezeBill audits); not persisted",                                       "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Discounts",    "/billing/discounts",           "Apply discount",                              "Adjust total + audit",
     "Mutates billing store; not persisted",                                          "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Refunds",      "/billing/refunds",              "Raise / approve refund",                     "Two-step + audit",
     "Single-step today; no approver gate",                                            "Missing",         "Build approver gate (per BRD FR-507)",     "M"),
]

INSURANCE = [
    ("Dashboard",    "/insurance/dashboard",        "Verify card",                                 "OTP / TPA check",
     "Disabled until input; useInsuranceStore NOT persisted",                          "Lost-on-refresh","Persist + mock-verify endpoint",          "S"),
    ("Claims",       "/insurance/claims",            "Submit claim",                                "Score + send + audit",
     "Flips store; no audit",                                                          "Lost-on-refresh","Persist + audit",                          "M"),
    ("Preauth",      "/insurance/preauth",            "Draft pre-auth",                              "AI risk + send",
     "Draft via stub; no audit",                                                       "Lost-on-refresh","Persist + audit",                          "M"),
    ("TPA desk",     "/insurance/tpa",                 "Resolve query",                               "Append + status",
     "Status flip works; not persisted",                                              "Lost-on-refresh","Persist via mock-API",                    "S"),
]

AUDIT = [
    ("Dashboard",    "/audit/dashboard",             "Module chips + counts",                       "Filter by chapter",
     "Reads useAuditStore (NOT persisted, seed loaded)",                              "Lost-on-refresh","Persist audit feed across session",        "M"),
    ("Trail",        "/audit/log",                    "Filter / drill / export CSV",                 "Filter + export",
     "Filter works; CSV export route TBD",                                            "Partial",        "Add CSV export helper",                   "S"),
    ("Reports",      "/audit/reports",                "Print evidence pack",                         "Generate PDF",
     "Uses window.print() — usable for demo",                                          "Partial",        "Replace with printDoc helper + watermark","S"),
]

QUALITY = [
    ("Dashboard",    "/quality/dashboard",           "Open incident",                              "Show detail drawer",
     "Reads useQualityStore (NOT persisted, DOES audit on capa)",                     "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Incidents",    "/quality/incidents",            "Report incident",                              "Capture + audit + assign",
     "Works (uses placeholder PT-XXXXX); not persisted",                              "Lost-on-refresh","Persist + reseed from demo patient",       "M"),
    ("CAPA",         "/quality/capa",                  "Close CAPA",                                  "Mark done + audit",
     "Mutates store; not persisted",                                                  "Lost-on-refresh","Persist via mock-API",                    "S"),
]

BLOODBANK = [
    ("Dashboard",    "/bloodbank/dashboard",         "Inventory cards",                             "Show stock",
     "Reads useBloodBankStore (audits, NOT persisted)",                               "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Donors",       "/bloodbank/donors",             "Register donor",                              "Capture + audit",
     "Form submits; useBloodBankStore audits; not persisted",                          "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Inventory",    "/bloodbank/inventory",           "Update unit",                                 "Status flip + audit",
     "Mutates store; not persisted",                                                  "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Requests",     "/bloodbank/requests",             "Issue / incompatibility",                     "Cross-match + audit",
     "Uses window.prompt() for incompatibility reason",                                "Partial",        "Replace with Dialog",                     "S"),
]

CSSD = [
    ("Dashboard",    "/cssd/dashboard",                "Open cycle",                                   "Show stages",
     "Works; useCSSDStore audits but NOT persisted",                                  "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Cycles",       "/cssd/cycles",                    "Move stage / BI pass",                         "Stage flip + audit",
     "Mutates store; audits; not persisted",                                          "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Sterilise",    "/cssd/sterilise",                  "Mark complete",                                "Push to distribution",
     "Mutates; not persisted",                                                        "Lost-on-refresh","Persist via mock-API",                    "S"),
]

BMW = [
    ("Dashboard",    "/bmw/dashboard",                 "Open waste category",                          "Show pickups",
     "Reads useBMWStore (audits, NOT persisted)",                                     "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Pickup",       "/bmw/pickup",                     "Mark picked",                                   "Status + audit",
     "Mutates; audits; not persisted",                                                "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Handover",     "/bmw/handover",                   "Vendor handover",                              "CPCB record + audit",
     "Mutates; audits; not persisted",                                                "Lost-on-refresh","Persist via mock-API",                    "S"),
]

DIETARY = [
    ("Dashboard",    "/dietary/dashboard",             "Diet card",                                     "Show meal plan",
     "Reads useDietaryStore (audits, NOT persisted)",                                  "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Plans",        "/dietary/plans",                  "Edit diet plan",                                 "Save + audit",
     "Mutates; audits; not persisted",                                                "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Orders",       "/dietary/orders",                  "Serve meal (allergy check)",                    "Confirm + audit",
     "Uses window.confirm() on allergy conflict",                                      "Partial",        "Replace with Dialog",                     "S"),
]

MORTUARY = [
    ("Dashboard",    "/mortuary/dashboard",             "Body card",                                     "Show MLC + status",
     "Reads useMortuaryStore (audits, NOT persisted)",                                "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Clearances",   "/mortuary/clearances",            "Autopsy + release",                              "Capture next-of-kin + audit",
     "Uses window.confirm + window.prompt",                                            "Partial",        "Replace with multi-field Dialog",         "M"),
]

AMBULANCE = [
    ("Dashboard",    "/ambulance/dashboard",            "Trip cards",                                    "Show status",
     "Reads useAmbulanceStore (audits, NOT persisted)",                               "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Dispatch",     "/ambulance/dispatch",              "Dispatch trip",                                  "Assign + ETA + audit",
     "Mutates; audits; not persisted",                                                "Lost-on-refresh","Persist via mock-API",                    "M"),
    ("Log",          "/ambulance/log",                   "Filter / export trip log",                       "Filter + audit",
     "Filter works; export TBD",                                                       "Partial",        "Add CSV export helper",                   "S"),
]

HOUSEKEEPING = [
    ("Dashboard",    "/housekeeping/dashboard",         "Assign task / start / done",                     "Bed cycle + audit",
     "Assign + start + done mutate; useHousekeepingStore audits; NOT persisted",       "Lost-on-refresh","Persist via mock-API",                    "M"),
]

INVENTORY = [
    ("Stock",         "/inventory/stock",                  "Receive lot / adjust qty",                       "Capture lot/expiry + audit",
     "Form submits; useInventoryStore NOT persisted; no audit",                       "Lost-on-refresh","Persist + audit",                          "M"),
    ("Vendors",       "/inventory/vendors",                "Open vendor",                                    "Show MoU + invoices",
     "Reads useVendorStore (persisted + audits)",                                     "Works",          "—",                                       "S"),
    ("Drug master",   "/inventory/drug-master",            "Add / edit drug",                                 "Save + audit",
     "Mutates useDrugMasterStore (NOT persisted, no audit)",                          "Lost-on-refresh","Persist + audit",                          "M"),
]

CHECKIN = [
    ("Kiosk",         "/checkin",                            "Generate kiosk link",                           "Show QR / URL",
     "Generates URL from window.location; client-only",                                "Works",          "—",                                       "S"),
    ("Kiosk intake",  "/checkin/intake",                     "Walk-in self register",                         "Push to reception queue",
     "Submits to patient store (NOT persisted)",                                       "Lost-on-refresh","Persist via mock-API",                    "M"),
]

PATIENT = [
    ("Dashboard",    "/patient/dashboard",                  "Cards (visits / vitals / next appt)",         "Personalised feed",
     "Reads multiple stores; few persisted",                                          "Lost-on-refresh","Persist patient profile + journey",        "M"),
    ("Lab",          "/patient/lab",                          "View result",                                  "Only released visible",
     "Filters by 'released' flag on lab store (NOT persisted)",                       "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Radiology",    "/patient/radiology",                    "Open study",                                   "Show report + image link",
     "useRadiologyStudiesStore NOT persisted",                                         "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("IPD",          "/patient/ipd",                            "Stay overview + photos",                       "Read-only feed",
     "Reads useInpatientStore (IS persisted)",                                         "Works",          "—",                                       "S"),
    ("Discharge",    "/patient/discharge",                     "Download docs",                                "Open PDF",
     "Uses printDoc; works",                                                          "Works",          "—",                                       "S"),
    ("Feedback",     "/patient/feedback",                      "Submit feedback",                              "Save + push to quality",
     "useFeedbackStore mutate; not persisted; not audited",                            "Lost-on-refresh","Persist + audit + relay to quality",       "M"),
    ("Messages",     "/patient/messages",                       "Send message",                                "Append + recipient",
     "Uses useMessagingStore (persisted)",                                            "Works",          "—",                                       "S"),
    ("Followup",     "/patient/followup",                       "Book follow-up",                              "Reserve slot",
     "useFollowupStore NOT persisted; placeholder phone (1800-XXX-0101)",              "Lost-on-refresh","Persist + replace XXX placeholder",       "S"),
    ("Family-track", "/patient/family-track",                   "Read-only view",                              "Subset of chart",
     "Works for consented data; not persisted",                                       "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("Appointments", "/patient/appointments",                   "Pick slot + confirm",                          "Reserve",
     "Disabled until slot picked; not persisted",                                     "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("ER",           "/patient/er",                             "Live status / ETA",                           "Real-time read",
     "Reads usePatientLiveStore (NOT persisted)",                                     "Lost-on-refresh","Persist via mock-API",                    "S"),
    ("OPD orders",    "/patient/orders",                          "Acknowledge order",                            "Tick + push back",
     "usePatientOrdersStore NOT persisted",                                            "Lost-on-refresh","Persist via mock-API",                    "S"),
]

HANDOVERS = [
    # (Handover, From, To, Trigger, Carries, Current, Status, Fix, Effort)
    ("Reception → Doctor", "Reception", "Doctor", "Walk-in registered",
     "Patient summary + intake form",
     "Reception writes to patient store (non-persisted); Doctor dashboard reads same store",
     "Lost-on-refresh", "Persist patient store; Phase-2 mock-API",       "M"),
    ("Doctor → Pharmacy", "Doctor", "Pharmacy", "Rx signed",
     "Drugs + safety envelope",
     "Doctor mutates consultation store; pharmacy reads non-persisted pharmacy store; no audit",
     "Lost-on-refresh", "Persist + cross-store sync via mock-API",      "M"),
    ("Doctor → Lab", "Doctor", "Lab", "Lab order",
     "Patient + panel + indication",
     "Mutates lab orders store (NOT persisted); lab inbox reads non-persisted lab store",
     "Lost-on-refresh", "Persist both + emit lab.order.created audit",  "M"),
    ("Doctor → Radiology", "Doctor", "Radiology", "Imaging order",
     "Patient + modality + clinical question",
     "Order in non-persisted radiology store",
     "Lost-on-refresh", "Persist via mock-API",                          "M"),
    ("Doctor → Bed Mgr", "Doctor", "Bed Mgr", "Admission request",
     "Patient + ward + urgency",
     "Request in useAdmissionStore (audits, NOT persisted)",
     "Lost-on-refresh", "Persist via mock-API",                          "M"),
    ("Bed Mgr → Housekeeping", "Bed Mgr", "Housekeeping", "Bed needs clean",
     "Bed id + contamination flag",
     "Cascade reads non-persisted housekeeping store",
     "Lost-on-refresh", "Persist + cross-store sync",                    "M"),
    ("Bed Mgr → Nurse", "Bed Mgr", "Nurse", "Bed assigned",
     "Patient + bed + plan",
     "Nurse reads useInpatientStore (IS persisted) — handover survives",
     "Works", "—",                                                      "S"),
    ("Nurse → Doctor", "Nurse", "Doctor", "NEWS2 escalation",
     "Vitals trend + time-stamp",
     "Notification (persisted) reaches doctor — banner survives refresh",
     "Partial", "Add nurse.escalation.fired audit + UI banner test",     "S"),
    ("Doctor → Discharge", "Doctor", "Discharge", "Discharge initiated",
     "Patient + plan + follow-up",
     "Mutates useDischargeStore (NOT persisted)",
     "Lost-on-refresh", "Persist via mock-API",                          "M"),
    ("Pharmacy → Discharge", "Pharmacy", "Discharge", "Returns processed",
     "Unused-drug summary",
     "Pillar marker is in non-persisted discharge store",
     "Lost-on-refresh", "Persist via mock-API",                          "M"),
    ("Billing → Discharge", "Billing", "Discharge", "Bill cleared",
     "Receipt",
     "Pillar marker is in non-persisted discharge store",
     "Lost-on-refresh", "Persist via mock-API",                          "M"),
    ("Discharge → Housekeeping", "Discharge", "Housekeeping", "Bed free",
     "Bed id",
     "Cascade reads non-persisted housekeeping store",
     "Lost-on-refresh", "Persist + cross-store sync",                    "M"),
    ("OT → ICU/Ward", "OT", "Nurse", "Sign-out completed",
     "Op summary + post-op orders",
     "OT store NOT persisted; inpatient store IS — partial state",
     "Lost-on-refresh", "Persist OT store via mock-API",                 "M"),
    ("Insurance → Billing", "Insurance", "Billing", "Pre-auth approved / denied",
     "Amount + conditions",
     "Both stores NOT persisted",
     "Lost-on-refresh", "Persist both via mock-API",                     "M"),
    ("ER → Bed Mgr", "ER", "Bed Mgr", "Admission needed",
     "Patient + clinical brief",
     "Cross-store side-effect; both not persisted",
     "Lost-on-refresh", "Persist via mock-API",                          "M"),
    ("Ambulance → ER", "Ambulance", "ER", "Pre-notify (incoming)",
     "Patient + chief complaint",
     "Ambulance audits; ER not persisted",
     "Lost-on-refresh", "Persist both via mock-API",                     "M"),
    ("Quality ↔ all", "Quality", "All", "Incident filed",
     "Incident + CAPA tasks",
     "Quality store NOT persisted",
     "Lost-on-refresh", "Persist via mock-API",                          "M"),
    ("Audit ← all", "All", "Audit Officer", "Any mutation",
     "Audit row",
     "Audit store NOT persisted — chip counts reset on F5",
     "Lost-on-refresh", "Persist audit store via mock-API",              "M"),
]

# Status tallying helper
ALL_ROLE_TABLES = [
    ("Admin (COO)",         ADMIN),
    ("Doctor",                DOCTOR),
    ("Nurse",                 NURSE),
    ("Pharmacy",              PHARMACY),
    ("Lab",                    LAB),
    ("Radiology",              RADIOLOGY),
    ("Emergency",              EMERGENCY),
    ("Reception",              RECEPTION),
    ("Admission / Bed Mgr",    ADMISSION),
    ("Discharge",              DISCHARGE),
    ("OT",                      OT),
    ("Billing",                BILLING),
    ("Insurance",              INSURANCE),
    ("Audit Officer",          AUDIT),
    ("Quality",                QUALITY),
    ("Blood Bank",              BLOODBANK),
    ("CSSD",                    CSSD),
    ("BMW",                     BMW),
    ("Dietary",                DIETARY),
    ("Mortuary",                MORTUARY),
    ("Ambulance",                AMBULANCE),
    ("Housekeeping",            HOUSEKEEPING),
    ("Inventory",              INVENTORY),
    ("Check-in (kiosk)",        CHECKIN),
    ("Patient portal",          PATIENT),
]


def status_tally():
    buckets = {"Works": 0, "Partial": 0, "Lost-on-refresh": 0, "Dead": 0, "Missing": 0}
    for _name, rows in ALL_ROLE_TABLES:
        for row in rows:
            s = row[5]
            buckets[s] = buckets.get(s, 0) + 1
    for hv in HANDOVERS:
        s = hv[6]
        buckets[s] = buckets.get(s, 0) + 1
    return buckets


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "08 — Phase-1 UI Audit", "Phase-1 UI Interactivity Audit",
          "Every button, every flow, every role — current state vs. expected for client demo")
    toc(doc)

    # ── 1. Purpose & method ─────────────────────────────────────────────
    h1(doc, "1. Purpose")
    p(doc,
      "Phase 1 of Umang HIMS commits a complete, fully interactive UI demonstrable end-to-end "
      "against mock data — no real backend. This audit walks the codebase against "
      "03 App Flow Document, role by role and flow by flow, classifying every interactive "
      "element so we know exactly what to wire up in Phase-1 Step 2 / Step 3.")
    p(doc,
      "Each element is graded against six concerns: handler wired · store mutated · session "
      "persistence · audit emit · cross-role handover integrity · native-prompt-free.")

    h2(doc, "1.1 Status legend")
    table(doc, ["Status", "Definition"],
          [
              ["Works",            "Handler wired · store mutated · in-session persistent · audit emit fires."],
              ["Partial",          "Wired + mutates, but missing audit OR uses native alert / confirm / prompt OR feedback is toast-only."],
              ["Lost-on-refresh",  "Mutation runs against a NON-persisted store; data disappears on F5."],
              ["Dead",             "No real handler; \"coming soon\" toast; unwired."],
              ["Missing",          "Feature is described in 03 App Flow but no UI surface exists."],
          ],
          col_widths_cm=[3.5, 13.5])

    h2(doc, "1.2 Method")
    bullet(doc, "Static scan of src/app/**/page.tsx and src/components for handler patterns (onClick, form submit, store mutation).")
    bullet(doc, "Persistence determined by grep for `persist(` across src/store — 11 of 49 stores persist (StoreHydrator.tsx).")
    bullet(doc, "Audit emit traced through store actions — 17 of 49 stores call `useAuditStore.getState().log({…})` internally.")
    bullet(doc, "Cross-role handovers verified by tracing the cross-store imperative call sites (`useXStore.getState().action()`).")

    callout(doc, "Architectural observation",
            "The single most common gap class is Lost-on-refresh. Of 49 stores, only 11 persist to localStorage. "
            "Every clinical write surface (Patient, Pharmacy, Lab, ER, OT, Discharge, Insurance, Audit, …) loses "
            "state on F5. The Phase-1 architectural fix in Step 2 (mock API/repo + IndexedDB seed) eliminates this "
            "entire class in one change, before flow-by-flow polishing in Step 3.", kind="warn")

    page_break(doc)

    # ── 2. Status totals (front-loaded) ─────────────────────────────────
    h1(doc, "2. Status Totals")
    tally = status_tally()
    total = sum(tally.values())
    table(doc, ["Status", "Rows", "Share"],
          [
              ["Works",           str(tally['Works']),           f"{tally['Works']*100//total} %"],
              ["Partial",         str(tally['Partial']),         f"{tally['Partial']*100//total} %"],
              ["Lost-on-refresh", str(tally['Lost-on-refresh']), f"{tally['Lost-on-refresh']*100//total} %"],
              ["Dead",            str(tally['Dead']),            f"{tally['Dead']*100//total} %"],
              ["Missing",         str(tally['Missing']),         f"{tally['Missing']*100//total} %"],
              ["TOTAL",           str(total),                     "100 %"],
          ],
          col_widths_cm=[5.0, 3.0, 3.0])
    p(doc, "Coverage: 25 role sections + 18 cross-role handovers — see §4 and §5 for the detail.")

    h2(doc, "2.1 Phase-1 architectural blockers (resolve in Step 2)")
    table(doc, ["Blocker", "Today", "Fix in Step 2"],
          [
              ["No mock API boundary",      "Stores called directly from UI",                                   "Introduce src/lib/api/ typed boundary (zod) per BRD §6 + TRD §5"],
              ["38 of 49 stores non-persistent", "Data lost on F5",                                            "All persisted via the boundary, backed by IndexedDB-when-volume or localStorage-when-small"],
              ["32 of 49 stores silent on audit", "No evidence chain for many clinical actions",                "Wrap mutations in the boundary so audit is emitted uniformly"],
              ["12 native alert / confirm / prompt sites", "Unbranded, untranslatable, brittle",               "Replace with shared Dialog (already in src/components/ui)"],
              ["7 'coming soon' toasts (Dead)", "Buttons exist but do nothing real",                            "Implement against the boundary in Step 3"],
              ["No coherent demo seed", "Inconsistent state across roles",                                     "Seed scenario in Step 2 — one patient journey end-to-end"],
          ],
          col_widths_cm=[5.5, 6.0, 6.0])

    h2(doc, "2.2 Native-dialog hot list (replace in Step 3)")
    p(doc, "Sites using window.alert / confirm / prompt today:")
    table(doc, ["Site", "Pattern"],
          [
              ["/admin/coverage",          "window.confirm — remove minimum requirement"],
              ["/admin/disha",              "window.prompt — log breach (DPO summary)"],
              ["/admin/payroll",             "window.confirm — lock payroll"],
              ["/admin/statutory",          "window.prompt × 2 — file (ack# + amount)"],
              ["/admin/statutory",          "window.prompt — mark exempt (reason)"],
              ["/admin/vendors",             "window.prompt — raise dispute reason"],
              ["/bloodbank/requests",        "window.prompt — incompatibility reason"],
              ["/dietary/orders",            "window.confirm — serve despite allergy"],
              ["/doctor/dashboard",          "window.confirm × 2 — start consult off-shift / on leave"],
              ["/mortuary/clearances",       "window.confirm + window.prompt — autopsy + release to NoK"],
          ],
          col_widths_cm=[6.0, 11.0])

    h2(doc, "2.3 Dead-button hot list (build in Step 3)")
    table(doc, ["Site", "Today"],
          [
              ["/admin/credentials → Renew", "toast.info('Renew workflow ships in M1.4 follow-up')"],
              ["/admin/on-call → Edit slot", "toast.info('Edit slot workflow ships in M3.4')"],
              ["/admin/users → Broadcast",     "toast.info('Broadcast composer arrives in Phase 10')"],
              ["/admin/users → Bulk deactivate","toast.info('Bulk deactivate — confirm modal in M1.3')"],
              ["/radiology/scans → DICOM",     "toast.info('DICOM viewer integration coming soon')"],
              ["/discharge/dashboard → Blocker","toast.info('Blocker added') (no real mutation verified)"],
              ["/discharge/summary → Regenerate","toast.info('Regenerating summary…') (stub)"],
          ],
          col_widths_cm=[7.0, 10.0])

    page_break(doc)

    # ── 3. Methodology table (so reviewers see the inputs) ────────────────
    h1(doc, "3. Inputs Considered")
    table(doc, ["Signal", "Count"],
          [
              ["Page routes scanned (src/app/**/page.tsx)",            "162"],
              ["Components reviewed (src/components/**/*.tsx)",         "73"],
              ["Stores inventoried (src/store/use*.ts)",                "49"],
              ["Stores that persist to localStorage",                    "11"],
              ["Stores that emit audit on mutation",                     "17"],
              ["onClick handlers across staff routes (approx.)",         "~520"],
              ["alert / confirm / prompt occurrences",                   "12"],
              ["'coming soon' toast occurrences",                         "7"],
              ["AI services (all stubs returning HITL envelopes)",       "38"],
              ["Cross-role handovers verified (§5)",                     "18"],
          ],
          col_widths_cm=[10.0, 5.0])

    page_break(doc)

    # ── 4. Per-role audit ─────────────────────────────────────────────────
    h1(doc, "4. Per-Role Audit")
    p(doc, "Each role section lists representative interactive elements (the full surface area was scanned; "
           "this table captures every meaningfully-different button class).")

    for name, rows in ALL_ROLE_TABLES:
        h2(doc, name)
        table(doc,
              ["Flow", "Screen", "Element / Button", "Expected (per 03)", "Current", "Status", "Fix", "Effort"],
              [list(r) for r in rows],
              col_widths_cm=[1.6, 2.4, 2.6, 3.0, 3.0, 1.6, 2.4, 0.8])

    page_break(doc)

    # ── 5. Cross-role handovers ───────────────────────────────────────────
    h1(doc, "5. Cross-Role Handovers")
    p(doc, "Each row is a hand-off described in 03 App Flow §20. Status reflects whether the receiving role "
           "sees the right state after the trigger — and whether that state survives a page refresh.")
    table(doc,
          ["Handover", "From", "To", "Trigger", "Carries", "Current", "Status", "Fix", "Effort"],
          [list(r) for r in HANDOVERS],
          col_widths_cm=[2.3, 1.5, 1.5, 1.7, 2.2, 3.0, 1.5, 2.5, 0.8])

    page_break(doc)

    # ── 6. Phase-1 plan ────────────────────────────────────────────────────
    h1(doc, "6. Phase-1 Execution Plan")
    p(doc, "Mapping audit rows to the user-approved execution plan in this conversation:")

    h2(doc, "Step 2 — Mock API boundary + demo seed (must precede flow fixes)")
    bullet(doc, "Create src/lib/api/ with one typed module per domain (patients, visits, orders, prescriptions, pharmacy, lab, radiology, ipd, billing, insurance, ot, discharge, admin, compliance, audit, messaging, notification).")
    bullet(doc, "Schemas are zod and mirror 02 TRD §5 endpoint shapes verbatim — so Phase-2 swap is the transport only.")
    bullet(doc, "Implement persistence via IndexedDB (or extend existing Zustand persist when volume is small).")
    bullet(doc, "Adapter pattern: each existing store imports the matching module; mutations go through the boundary instead of mutating set() directly.")
    bullet(doc, "Demo seed = one coherent patient story (Kiran Patil PT-20394 NSTEMI/post-PCI) seeded across reception → OPD → lab → pharmacy → IPD → billing → discharge.")
    bullet(doc, "Add a 'Reset / reseed demo data' control in the admin dashboard (kept invisible behind a long-press / dev-only flag for client demos).")

    h2(doc, "Step 3 — Close every Phase-1 gap from §4 / §5")
    bullet(doc, "Resolve every Lost-on-refresh row by routing the mutation through the boundary (most rows collapse here).")
    bullet(doc, "Replace all 12 native-dialog sites with the shared Dialog component.")
    bullet(doc, "Implement the 7 'coming soon' buttons against the boundary.")
    bullet(doc, "Add audit emits to the 32 silent stores — same pattern as the 17 that already audit.")
    bullet(doc, "Convert toast-only feedback to a HITL card where the original event is a clinical decision (AI accept/reject, allergy override, dose-out-of-range).")

    h2(doc, "Step 4 — Verification")
    bullet(doc, "For each role, run the per-role Puppeteer sweep already in scripts/.")
    bullet(doc, "Cross-role handover sweep: a single new script walks Kiran's full journey across 7+ roles and asserts state at every handoff.")
    bullet(doc, "Update 07 Gap Analysis — flip Phase-1 rows to Closed; leave backend rows Open/Deferred.")
    bullet(doc, "Update §4 / §5 of this document so the audit closes too.")

    h1(doc, "7. Out of Scope for Phase 1 (handled by simulation)")
    bullet(doc, "Real OIDC auth (GAP-001/003/008/009) — keep the role-card switcher; add mock-session payload that includes role, name, dept so the demo feels like a real login.")
    bullet(doc, "Patient identity proofing (GAP-002/004) — Aadhaar OTP screen shows success after 1 s wait; no real UIDAI call.")
    bullet(doc, "Real relational DB (GAP-010/015/016/017) — mock API + IndexedDB stand in.")
    bullet(doc, "Real AI vendor (GAP-014) — keep stub envelopes; vary confidence + reasoning per prompt so the demo feels live.")
    bullet(doc, "Real payments (GAP-024) — UPI screen shows 'paid' after 2 s and emits payment.captured audit.")
    bullet(doc, "Real WhatsApp / Email / SMS (GAP-018/048) — keep current scaffold; show 'queued' toast.")
    bullet(doc, "Real lab analyser bridge (GAP-005) — manual entry only.")
    bullet(doc, "Real OWASP / encryption (GAP-006/007) — disclosed in BRD §7, deferred to Phase 2.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial Phase-1 audit. 25 role sections, 18 handovers."]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "08_Phase1_UI_Interactivity_Audit_v1_0.docx")
