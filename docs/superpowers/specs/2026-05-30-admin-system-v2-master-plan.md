# Admin System v2 — Master Execution Plan

> **Goal:** Turn the admin role from a collection of dashboards into the **operational nerve centre** of the hospital — the single place from which a COO/CMO/CHRO can see, decide, and act across People · Money · Operations · Compliance · Quality · Risk · Strategy.

**Date:** 2026-05-30
**Role:** `admin` (Rajesh Kulkarni · ADM-01)
**Audit baseline:** 11 pages exist today; only 6 are live, 3 are placeholders, 5 sources-of-truth for staff that don't agree.

---

## 1. Vision

A hospital admin lives 8 hours/day in this panel. After every milestone they should be able to:
- See **one number** for each life-or-death thing (occupancy, on-shift, cash, critical events)
- Drill into **one ranked list** that's actionable (who to call, what to approve, where to send people)
- **Act** without leaving the panel (approve leave, broadcast, assign duty, reallocate beds)
- **Trace** every decision in the audit trail for NABH/board review

If a milestone doesn't deliver one of those four, it's the wrong milestone.

---

## 2. Architectural Decisions

### 2.1 Single source of truth for humans
`useHRStore` becomes the canonical staff directory. Every other store that names people (`useMessagingStore.DIRECTORY`, `useDoctorStatsStore.STAT_DOCTORS`, `useERStore` roster constants, login role cards, etc.) reads from it via selectors. Mutation only happens through HR store actions.

### 2.2 Audit everything
Every admin write fires `useAuditStore.log({...})` with a new `HR` module and new action codes. Admin reads — including drill-into-detail — do NOT log (avoid noise), but every mutation does.

### 2.3 RBAC as data, not code
Permissions live in a table (`PERMISSIONS_MATRIX`) keyed `role × action`. UI reads `canDo(role, action)` instead of hardcoding role checks.

### 2.4 Branch-aware from day one
Even before multi-branch is built, every new HR/Finance/Compliance record carries a `branchId` field. Single-branch deployments default to `BRANCH_MAIN`.

### 2.5 Optimistic UI with confirm
Admin mutations apply immediately + toast undo-window (5s). Destructive ops (terminate staff, force-discharge) confirm modal first.

### 2.6 Drill-down loop
Every KPI card in the admin dashboard is clickable → routes to the ranked list that produced it → row click → entity detail. No dead-end numbers.

---

## 3. Phased Execution

12 phases. Phases 0–4 are **mandatory foundation** (without them every other phase is built on sand). Phases 5–12 are independent and can ship in any order based on priority.

### Phase 0 — Foundation (M0.1 – M0.3) `BLOCKER for everything else`

#### M0.1 — Unified HR Store
**Files**: rewrite [src/store/useHRStore.ts](src/store/useHRStore.ts) (~600 LOC)

Replace the current 115 LOC stub with the canonical model:
```ts
export interface StaffMember {
  id: string                    // login ID
  employeeId: string             // HR ID
  name: string
  email: string
  phone: string
  role: Role                     // matches Role union from useAuthStore
  department: string
  designation: string            // 'Consultant', 'Senior Resident', 'Staff Nurse', etc.
  branchId: BranchId
  joiningDate: string
  contractType: 'permanent' | 'visiting' | 'locum' | 'intern' | 'contract'
  status: 'active' | 'on_leave' | 'suspended' | 'terminated' | 'inactive'
  reportsTo?: string             // staffId
  credentials: Credential[]      // licenses, certifications with expiry
  lastLoginAt?: string
  notes?: string
}

export interface Credential {
  id: string
  type: 'MCI' | 'BLS' | 'ACLS' | 'PALS' | 'Nursing Council' | 'Pharmacist' | 'X-Ray' | 'Board Cert' | 'Custom'
  label: string
  number: string
  issuedDate: string
  expiryDate: string
  attachmentUrl?: string         // stub
}

export interface ShiftEntry { ... }            // already exists
export interface LeaveRequest { ... }          // already exists, expand
export interface DutyAssignment { ... }        // promote from local state in /admin/duty
export interface SwapRequest { ... }           // NEW
export interface SickCall { ... }              // NEW
export interface OvertimeEntry { ... }         // NEW
```

Actions: `addStaff / updateStaff / deactivateStaff / reactivateStaff / setShift / bulkSetShifts / applyShiftPattern / requestLeave / approveLeave / rejectLeave / assignDuty / clearDuty / requestSwap / approveSwap / markSickCall / findReplacements / logOvertime`.

Every action emits to `useAuditStore` with the new `HR` action codes (M0.2).

**Persistence**: `persist(...)` with `skipHydration` (follow the SSR-safe pattern already used by `useDoctorProfileStore`).

#### M0.2 — HR Audit Module
**Files**: extend [src/store/useAuditStore.ts](src/store/useAuditStore.ts) + [src/lib/nabhEvidence.ts](src/lib/nabhEvidence.ts) + [src/app/audit/log/page.tsx](src/app/audit/log/page.tsx)

New action codes:
```ts
'hr_staff_created' | 'hr_staff_updated' | 'hr_staff_role_changed'
'hr_staff_deactivated' | 'hr_staff_reactivated' | 'hr_staff_terminated'
'hr_credential_added' | 'hr_credential_expired'
'hr_shift_set' | 'hr_shift_pattern_applied' | 'hr_shift_bulk_update'
'hr_duty_assigned' | 'hr_duty_cleared'
'hr_leave_requested' | 'hr_leave_approved' | 'hr_leave_rejected'
'hr_swap_requested' | 'hr_swap_approved' | 'hr_swap_rejected'
'hr_sick_call' | 'hr_replacement_assigned'
'hr_overtime_logged'
```

Map all to `HR` module. Severity: `hr_staff_terminated` + `hr_credential_expired` + `hr_sick_call` = `warning`; rest = `info`.

NABH chapter mapping:
- **HRM** chapter (NEW) — all `hr_*` codes
- Cross-reference into IMS for credential trail

#### M0.3 — RBAC as Data
**Files**: NEW [src/lib/permissions.ts](src/lib/permissions.ts)

```ts
export const ACTIONS = [
  'hr.staff.read', 'hr.staff.write', 'hr.staff.terminate',
  'hr.shift.read', 'hr.shift.write', 'hr.shift.bulk',
  'finance.read', 'finance.write', 'finance.export',
  'compliance.read', 'compliance.attest',
  'broadcast.send', 'branch.switch',
] as const

export const PERMISSIONS_MATRIX: Record<Role, ReadonlySet<Action>> = {
  admin: new Set(ACTIONS),
  doctor: new Set(['hr.staff.read', 'hr.shift.read']),
  // ...
}

export function canDo(role: Role, action: Action): boolean { ... }
```

Every admin action checks `canDo`. Future-proofs for sub-admins (e.g., HR Manager who can't see Finance).

**Verification**: existing role flows still pass; admin-only mutations surface a 403-style toast for non-admins.

---

### Phase 1 — Staff Lifecycle Management

#### M1.1 — Staff Directory Rebuild
**File**: rewrite [src/app/admin/users/page.tsx](src/app/admin/users/page.tsx) (current 94 LOC mock → ~350 LOC real)

- Reads `useHRStore.staff` (canonical, not hardcoded array)
- Columns: Avatar · Name · Role · Dept · Designation · Status badge · Last login · Credentials health · Actions
- Tabs: All · Active · On Leave · Inactive · Pending onboarding
- Search across name/id/email/dept
- Filter chips: role, department, contract type, branch
- Bulk action bar (appears when rows selected): Send broadcast, Deactivate, Force password reset, Export CSV
- Each row → drawer with full profile (M1.4)

#### M1.2 — Add Staff Wizard
**Files**: NEW [src/components/admin/AddStaffWizard.tsx](src/components/admin/AddStaffWizard.tsx)

3-step modal:
1. **Identity** — name, email, phone, employee ID (auto), role, dept, branch
2. **Role-specific fields** — dynamic per role:
   - Doctor: MCI registration, speciality, OPD/online fees, consultation hours
   - Nurse: nursing council reg, BLS/ACLS expiry, primary ward
   - Lab Tech: bench specializations, accreditation
   - Radiologist: X-ray badge, modality competence
   - Pharmacist: pharmacist license
   - Reception/Bed Manager/etc: shift preference
3. **Access** — login ID auto-generated, send invite checkbox, role permissions preview

Audit-emit `hr_staff_created` on submit.

#### M1.3 — Edit/Deactivate/Terminate
**Files**: NEW [src/components/admin/StaffProfileDrawer.tsx](src/components/admin/StaffProfileDrawer.tsx) (~400 LOC)

Right-sliding drawer (60% width):
- Header: avatar + name + status badge + role/dept + employee ID
- Tabs: **Profile · Schedule · Credentials · Activity · Audit**
- Profile tab: edit form mirroring wizard fields
- Schedule tab: next 4 weeks of shifts + leave + duty (read-only here, deep-link to Roster)
- Credentials tab: list with expiry status, "Renew" action
- Activity tab: last 30 days of stats (consultations / patients seen / etc.) for clinical staff; login frequency for support staff
- Audit tab: filtered audit log for this staffId

Footer actions: **Deactivate** (revoke login, keep records) · **Terminate** (status=terminated, drop from active rosters, prompt for handover notes). Both confirm with reason capture.

#### M1.4 — Credentials & License Expiry
**Files**: NEW [src/app/admin/credentials/page.tsx](src/app/admin/credentials/page.tsx) (~250 LOC) + cron-style daily check

- Dashboard card: 4 KPIs — Expired / Expiring this week / Expiring this month / Valid
- Table grouped by urgency: red (expired), amber (≤30d), yellow (≤90d), green (>90d)
- Each row: staff name + role + credential type + number + expiry date + days remaining + renew action
- "Auto-renew reminder" toggle per credential (sends 90/60/30/14/0 day notifications to staff + admin)
- Audit-emit `hr_credential_expired` when a credential rolls past its expiry date
- Cross-link from Staff Management's "Credentials health" column

#### M1.5 — Cross-Store Identity Sync
**Files**: refactor [src/store/useMessagingStore.ts](src/store/useMessagingStore.ts) DIRECTORY · [src/store/useDoctorStatsStore.ts](src/store/useDoctorStatsStore.ts) STAT_DOCTORS · [src/store/useERStore.ts](src/store/useERStore.ts) roster constants · `app/page.tsx` login cards

Each becomes a derived selector from `useHRStore`:
```ts
export const useDirectory = () => useHRStore(s => s.staff.filter(x => x.status === 'active').map(toStaffContact))
export const useStatDoctors = () => useHRStore(s => s.staff.filter(x => x.role === 'doctor' && x.status === 'active').map(toDoctorRef))
```

Login role cards remain demo-fixed (per-role demo identity) but read default identity from HR.

---

### Phase 2 — Shift Management v2

#### M2.1 — Roster Grid 2.0
**Files**: rewrite [src/app/admin/roster/page.tsx](src/app/admin/roster/page.tsx) (225 → ~500 LOC)

- 4-week view (vs current 7-day) with collapse-to-week mode
- Drag-fill (Excel-style — click cell, drag to fill range with same shift)
- Shift-click to select range, then apply pattern
- Right-click on cell → context menu (Set Morning / Evening / Night / Off / Apply pattern / Clear)
- Sticky staff column with department grouping (collapsible per dept)
- Conflict markers: leave-during-shift, double-shift (working >2 consecutive shifts), <12h gap between shifts
- Coverage strip at top showing per-shift headcount vs minimum (M3.1)
- Audit-emit `hr_shift_set` + `hr_shift_bulk_update`

#### M2.2 — Shift Templates
**Files**: NEW [src/components/admin/ShiftTemplateModal.tsx](src/components/admin/ShiftTemplateModal.tsx)

Pre-built patterns:
- 5-on/2-off Morning
- 4-on/4-off rotating
- Day/Night alternating
- Custom 7-day pattern builder

Pattern application: select staff (multi) + date range + template → preview → confirm → audit-emit `hr_shift_pattern_applied`.

Store templates in `useHRStore.shiftTemplates` so they're reusable + named.

#### M2.3 — Duty Assignment Persistent
**Files**: rewrite [src/app/admin/duty/page.tsx](src/app/admin/duty/page.tsx) (413 LOC, drop local state)

- Replace `useState<DutyAssignment[]>` with `useHRStore.dutyAssignments`
- Cross-validate: an assignment requires the staff to be ON SHIFT that date+time
- "Suggested duty" panel powered by an `assignDutyAI()` selector that pairs staff to wards by:
  - Department match (cardiac nurse → cardiac ward)
  - Skill match (ICU-trained nurses to ICU)
  - Workload balance (avoid same person on ICU two days running)
- One-click "Roll yesterday's duty to today" with diff preview
- Audit-emit `hr_duty_assigned` / `hr_duty_cleared`

#### M2.4 — Conflict Detection Engine
**File**: NEW [src/lib/shiftConflicts.ts](src/lib/shiftConflicts.ts) (~150 LOC)

Pure functions:
- `detectDoubleBooked(shifts)` — same staffId on overlapping shifts
- `detectLeaveDuringShift(shifts, leaves)`
- `detectBackToBackNights(shifts)` — flags wellbeing concern
- `detectInsufficientRest(shifts)` — gap <11h between shifts
- `detectOvertime(shifts, weekHours)` — flag staff >48h/week

Returns `Conflict[]` with severity + suggested resolution. Surfaced in Roster grid (cell badge) + dedicated `/admin/conflicts` page (M2 wrap-up).

#### M2.5 — Hours Worked & Overtime Tracker
**File**: NEW [src/app/admin/hours/page.tsx](src/app/admin/hours/page.tsx)

- Per-staff table: scheduled hours / worked hours / OT hours / days off taken / leave balance
- Filter by period (week/month/quarter) + dept
- "Bulk pay-period close" → snapshot hours into `useHRStore.payrollPeriods` for M5.4 payroll preview
- Audit-emit `hr_overtime_logged`

#### M2.6 — On-Call Rotation
**File**: NEW [src/app/admin/on-call/page.tsx](src/app/admin/on-call/page.tsx)

- Per-dept on-call rotation builder (weekly/fortnightly cycle)
- "Who's on-call now" widget for the COO dashboard
- Cross-wires to ER/ICU/OT escalation: when a critical event fires + the assigned consultant is off-shift, the on-call doctor gets paged
- Audit-emit on rotation set + on-call page-out

---

### Phase 3 — Coverage & Exceptions

#### M3.1 — Configurable Department Minimums
**Files**: NEW [src/app/admin/coverage/page.tsx](src/app/admin/coverage/page.tsx) + extend `useHRStore`

Editable matrix: department × shift → min headcount, ideal headcount, required roles. Currently hardcoded in `/admin/staffing` as `DEPT_REQUIREMENTS` — move to store + UI.

#### M3.2 — Real-Time Coverage Gauge
**Component**: NEW [src/components/admin/CoverageGauge.tsx](src/components/admin/CoverageGauge.tsx)

Per-ward per-shift ring chart: red (<min) / amber (min..<ideal) / green (≥ideal). Embedded in:
- COO dashboard (top strip)
- Nurse dashboard (ward-specific)
- Bed manager (for admission decisions)

Recomputes whenever duty/shift/leave changes.

#### M3.3 — Sick-Call Workflow
**Component**: NEW [src/components/admin/SickCallModal.tsx](src/components/admin/SickCallModal.tsx)

Triggered by: staff (self-service from their portal) OR admin (mark-unavailable button).

Steps:
1. Capture sick-call (date, expected return, reason)
2. Auto-find replacement candidates: off-shift staff with matching skills + dept
3. Rank by: same dept (3pts), skill-overlap (2pts), recent OT below limit (1pt), no leave conflict (required)
4. One-click "Page top 3" → notification to candidates with accept/decline
5. First accept locks the duty slot, others auto-decline
6. Audit-emit `hr_sick_call` + `hr_replacement_assigned`

#### M3.4 — Swap Request
**Component**: NEW [src/components/admin/SwapRequestModal.tsx](src/components/admin/SwapRequestModal.tsx)

Peer-to-peer flow:
1. Staff A picks own shift to swap + selects Staff B
2. Notification to Staff B with accept/decline
3. On accept, admin receives approval queue item
4. Admin approves → both rosters update, audit-emit `hr_swap_approved`
5. Conflict checker re-runs to ensure swap doesn't break other rules

#### M3.5 — Critical Understaffing Auto-Escalation
**File**: extend `useHRStore` with `coverageWatcher()` interval

When coverage drops below min for any critical ward (ICU/ER/OT/Maternity):
- Push critical notification to bed_manager + on-call admin
- Audit-emit `coverage_critical_breach` (NEW action code in `useAuditStore`)
- Auto-trigger sick-call replacement search (M3.3)

---

### Phase 4 — Clinical Integration

#### M4.1 — Doctor Shift Gate
**File**: extend [src/app/doctor/dashboard/page.tsx](src/app/doctor/dashboard/page.tsx)

When logged-in doctor's `useHRStore` schedule says they're off-shift:
- Soft banner: "You're scheduled off-shift right now"
- Patient open guarded by confirm (similar pattern to the on-leave guard we already added)
- Tooltip on "Start consultation" explaining

If on leave: full block (existing implementation in Phase 5/M2 work).

#### M4.2 — Nurse Ward-Roster View
**File**: NEW [src/app/nurse/team/page.tsx](src/app/nurse/team/page.tsx)

For the nurse who's logged in:
- "Who's on shift with me right now" panel
- Their reporting line + on-call physician
- Quick-message any team member (uses `useMessagingStore`)

#### M4.3 — Bed Manager Team Picker
**File**: extend [src/app/admission/dashboard/page.tsx](src/app/admission/dashboard/page.tsx)

When assigning a bed in ICU/CCU, the picker shows which nurses + doctors are currently on shift for that ward → admit decision factors team availability.

#### M4.4 — ER On-Call Auto-Populate
**File**: extend [src/store/useERStore.ts](src/store/useERStore.ts)

The roster constants (`ER_VIKRAM`, `ER_NEHA`, `ER_TRIAGE_NURSE`) become derived selectors from `useHRStore` filtered by current shift + ER department.

#### M4.5 — OT Team Builder
**File**: extend [src/store/useOTStore.ts](src/store/useOTStore.ts)

When scheduling a procedure, the surgeon/anaesthetist/scrub nurse pickers populate from `useHRStore` staff matching the role + on-shift + not-in-other-OT.

---

### Phase 5 — Financial Command

#### M5.1 — Hospital P&L Dashboard
**File**: NEW [src/app/admin/finance/page.tsx](src/app/admin/finance/page.tsx)

Top strip: Revenue (Month) · Expenses (Month) · Net · Cash Position · A/R · A/P

Per-dept revenue table from `useBillingStore`:
- OPD vs IPD vs OT vs Pharmacy mix
- Payer split (cash / cashless / govt scheme)
- Margin per dept (revenue − attributable costs)

Expenses breakdown (HR salary cost from M2.5 hours × rates, plus vendor payments from M5.5).

#### M5.2 — Revenue Reconciliation
**File**: extend `useBillingStore` with `reconciliation()` selector

Daily reconciliation view:
- Bills posted today
- Collections received today
- Variance flags (paid > billed = refund due; billed > paid = collection followup)
- Insurance claim aging (0-30 / 31-60 / 61-90 / 90+)

#### M5.3 — Billing Dispute Queue
**File**: NEW [src/app/admin/disputes/page.tsx](src/app/admin/disputes/page.tsx)

Bills with `status: 'dispute'` from billing store + AI duplicate flags (already built) + manual escalations. Each row: bill ID, patient, amount in dispute, opened by, days open, action.

#### M5.4 — Payroll Preview
**File**: NEW [src/app/admin/payroll/page.tsx](src/app/admin/payroll/page.tsx)

Pulls from `useHRStore.payrollPeriods` (M2.5) + staff `monthlyRate`:
- Period selector (last closed / current open)
- Per-staff: base pay, hours worked, OT hours, OT pay, deductions, gross, net
- Department subtotals + grand total
- "Lock period & export" → CSV download + audit-emit `payroll_locked`

#### M5.5 — Vendor Payments
**Files**: NEW [src/store/useVendorStore.ts](src/store/useVendorStore.ts) + [src/app/admin/vendors/page.tsx](src/app/admin/vendors/page.tsx)

Vendor master (BMW vendor, gas supplier, equipment AMC, food vendor, security agency, IT) with:
- Contract value + MoU expiry
- Last 3 payments
- Open invoices
- "Approve payment" → audit-emit + sets due date

#### M5.6 — Cash Position
**Widget** on COO dashboard

Real-time: cash collected today / week / month · A/R · upcoming payroll · upcoming vendor due. One liability indicator (cash runway in days).

---

### Phase 6 — Compliance Command Centre

#### M6.1 — NABH Audit Prep Cockpit
**File**: extend [src/app/quality/nabh/page.tsx](src/app/quality/nabh/page.tsx) — surface in admin sidebar as "NABH"

Adds admin-only:
- Per-chapter evidence sufficiency (already have evidence; add gap analysis vs NABH standard counts)
- Document upload stubs for SOPs/policies per chapter
- Audit-due date tracker
- Inspector-ready PDF export (extend the Print already wired on `/audit/reports`)

#### M6.2 — DISHA Data Audit Log
**File**: NEW [src/app/admin/disha/page.tsx](src/app/admin/disha/page.tsx)

DPDP/DISHA compliance:
- Patient data access log (who viewed which patient record when)
- Consent management dashboard
- Data deletion request queue (RTBE — Right To Be Forgotten)
- Cross-border data flow log
- Breach notification template

Wire by extending `useAuditStore` to log `patient_record_viewed` action when patient detail drawers open.

#### M6.3 — BMW/CPCB Readiness
Link to existing `/bmw/reports`; admin gets a single status pill: green/amber/red based on month's compliance score.

#### M6.4 — Statutory Calendar
**File**: NEW [src/app/admin/statutory/page.tsx](src/app/admin/statutory/page.tsx)

12-month rolling calendar of:
- PF returns (monthly, by 15th)
- ESI returns (monthly, by 15th)
- GST returns (monthly GSTR-1 by 11th, GSTR-3B by 20th)
- Professional tax (monthly/quarterly per state)
- TDS (monthly by 7th)
- Income tax advance (quarterly)
- Trade license renewal
- Pollution clearance renewal
- Drug license renewal
- AERB licence renewal (for radiology)
- Boiler/lift inspection

Each entry has status: upcoming/due/filed/late. Admin can attach acknowledgement number.

#### M6.5 — Vendor MoU Expiry
Bubble-up from M5.5 — single panel for any MoU expiring in <60 days.

---

### Phase 7 — Capacity & Asset Planning

#### M7.1 — Bed Forecast (already exists, extend)
[src/app/admission/forecast/page.tsx](src/app/admission/forecast/page.tsx) — surface read-only view in admin with cross-branch (M11 dependency, prep now).

#### M7.2 — OT Utilization Heatmap
**File**: NEW [src/app/admin/ot-utilization/page.tsx](src/app/admin/ot-utilization/page.tsx)

Per-OT per-day per-shift heatmap from `useOTStore` history:
- Idle time / running time / turnaround time
- First-case-delay metric
- Surgeon utilization

#### M7.3 — Equipment & Asset Register
**Files**: NEW [src/store/useAssetStore.ts](src/store/useAssetStore.ts) + [src/app/admin/assets/page.tsx](src/app/admin/assets/page.tsx)

Critical equipment master:
- Ventilators, monitors, defibrillators, X-ray machines, CT, MRI, USG, dialysis, autoclaves
- Per asset: serial number, vendor, install date, warranty expiry, AMC expiry, last service, next service due, current status (in-use/idle/maintenance/down)
- Maintenance schedule with reminders
- Downtime log

#### M7.4 — Inventory Reorder Admin View
Single page read-only view of any inventory store's reorder-point flags across pharmacy/CSSD/general inventory.

---

### Phase 8 — Quality & Clinical Outcomes

#### M8.1 — Mortality Dashboard
**File**: NEW [src/app/admin/mortality/page.tsx](src/app/admin/mortality/page.tsx)

Pulls from `useInpatientStore` (status=deceased) + `useMortuaryStore`:
- Total deaths this month, YTD
- By cause, by dept, by age band
- Mortality review queue (each death tagged "reviewed/pending/under-review")
- Maternal & infant mortality separate (audited carefully)
- Audit-emit `mortality_reviewed`

#### M8.2 — Length-of-Stay Benchmarks
Per-dept LOS distribution + outliers (e.g., LOS > 2σ from mean for diagnosis).

#### M8.3 — Readmission Rate
30-day readmission rate per dept + per diagnosis. Cross-link to discharge summary review.

#### M8.4 — Infection Rates
Surgical Site Infection (SSI), Catheter-Associated UTI (CAUTI), CLABSI, VAP — links to existing `useQualityStore.nabh` metrics.

#### M8.5 — Patient Satisfaction NPS Trend
Extend NABH cockpit's NPS into admin → trend by dept/branch.

---

### Phase 9 — Risk & Incident Command

#### M9.1 — Hospital-Wide MCI/Disaster Mode
**Files**: extend [src/store/useERStore.ts](src/store/useERStore.ts) MCI flag → hospital-wide; NEW [src/app/admin/incident-command/page.tsx](src/app/admin/incident-command/page.tsx)

When MCI declared:
- All wards get a banner
- Elective surgeries pause-confirm prompt
- Discharge planning accelerates
- Surge capacity unlocks (hallway beds, postop bay overflow)
- Audit-emit `mci_hospital_wide`

#### M9.2 — Outbreak Response
COVID/HMPV/dengue-style outbreak panel:
- Isolation bed availability
- Required PPE stock
- Suspect/probable/confirmed case counts
- Contact tracing log

#### M9.3 — System Status
Real-time view of which modules + integrations are online:
- HMS modules (each store has a health-check)
- WhatsApp Business API status
- SMS gateway
- Payment gateway
- Insurance TPA APIs
- HL7/FHIR integrations
- Backup last successful

Single green/amber/red pill in admin header.

#### M9.4 — Cyber Incident Response Runbook
Static checklist + status tracking when triggered:
- Disconnect affected systems
- Notify CERT-In within 6 hours (mandatory)
- Notify CISO + DPO
- Forensic image capture
- Patient data exposure assessment

#### M9.5 — Backup Status Indicator
Last backup time/size/integrity check displayed in header.

---

### Phase 10 — Communication & Policy

#### M10.1 — Broadcast Composer
**Files**: NEW [src/store/useBroadcastStore.ts](src/store/useBroadcastStore.ts) + [src/app/admin/broadcast/page.tsx](src/app/admin/broadcast/page.tsx)

Send announcement to selected roles/depts/branches with channel selection (in-app/push/SMS/email). Schedule send. Track delivery + acknowledgement. Audit-emit `broadcast_sent`.

#### M10.2 — Policy Library
SOPs, clinical pathways, HR policies. Version controlled. Each role gets a "Policies updated since you last read" reminder.

#### M10.3 — Internal Announcement Board
Pin notices that show in every staff member's notification panel.

#### M10.4 — Acknowledgement Tracking
For mandatory-read policies (fire drill SOP, infection control), track per-staff acknowledgement with timestamps.

---

### Phase 11 — Multi-Branch Network

#### M11.1 — Branch Selector
Top header dropdown: "All branches / MG Road / Whitefield / Indiranagar". When set to single branch, all data scopes; "All branches" shows network-wide rollup.

#### M11.2 — BranchId on Every Record
Schema migration: every store record gets `branchId`. Existing records default to `BRANCH_MAIN`.

#### M11.3 — Network KPI Rollup
COO dashboard becomes branch-aware. Comparative dept performance across branches.

#### M11.4 — Inter-Branch Transfer
Patient transfer between branches with handover packet. Audit-emit `branch_transfer`.

#### M11.5 — Resource Sharing
Cross-branch view of blood inventory, ICU beds, OT slots, specialist availability. "Request unit from branch X" workflow.

---

### Phase 12 — Strategic Analytics

#### M12.1 — Cohort Analysis
Patient segment views: diabetic cohort, cardiac cohort, oncology cohort. Lifetime value, retention, follow-up compliance.

#### M12.2 — Forecasting
14-day demand forecast for OPD, IPD, OT slots based on seasonality + trend.

#### M12.3 — What-If Modeling
Sliders: "If I add 2 cardiologists / open 10 more beds / extend pharmacy hours" → estimated impact on wait time, occupancy, revenue.

#### M12.4 — Benchmarking
Compare against industry benchmarks (NABH published medians, ICRA reports) for LOS, occupancy, cost-per-bed-day.

---

## 4. Sequencing

```
Phase 0 ──┬── Phase 1 ──┬── Phase 2 ──┬── Phase 3 ── Phase 4
          │             │             │
          │             │             └── (M2.5 hours feeds M5.4 payroll)
          │             └── (M1.4 credentials feeds M6 compliance)
          └─── enables ALL downstream work

Phase 5 (Finance)     ──────────┐
Phase 6 (Compliance)  ──────────┤  ← any order after Phase 4
Phase 7 (Capacity)    ──────────┤
Phase 8 (Quality)     ──────────┤
Phase 9 (Risk)        ──────────┤
Phase 10 (Comms)      ──────────┤
Phase 11 (Branch)     ──────────┘  ← touches every store; do last
Phase 12 (Strategic) requires Phase 11 data
```

**Hard blockers:**
- Nothing happens without Phase 0 (unified store + audit + RBAC)
- Phase 4 (clinical integration) requires Phase 2 (real shifts to enforce)
- Phase 11 (multi-branch) is a schema migration; defer until needed

**Soft suggestions:**
- Phases 0–4 = "Staff Mgmt v2" — ship as one focused release
- Phases 5–6 = "Finance + Compliance v1" — second focused release
- Phases 7–10 = "Capacity + Quality + Comms" — third release
- Phase 11–12 = "Network mode + Strategy" — final release

---

## 5. Cross-Cutting Concerns

### 5.1 Audit
Every mutation in every phase emits to `useAuditStore`. New HR + Finance + Compliance + Comms action codes added incrementally to keep the audit module list current.

### 5.2 NABH Evidence
New chapter **HRM** (Human Resource Management) added to `src/lib/nabhEvidence.ts`. Finance ties to **AAC** (admin/access). Asset register feeds **HIC** (equipment for infection control).

### 5.3 Persistence
- HR store persisted (long-lived state)
- Finance read-through (reads other stores; no own persistence beyond payrollPeriods snapshot)
- Compliance attestations persisted
- Broadcast history persisted
- Asset register persisted

### 5.4 Responsive
Every new admin page must work at:
- Desktop (1500w) — full layout
- Tablet (820w) — collapsible side panels
- Phone (390w) — single column, drawer nav

(Following the M18 pattern we already established.)

### 5.5 Verification per milestone
- Typecheck clean
- Puppeteer assertion (page renders + key action fires audit)
- 0 console errors
- Screenshot saved for visual review

### 5.6 Performance budget
- Admin pages aggregating from 9+ stores need memoization; use `useMemo` with proper deps
- Coverage gauges recompute on shift/leave change only (use `useShallow` selectors)
- Large lists (staff > 200, audit > 1000) use virtualization

---

## 6. Definition of Done per Phase

A phase is done when:
1. All milestones in the phase typecheck + render without console errors
2. All new actions fire audit events visible in the audit trail
3. The new pages appear in admin sidebar nav
4. Puppeteer regression sweep passes
5. Cross-store sync verified (e.g., editing a name in HR updates messaging directory + login card)
6. Mobile + tablet responsive verified
7. Help text / inline guidance added for any new workflow

---

## 7. Risks & Mitigations

| Risk | Mitigation |
|---|---|
| HR store schema migration breaks existing pages | Phase 0 strict typing + run full Puppeteer suite before/after |
| Cross-store identity sync causes hydration drift | Use selectors + ClientOnly pattern (already proven) |
| Persistence overflow on localStorage | HR store splits by concern; old records archived after 90 days |
| Auth role confusion (admin vs HR manager vs CFO) | Phase 0 RBAC matrix solves this from start |
| Finance figures look "real" but are demo | Mark all financial widgets with "DEMO DATA" pill until wired to real ERP |
| Broadcast spam / mis-fire | Throttle + confirm modal + audit + recall window |

---

## 8. Out of Scope (Explicit)

- **Real payroll engine** — preview only; integration with Tally/Zoho Payroll/SAP is a follow-up
- **Real GST/PF/ESI filing** — calendar + reminders, not filing automation
- **Asset depreciation accounting** — register only, not depreciation calc
- **Real cyber forensic tools** — runbook + status, not actual incident response automation
- **Insurance pre-auth APIs** — already exist as stubs in insurance module, admin just monitors

---

## 9. Phase 0 — Detailed Implementation Plan

(Each subsequent phase will get its own detail doc when scheduled; below is the kickoff plan for Phase 0 since it blocks everything.)

### M0.1 — Unified HR Store (~600 LOC)

**Steps:**
1. Define new types (`StaffMember`, `Credential`, `DutyAssignment`, `SwapRequest`, `SickCall`, `OvertimeEntry`, `ShiftTemplate`, `PayrollPeriod`)
2. Seed canonical staff list — merge all 5 current sources into one
3. Write actions with audit hooks
4. Persist with `skipHydration`
5. Add `<StoreHydrator>` integration

**Verification:** typecheck + existing role flows still work (regression Puppeteer pass)

### M0.2 — HR Audit Module

**Steps:**
1. Add 22 new action codes to `useAuditStore`
2. Map to module `HR`
3. Add NABH chapter **HRM** (new) to `nabhEvidence.ts`
4. Add seed entries for HR module so chip renders on hard reload
5. Add tint + testid to audit log filter

**Verification:** audit log filter shows HR chip; clicking filters to HR events; NABH dashboard shows 9/9 chapters

### M0.3 — RBAC Matrix

**Steps:**
1. Create `src/lib/permissions.ts`
2. Add `canDo(role, action)` checks at every admin action call site
3. Add 403 toast when permission denied
4. Add admin-only / role-aware nav filtering in AppShell

**Verification:** logged in as doctor, admin nav entries don't show; logged in as admin, all entries show; firing a write action as non-admin shows 403 toast

---

## 10. Acceptance Criteria for the Full Plan

After all 12 phases:
- A COO can run morning operations review entirely from admin panel — see overnight events, approve leave, check coverage, review finance, send broadcast
- Every clinical action has a HR audit trail (who was on shift when this critical event happened)
- Every regulatory deadline is tracked + delegated
- Every staff change propagates everywhere within one session
- Every dispute, conflict, exception has a workflow with audit
- Audit log shows "what changed" not just "something changed"
- The admin panel works on tablet for ward-rounds use

---

## 11. Recommended Starting Point

**Build order I recommend:**
1. **Phase 0** (1 build) — Foundation
2. **Phase 1** (2 builds) — Staff lifecycle
3. **Phase 2** (2 builds) — Shifts v2
4. **Phase 3** (1 build) — Exceptions
5. **Phase 4** (1 build) — Clinical integration

That's **7 focused builds** to deliver the "Staff Management v2" core. After that, the next 7 phases are independent and can be sequenced by business priority (Finance vs Compliance vs Quality first depends on what's most painful for the user).

If we just do Phases 0–4 the admin role becomes genuinely production-grade for hospital staff operations. The remaining phases turn it into a complete COO command centre.
