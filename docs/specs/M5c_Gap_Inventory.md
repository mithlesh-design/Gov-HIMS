# M5c — Exhaustive Gap Inventory · all 24 roles + cross-cutting

> Compiled 2026-06-03 from a 4-agent parallel deep-audit of every page, button, form, upload, transition, notification, and audit hook in the M5b-final tree (`checkpoint/M5b-final`).
>
> **Total gaps catalogued: 263** (some are micro, some are workflow-breaking — listed flat, prioritisation comes next).

---

## Role-level capability rating (from the prior Capability Audit)

The micro-gaps below are organised under each role. Roles flagged 🟡 PARTIAL or 🔴 THIN/READ-ONLY in the prior audit are the headline targets — the column below shows why each was rated below ✅:

| # | Role | Rating | Headline gap (the rating's reason) |
|---|---|---|---|
| 2 | **nurse** | 🟡 PARTIAL | No wound-care, fall-risk, pressure-ulcer, care-plan ownership modules |
| 5 | **radiology** | 🟡 PARTIAL | No PACS upload UI; no BI-RADS/LI-RADS auto-flag; no prior-comparison |
| 6 | **emergency** | 🟡 PARTIAL | No chief-complaint SOAP; no orders from ER; no re-triage on deterioration |
| 8 | **bed_manager** | 🟡 PARTIAL | No bed transfer/swap; no hold/reserve beyond direct assign |
| 11 | **billing** | 🟡 PARTIAL | Package application UI absent; refund flow has routes but no mutations |
| 12 | **insurance** | 🟡 PARTIAL | Pre-auth create + claim approve/reject form wiring missing |
| 16 | **inventory** | 🔴 THIN / READ-ONLY | No procure / receive / consume CRUD — dashboard only |
| 18 | **cssd** | 🔴 THIN / READ-ONLY | No cycle create, fail-reason record, or re-cycle scheduling |
| 20 | **bmw** | 🔴 THIN / READ-ONLY | No log create, approval workflow, or vendor dispatch |
| 22 | **ambulance** | 🔴 THIN / READ-ONLY | No dispatch create, trip assign, or driver mgmt |
| 24 | **patient** | 🟡 PARTIAL | No symptom self-report intake; no refill request; no telemedicine join; no chronic-disease self-enroll |

**Roles rated ✅ at the high level still have micro-gaps** — see per-role detail below. The ✅ means the *core duty* works; not that every button is wired.

---

## Heat map — gaps per role

| Role | Count | Severity profile |
|---|---|---|
| admin | 25 | Stubs across staff onboarding, payroll lock, vendor pay, roster bulk, compliance, credentials, finance reports |
| patient | 27 | Most CTAs toast-only — payment, reorder, reschedule, file uploads all stubbed |
| doctor | 11 | Discharge route doesn't notify desk; consultation page redirects; settings save not persisted |
| nurse | 13 | Rounds-complete not notified to doctor; MAR "held" missing required reason; first-visit wizard return undocumented |
| pharmacy | 9 | Mark-ready doesn't notify ward; substitution audit reason missing; out-of-stock alt not relayed |
| lab | 8 | TAT breach no auto-escalate; rejection no recollect order; callback recipient unvalidated |
| radiology | 10 | Callback recipient unvalidated; PACS not wired; stuck-study drill-down missing |
| emergency | 7 | NEWS2 high-score no auto-alert; vital ranges unvalidated; MCI mode static |
| reception | 7 | Print/download buttons toast only; ambulance dispatch not notified |
| admission (bed_manager) | 5 | Bed-assign no nursing notification; arrived no doctor notification |
| discharge | 6 | Pillar toggle no role notification; exit clearance no housekeeping handoff; AI summary is canned template |
| ot | 5 | Schedule no anaesthetist notification; double-booking allowed; checklist no sign-off workflow |
| billing | 7 | Apply-to-bill + new-package no handlers; refund reject no patient notification |
| insurance | 5 | Pre-auth no submit-to-TPA; verify is mockVerify; claims no file/init form |
| quality | 7 | Incident critical no quality-head notification; CAPA missing; dashboard absent |
| housekeeping | 5 | Assignment notification missing; verification no photo proof; bed-ready no handoff |
| inventory | 4 | Reorder toast-only; receive delivery missing; repair scheduling stub |
| blood_bank | 5 | Add unit modal missing; reserve action missing; expiry action absent |
| cssd | 4 | Start cycle missing; fail/retry missing; instrument status frozen |
| dietary | 3 | Edit/approve plan missing; mark-delivered missing; allergy-conflict capture missing |
| bmw | 3 | Mark-disposed missing; non-compliant reason capture absent; cert upload missing |
| mortuary | 3 | Mark-cleared/release missing; print death cert missing; MLC police routing absent |
| ambulance | 4 | Dispatch nearest button stub; no driver notification; return-from-trip missing |
| audit_officer | 4 | PDF export missing; full payload not downloadable; reports/dashboard absent |
| **Patient sub-surfaces** | | |
| checkin (kiosk) | 5 | Identity not verified post-scan; no notification to reception; consent not captured |
| family-track | 4 | Camera request no nurse queue; feed is stub; status doesn't refresh |
| **Cross-cutting** | | |
| AppShell + nav | 4 | Bell click not wired; top-bar search no-op; settings absent; locale not persisted |
| CommandPalette | 3 | Intents don't pre-fill; patient nav doesn't open record; staff search role-gated |
| NotificationStore + dispatcher | 7 | Seeds hardcoded; .add() rarely called from real actions; no real channels dispatch |
| Messaging / chat | 5 | Two-party only; no group; receive() never called from backend; LS only |
| WhatsApp outbound | 3 | Mock thread; escalate doesn't page; no patient-side button |
| Audit coverage | 5 | Bridge lazy/optional; patient actions not logged; consent toggles unaudited |
| Upload + download | 4 | All "download" buttons toast-only; no patient profile uploads; insurance no missing-doc upload |
| Settings / Setup | 4 | Patient profile read-only; no notification prefs; locale not persisted; reminder timing not configurable |
| I18n | 4 | Many UI strings hardcoded outside en.json/hi.json |

**Aggregate: 263 gaps across 24 roles + 9 cross-cutting domains.**

---

## Per-role gap detail

### doctor (11)
1. `src/app/doctor/dashboard/page.tsx` Admission modal incomplete — visible "Send to Bed Manager" button missing / hidden behind truncated render
2. `src/app/doctor/schedule/page.tsx` availableForOPD / availableForOnline toggles don't gate schedule modifications when OFF
3. `src/app/doctor/beds/page.tsx:121` "Request transfer to {selected.location}" toasts only — no persist to useAdmissionStore, no audit
4. `src/app/doctor/settings/page.tsx:85` "Save settings" toasts success — setProfile mutations don't persist
5. `src/app/doctor/records/page.tsx` "Open consultation" on online patient — no check for concurrent video sessions
6. `src/app/doctor/ipd/page.tsx:78` initiateDischarge — no notification emit to discharge desk
7. `src/app/doctor/emergencies/page.tsx` EMERGENCY-flagged admission requests — no auto-escalation notification to floor / bed-manager
8. `src/app/doctor/consultation/page.tsx` page redirects to dashboard — no actual consultation workspace exists
9. `src/app/doctor/ai-assistant/page.tsx` not audited — likely stub surface
10. `src/app/doctor/online/page.tsx` not audited — online queue and join-session flow unverified
11. `src/app/doctor/registries/page.tsx` not audited — disease-registry CRUD unverified

### nurse (13)
1. `src/app/nurse/dashboard/page.tsx:259` "Arrived" doesn't auto-create MAR in pharmacy
2. `src/app/nurse/dashboard/page.tsx:496` Discharge button — no confirmation that discharge checklist is complete before routing
3. `src/app/nurse/medication/page.tsx` "Held" status doesn't require a "reason for hold" text field
4. `src/app/nurse/medication/page.tsx:232` "Request Procurement" doesn't validate patient arrived at ward
5. `src/app/nurse/vitals-requests/page.tsx` FirstVisitWizard launches — no callback confirming profile was saved
6. `src/app/nurse/rounds/page.tsx:185` Save round note — no notification to doctor that rounds complete
7. `src/app/nurse/rounds/page.tsx` Voice dictation appended raw — no sanitization / validation before chart write
8. `src/app/nurse/patients/page.tsx` not audited
9. `src/app/nurse/handover/page.tsx` not audited
10. `src/app/nurse/tasks/page.tsx` not audited
11. `src/app/nurse/fluid-balance/page.tsx` not audited
12. `src/app/nurse/orders/page.tsx` not audited
13. `src/app/nurse/messages/page.tsx` not audited

### pharmacy (9)
1. `src/app/pharmacy/queue/page.tsx:118` confirmCollect writes to discharge.setClearance ONLY for Discharge source — OPD/IPD don't update patient routing
2. `src/app/pharmacy/queue/page.tsx:148` "Mark ready" doesn't notify ward / IPD staff
3. `src/app/pharmacy/queue/page.tsx:157` Medicine substitution — no audit reason or approver captured
4. `src/app/pharmacy/queue/page.tsx:392` "Order from inventory" + "Advise outside" — no confirmation patient / doctor was notified
5. `src/app/pharmacy/dashboard/page.tsx` No "Reassign stuck/unclaimed" action
6. `src/app/pharmacy/inventory/page.tsx` not audited
7. `src/app/pharmacy/narcotics/page.tsx` not audited
8. `src/app/pharmacy/master/page.tsx` not audited
9. `src/app/pharmacy/messages/page.tsx` not audited

### lab (8)
1. `src/app/lab/inbox/page.tsx` "Collect" routes tests but doesn't validate specimens physically collected
2. `src/app/lab/inbox/page.tsx:86` Specimen rejection — no auto-recollect order or ordering-doctor notification
3. `src/app/lab/dashboard/page.tsx:120` "Log callback" recipient is free-text — no staff directory lookup
4. `src/app/lab/dashboard/page.tsx` TAT breach — no auto-escalation or stuck-test reassignment
5. `src/app/lab/benches/page.tsx` not audited
6. `src/app/lab/microbiology/page.tsx` not audited
7. `src/app/lab/qc/page.tsx` not audited
8. `src/app/lab/reflex/page.tsx` not audited

### radiology (10)
1. `src/app/radiology/dashboard/page.tsx:186` "Log callback" — free-text recipient, no directory validation
2. `src/app/radiology/dashboard/page.tsx` TAT breaches / overdue not auto-escalated or reassigned
3. `src/app/radiology/dashboard/page.tsx` Pipeline by modality — no drill-down to individual stuck studies
4. `src/app/radiology/inbox/page.tsx` not audited
5. `src/app/radiology/bench/page.tsx` not audited
6. `src/app/radiology/reading/page.tsx` not audited
7. `src/app/radiology/scans/page.tsx` not audited
8. `src/app/radiology/templates/page.tsx` not audited
9. `src/app/radiology/verification/page.tsx` not audited
10. `src/app/radiology/viewer/page.tsx` not audited

### emergency (7)
1. `src/app/emergency/triage/page.tsx:71` Vitals saved — NEWS2 high score doesn't auto-alert doctor
2. `src/app/emergency/triage/page.tsx:62` routeToArea — no confirmation treatment area staff received the notification
3. `src/app/emergency/triage/page.tsx:220` Vital sign inputs have no range validation (HR=-500 / SpO2=200 accepted)
4. `src/app/emergency/triage/page.tsx:97` Register arrival — no patient dedup / existing-record check
5. `src/app/emergency/triage/page.tsx:92` MCI MODE banner is static — no activate / deactivate / rule adjust
6. `src/app/emergency/dashboard/page.tsx` not audited
7. `src/app/emergency/floor/page.tsx` not audited

### reception (7)
1. `src/app/reception/queue/page.tsx:93` Kiosk Mode toggle — no fullscreen DOM / print-ready display layout
2. `src/app/reception/billing/page.tsx:92` "Print payment slip" toasts only — no PDF / print dialog
3. `src/app/reception/downloads/page.tsx:74` Print + Download — no actual file generation
4. `src/app/reception/setup/page.tsx` Form saves to LS only — no server sync / config persist beyond browser
5. `src/app/reception/appointments/page.tsx:144` "Join" video room — no session init
6. `src/app/reception/opd/page.tsx` Doctor assignment in walk-in — no on-shift / availability validation
7. `src/app/reception/ambulance/page.tsx:42` Dispatch — no fleet-coordinator notification

### admission (bed_manager, 5)
1. `src/app/admission/dashboard/page.tsx:126` assignBed toasts "Nursing notified" but doesn't emit useNotificationStore.add to nursing
2. `src/app/admission/dashboard/page.tsx:246` "Mark Arrived" no notification to doctor
3. `src/app/admission/beds/page.tsx:87` "Mark for Cleaning" no housekeeping cross-role notification
4. `src/app/admission/forecast/page.tsx` Analytics-only — no bed-master config / ward setup / capacity rule form
5. `src/app/admission/dashboard/page.tsx:270` AI Bed Recommendation banner + OnShiftTeam — no primary-nurse select-to-assign

### discharge (6)
1. `src/app/discharge/dashboard/page.tsx:144` setClearance — no notification to the cleared-by role
2. `src/app/discharge/dashboard/page.tsx:72` issueExitClearance — no housekeeping bed-cleaning trigger
3. `src/app/discharge/dashboard/page.tsx:74` Exit-clearance — no patient-portal event emit
4. `src/app/discharge/dashboard/page.tsx:66` Draft AI Summary uses hardcoded AI_SUMMARY_TEMPLATE — no AI call
5. `src/app/discharge/dashboard/page.tsx:180` resolveBlocker — no notification to blocker-owning role
6. `src/app/discharge/summary/[id]/page.tsx` no form fields to edit summary / follow-up / TTO meds — render-only

### ot (5)
1. `src/app/ot/schedule/page.tsx:51` scheduleProcedure — no anaesthetist notification
2. `src/app/ot/schedule/page.tsx` No room-availability check — allows double-booking (room + surgeon at same time)
3. `src/app/ot/dashboard/page.tsx:23` IPDBriefPanel addPreOpRequirement — input has no submit handler wired
4. `src/app/ot/checklist/page.tsx` Renders checklist UI — no surgeon / anaesthetist sign-off workflow
5. `src/app/ot/schedule/page.tsx` "Print OT list" — static schedule, no PDF export

### billing (7)
1. `src/app/billing/discounts/page.tsx:47` Approve / Reject — direct setState, no store mutation, no audit log
2. `src/app/billing/discounts/page.tsx` Discount granted — no patient / accounting notification
3. `src/app/billing/refunds/page.tsx:144` Refund reject — no patient notification
4. `src/app/billing/packages/page.tsx:41` "Apply to Bill" button has no onClick
5. `src/app/billing/packages/page.tsx:20` "+ New Package" button has no onClick
6. `src/app/billing/dashboard/page.tsx:53` freezeBill — no patient-portal "bill ready" notification
7. `src/app/billing/patient/[id]/page.tsx` No "Generate + email invoice" or "Request payment link" CTA

### insurance (5)
1. `src/app/insurance/preauth/page.tsx:22` generate — calls draftPreAuth, but that service returns stub / mock
2. `src/app/insurance/dashboard/page.tsx:51` mockVerify is hardcoded — no real insurance API / TPA gateway
3. `src/app/insurance/preauth/page.tsx` HitlReviewCard renders draft — no "Submit to Insurer" CTA
4. `src/app/insurance/claims/page.tsx` No form to file / initiate claims / track status changes
5. `src/app/insurance/documents/page.tsx` No document upload form / OCR / linking to admission/bill

### admin (25)
1. `src/app/admin/users/page.tsx` AddStaffWizard step-3 doesn't persist login ID; sendInvite checkbox shown but no email dispatch
2. `src/components/admin/AddStaffWizard.tsx:143` suggestLoginId — no backend createLoginAccount; auth setup skipped
3. `src/app/admin/payroll/page.tsx:172` "Export payslip" CSV works — no individual PDF; deduction rate hardcoded 8%
4. `src/app/admin/payroll/page.tsx:181` "Lock period" — Zustand setState only, no backend POST
5. `src/app/admin/vendors/page.tsx:113` "Approve invoice" + "Mark paid" — no payment gateway, NEFT ref is random string
6. `src/app/admin/vendors/page.tsx:150` "Download invoice PDF" button missing; MOU renewal alerts read-only
7. `src/app/admin/roster/page.tsx:123` "Update shift" wired — bulk pattern (template→10 staff) UI missing; swap approval not implemented
8. `src/app/admin/roster/page.tsx:270` Leave approve / reject modals shown — approveLeave / rejectLeave methods not called on click
9. `src/app/admin/coverage/page.tsx` Coverage gauge shown — "Request additional staff" not wired
10. `src/app/admin/on-call/page.tsx` On-call rotation page missing/stub — no escalation path to HOD
11. `src/app/admin/finance/page.tsx` P&L all KPIs read-only — no "Generate ledger" / "Export GL entries" / rate-card editing
12. `src/app/admin/compliance/page.tsx` NABH checklist — no "Upload document" flow; DPDP self-audit static; no compliance deadline tracker
13. `src/app/admin/statutory/page.tsx` Filing workflow missing — no EPF/ESI/PF renewal; no draft→submitted→filed state machine
14. `src/app/admin/credentials/page.tsx` Expiry shown — no "Renew credential" button; no staff notification; no renewal workflow
15. `src/app/admin/disputes/page.tsx` Dispute list shown — Resolve form has no submit; resolveDispute never called
16. `src/app/admin/hours/page.tsx` Page missing — no manual OT entry view/edit; no approval gate before payroll lock
17. `src/app/admin/operations/page.tsx:45` PredictiveOpsCockpit Action button only audit-logs — doesn't mutate staffing / OR reservation; dismiss not persisted across reload
18. `src/components/admin/RevenueCycleGrowthCockpit.tsx:147` Action only audit-logs — doesn't open denial-prevention workflow or dispatch task to billing
19. `src/components/admin/NabhEvidenceLiveCockpit.tsx` (Open-desk routes but "Attach evidence" file upload handler likely absent)
20. `src/components/admin/DpdpSelfAuditPanel.tsx` Form fields read-only; no "Submit attestation" flow
21. `src/app/admin/dashboard/page.tsx` Overview — no "Start period close" / "Trigger end-of-month" actions
22. `src/app/admin/staffing/page.tsx` "Bulk shift assignment" UI may exist without template application
23. `src/app/admin/ai-performance/page.tsx` "Retrain model" / "Adjust confidence threshold" buttons unclear / stubbed
24. `src/app/admin/doctor-activity/page.tsx` No "Flag underperforming OT usage" / "Trigger peer review" action
25. `src/app/admin/analytics/page.tsx` No "Export dashboard as PDF" / "Schedule report" CTA

### quality (7)
1. `src/app/quality/incidents/page.tsx:150` addIncident — no Quality-Head notification; no critical-severity escalation
2. `src/app/quality/incidents/page.tsx:231` Resolve — no CAPA template or follow-up task creation
3. `src/app/quality/dashboard/page.tsx` Missing / stub — no open-incident / critical / trend tiles
4. `src/app/quality/incidents/page.tsx:70` Form no permission gate; no "Under Review → Resolved" workflow
5. `src/app/quality/incidents/page.tsx` No linked-documents (photos, RCA) attachment upload
6. `src/app/quality/dashboard/page.tsx` No trend analysis / root-cause histogram / most-common-type chart
7. `src/app/quality/incidents/page.tsx:35` No audit log of who-submitted-what-when; submitter role not tagged for NABH

### housekeeping (5)
1. `src/app/housekeeping/dashboard/page.tsx:113` Assign-staff dropdown — no visual confirmation, no assignee notification
2. `src/app/housekeeping/dashboard/page.tsx:127` "Mark Done" — no photo upload required for cleaning proof
3. `src/app/housekeeping/dashboard/page.tsx:132` "Verify" — no handoff notification to ER / Admission
4. No "Reassign task" path if staff absent; no SLA timer (urgent > 2h unstarted)
5. No bulk "Mark all scheduled tasks as Pending for next shift"

### inventory (4)
1. `src/app/inventory/stock/page.tsx:176` "Reorder" — toast only, no requisition created, no vendor email
2. `src/app/inventory/stock/page.tsx:16` RepairModal handleSubmit toasts only — scheduleRepair / backend POST never called
3. `src/app/inventory/dashboard/page.tsx` Missing — no stock audit / reconciliation workflow
4. `src/app/inventory/stock/page.tsx` No upload for receiving delivery docs / "Confirm receipt" action

### blood_bank (5)
1. `src/app/bloodbank/inventory/page.tsx:25` "Add Unit" — no modal / form; addUnit() not callable from UI
2. `src/app/bloodbank/inventory/page.tsx` No "Reserve unit" / "Cross-match result" transition
3. `src/app/bloodbank/inventory/page.tsx` No "Expire unit" / "Discard expired" action; expiry warning has no path
4. `src/app/bloodbank/donors/page.tsx` Donor registration form / eligibility screening missing
5. `src/app/bloodbank/dashboard/page.tsx` No KPI for available units by blood group / low-stock alerts

### cssd (4)
1. `src/app/cssd/instruments/page.tsx` Instrument list read-only — no "Mark sterilized" / "Move to Quarantine"; status frozen at creation
2. `src/app/cssd/dashboard/page.tsx:50` Cycle list static — no "Start cycle" button; no cycle-detail page (temp / pressure readings)
3. `src/app/cssd/dashboard/page.tsx` No "Fail cycle" / "Retry"; failed cycles not linked to corrective action
4. `src/app/cssd/instruments/page.tsx` No "Schedule maintenance"; no expiry tracking (autoclave cert renewal)

### dietary (3)
1. `src/app/dietary/dashboard/page.tsx` Diet plans shown — no "Edit plan" / "Approve plan"; AI-generated plans no acceptance workflow
2. `src/app/dietary/dashboard/page.tsx` Meal orders shown — no "Mark delivered"; status stuck without override
3. `src/app/dietary/dashboard/page.tsx` No "Flag allergy conflict" / "Request substitution"; allergyFlags read-only

### bmw (3)
1. `src/app/bmw/dashboard/page.tsx:71` Waste log shown — no "Mark disposed" / "Confirm incineration"; logs frozen
2. `src/app/bmw/dashboard/page.tsx` No non-compliant reason capture
3. `src/app/bmw/dashboard/page.tsx` No incineration-certificate upload / proof of disposal

### mortuary (3)
1. `src/app/mortuary/records/page.tsx` Records read-only — no "Mark cleared" / "Release body"
2. `src/app/mortuary/records/page.tsx` No "Print death certificate"; no family/cremation handoff
3. `src/app/mortuary/records/page.tsx` MLC flag — no "Route to Police" workflow

### ambulance (4)
1. `src/app/ambulance/dispatch/page.tsx:12` dispatch() called — no map / route; no "Auto-assign nearest vehicle"
2. `src/app/ambulance/dispatch/page.tsx:14` Trip created — no driver / ER notification; no SOS / real-time tracking
3. `src/app/ambulance/dashboard/page.tsx` Fleet shown — no "Return from trip"; vehicle stuck on_trip with no completion
4. `src/app/ambulance/dashboard/page.tsx` fuelLevel shown — no "Log fuel top-up"

### audit_officer (4)
1. `src/app/audit/log/page.tsx` No "Export PDF report" / "Email audit report"
2. `src/app/audit/log/page.tsx` Entries expandable — payload view truncated, no full-entry JSON download
3. `src/app/audit/reports/page.tsx` Missing / stub — no NABH compliance / monthly summary export
4. `src/app/audit/dashboard/page.tsx` Missing — no critical-severity alerting; no retention metrics (logs > 7y archive)

### patient (27)
1. `src/app/patient/appointments/page.tsx` Cancel toasts only — no staff visibility mutation
2. `src/app/patient/appointments/page.tsx` Reschedule UI — no doctor notification
3. `src/app/patient/orders/page.tsx` Pay button toast only — no payment integration / order confirmation to lab + pharmacy
4. `src/app/patient/orders/page.tsx` Skip reason capture missing — doctor never notified of skipped critical items
5. `src/app/patient/consultations/page.tsx` Reschedule + Cancel — local state only, no staff notification
6. `src/app/patient/teleconsult/page.tsx` "Join now" sets phase only — no video SDK init
7. `src/app/patient/teleconsult/page.tsx` "End call" advances stage — no call recording / transcript stored
8. `src/app/patient/downloads/page.tsx` Download + Share toast only — no file gen / link creation
9. `src/app/patient/ambulance/page.tsx` "Request now" sets active flag only — no dispatcher notification / real dispatch
10. `src/app/patient/ambulance/page.tsx` Live tracking map is placeholder — no GPS / ETA
11. `src/app/patient/billing/page.tsx` Pay links to /patient/orders — no payment gateway
12. `src/app/patient/followup/page.tsx` Date picker UI — no doctor-calendar mutation / reminder
13. `src/app/patient/medications/page.tsx` Reorder toast only — no pharmacy order / inventory check
14. `src/app/patient/pharmacy/page.tsx` Likely no real-time pharmacy queue tracking
15. `src/app/patient/pathology/page.tsx` Test order list read-only — no repeat-test request
16. `src/app/patient/radiology/page.tsx` Radiology orders read-only — no reschedule
17. `src/app/patient/blood-bank/page.tsx` Donation / request UI mocked — no real inventory / scheduling
18. `src/app/patient/emergency/page.tsx` "Call 102" is tel: link only — no triage dispatch
19. `src/app/patient/ipd/page.tsx:154` Discharge clearance checklist read-only — no patient action
20. `src/app/patient/discharge/page.tsx` Summary read-only — no "request missing documents"
21. `src/app/patient/insurance/page.tsx` Claims read-only — no doc upload / appeal
22. `src/app/patient/health-story/page.tsx` BP trend chart static — no refresh / export
23. `src/app/patient/assistant/page.tsx` AI responses canned — no LLM / record inference
24. `src/app/patient/ai-care/page.tsx` "Reviewed by" links don't resolve to clinician notes
25. `src/app/patient/profile/page.tsx` Profile read-only once completed — no allergy / meds update
26. `src/app/patient/help/page.tsx` "Request ambulance" UI stub — not wired to dispatcher
27. `src/app/patient/queue/page.tsx` Live queue reads mock store — no real-time updates

---

## Cross-cutting gaps

### checkin (kiosk, 5)
1. `src/app/checkin/page.tsx` QR scan → /checkin/intake — no auth/session bridge; identity not verified post-scan
2. `src/app/checkin/intake/page.tsx` Form likely persists only to usePatientStore — no nursing / doctor handoff
3. `src/app/checkin/page.tsx` Kiosk complete — no notification to reception queue / doctor pre-brief
4. `src/app/checkin/page.tsx` "AI Triage Active" badge visual only — no triage scoring / high-priority routing
5. `src/app/checkin/page.tsx` No consent capture for DISHA / telehealth before check-in completes

### family-track (4)
1. `src/app/family-track/[token]/page.tsx` "Request Live Camera" updates local store — no nurse-side approval queue
2. `src/app/family-track/[token]/page.tsx` CameraFeedStub — no real video / room assignment
3. `src/app/family-track/[token]/page.tsx` Status updates never refresh — no subscription to live patient state
4. `src/app/patient/family-track/[token]/page.tsx` No UI for patient to revoke existing family invite tokens / generate new

### AppShell + nav (4)
1. `src/components/layout/AppShell.tsx:572` Bell icon shows count — no onClick to open notification panel
2. `src/components/layout/AppShell.tsx` Top search bar visible — no-op; CommandPalette is the only working search
3. `src/components/layout/AppShell.tsx` Settings icon links to /patient/profile — no dedicated settings surface (theme, prefs)
4. `src/components/layout/AppShell.tsx` Locale toggle changes state — i18n message file incomplete (en + hi but not all UI keys translated)

### CommandPalette (3)
1. `src/components/layout/CommandPalette.tsx:82` Intent stubs hardcoded — "schedule MRI for Anil" routes but doesn't pre-fill patient + test type
2. `src/components/layout/CommandPalette.tsx` Patient nav doesn't open record in context — only navigates to role-home
3. `src/components/layout/CommandPalette.tsx` Staff directory search role-gated to admin — doctor can't find nurse by name

### NotificationStore + dispatcher (7)
1. `src/store/useNotificationStore.ts` SEED hardcoded — useNotificationStore.add never called from patient actions (appts, orders, etc.)
2. `src/store/useNotificationStore.ts` Notification.dispatched populated — no service actually sends WhatsApp / SMS / push
3. `src/app/patient/orders/page.tsx:46` handlePay toast only — never calls useNotificationStore.add
4. `src/app/patient/appointments/page.tsx:129` Appt booking toast only — no reception / doctor queue notification
5. `src/app/patient/ambulance/page.tsx:76` Ambulance request — no dispatcher notification
6. `src/app/checkin/page.tsx` Kiosk completion — no reception / doctor pre-brief notification
7. `src/app/patient/teleconsult/page.tsx:52` Call ended — no doctor notification

### Messaging / chat (5)
1. `src/store/useMessagingStore.ts` Two-participant only — no group chats / multi-role escalation paths
2. `src/store/useMessagingStore.ts:94` receive() never called from any backend — messages are front-end only
3. `src/store/useMessagingStore.ts` markRead updates local readBy — no server sync for read receipts
4. Staff messaging in nav (doctor/nurse/pharmacy/reception/messages) — message persistence is LS only
5. No patient ↔ nurse chat surface — only staff-to-staff messaging wired

### WhatsApp outbound (3)
1. `src/store/useWhatsAppStore.ts` addMessage updates thread — no actual WhatsApp send
2. `src/store/useWhatsAppStore.ts` escalateToHuman changes status — no service pages a human agent
3. No WhatsApp button on patient dashboard / help linking to hospital WhatsApp

### Audit coverage (5)
1. `src/store/useAuditStore.ts` Audit API bridge is lazy/optional — useAuditStore.log writes to LS only
2. `src/store/useAuditStore.ts:356` API bridge lazy-imports; persistence not guaranteed
3. Patient actions (appt book, order pay, ambulance request, teleconsult join) NOT logged to audit
4. Family portal camera request state changes audit-logged — no retention past session end
5. `src/app/patient/profile/page.tsx:100` DISHA consent toggles update store — no audit emit

### Upload + download (4)
1. `src/app/patient/downloads/page.tsx:137` Download onClick toast only — no file generated, no API call
2. `src/app/patient/downloads/page.tsx:130` Share onClick toast only — no shareable URL created
3. No patient-profile file upload (passport, insurance policy, etc.)
4. `src/app/patient/insurance/page.tsx` No "Upload missing document" CTA — claim view read-only

### Settings / Setup (4)
1. `src/app/patient/profile/page.tsx` All fields read-only labels — no "Edit" mode
2. No dedicated patient settings page for WhatsApp / SMS / email notification channels
3. Locale toggle in AppShell — preference doesn't persist (resets on refresh)
4. Medications page mentions reminders — no settings UI to disable/customize timing

### I18n (4)
1. Many UI strings hardcoded outside `src/i18n/messages/en.json` + `hi.json` — e.g. "Tests & investigations" label in /patient/orders
2. `src/app/patient/help/page.tsx:10` Contact phone numbers + Directions hardcoded
3. `src/components/layout/AppShell.tsx` Nav section headers ("Care", "Consultations", etc.) hardcoded
4. DISHA/DPDP consent text English only — no Hindi translation

---

## Cross-role notification gaps (consolidated, 10)

These are integration breaks where one role mutates state but the next role downstream isn't told:

1. Admin user creation → new staff doesn't receive login credentials email
2. Roster leave approval → staff doesn't get status-change notification
3. Quality critical incident → Quality Head / Executive director not notified
4. Housekeeping bed verified → Admission desk not notified that bed is ready
5. Ambulance dispatch → driver + ER not notified of incoming patient
6. Inventory reorder → no email to vendor, no PO generated
7. CSSD cycle passed → ER / OT not notified instruments are ready
8. Payroll lock → Finance / HR not notified period complete
9. HR credential expiry → staff / HR not notified before expiry
10. DISHA breach logged → DPO + compliance team not auto-escalated within SLA
