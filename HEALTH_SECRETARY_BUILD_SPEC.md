# Health Secretary Cockpit — Frontend Build Specification

> **Audience:** Claude Code 4.7 (implementer)
> **Owner:** Amandeep
> **Module:** New role + cockpit module inside existing HMS frontend on `hms-build` branch
> **Sibling spec:** `CMO_COCKPIT_BUILD_SPEC.md` — many primitives and patterns are reused; read it first
> **Deadline:** Demoable to MP Health Minister tomorrow (alongside the CMO build)
> **Backend:** Fake/mock API for this build. No backend changes required.

---

## 0. TL;DR for the implementer

Build a second role-scoped cockpit (`/secretary`) inside the same Next.js HMS frontend. The cockpit is **role = Health Secretary** (Principal Secretary Health, Government of MP, who serves the Minister's office). It has its own layout, 25 menu items, fully interactive with mock data, and looks even more polished than the CMO build because **this is the screen the Minister will actually want to use himself.**

**Relationship to the CMO build:**
- Same shell (sidebar + main + top bar), same design tokens, same primitives (AlertRow, ApprovalRow, DrillCard, MetricTile, etc.)
- Shared primitives live under `components/shared/` — refactor from `components/cmo/primitives/` if you haven't already, or create `components/shared/` fresh and import from both cockpits
- Different scope: state-wide instead of district. Different mock data, different store names (`useSecretary*Store`), different screens
- Both cockpits accessible from the dev-login screen as separate role buttons

**Non-negotiables:**
1. Do not touch any existing patient/clinical UI or the CMO routes.
2. All data is mocked. No backend calls.
3. Hindi labels alongside English on key surfaces — same convention as CMO.
4. Must look government-grade. This is the cockpit the Minister himself may use.
5. Every menu item resolves to a working screen.
6. The 5 demo-star screens must be flawless: Home, Map & district ranking, Inter-district mobilization, Cabinet & Assembly drafter, NITI Aayog & ABDM dashboard.
7. **District ranking is the political killer feature.** This is where the Minister will say "show me the bottom 5 districts again." Build it tight.

---

## 1. Demo target

Same meeting as the CMO demo. After Amandeep shows the CMO cockpit, he taps "Switch role" in the top bar (or opens a second tab), logs in as "Smt./Shri [name redacted], Principal Secretary Health, MP," and lands at `/secretary`. The Minister sees:

1. **Hindi state brief** — what's happening across all 52 districts in 4 sentences
2. **District ranking** — top 5 and bottom 5 districts with composite scores and weekly movement
3. **NITI Aayog Health Index live preview** — where MP ranks today, indicator by indicator
4. **Cabinet note drafter** — Amandeep types "Sickle cell mission Q2 progress," AI drafts a 3-paragraph note in Hindi+English in front of the Minister's eyes
5. **Inter-district mobilization** — one pending request, Minister taps Approve, resource flows from one district to another

If these five work flawlessly, this is the screen the Minister asks his PS to "show him every morning" — and that's the pilot conversion we're aiming for.

---

## 2. Scope

### In scope
- All 25 menu items with at least functional content
- Sidebar navigation with section grouping
- Top bar with Secretary identity, state ("Madhya Pradesh · 52 districts"), live indicator, time
- Mock API layer (`mockSecretaryApi`) with realistic state-wide data and simulated latency
- Stateful mock — Approve actions persist within session
- Simulated live updates (district scores tick, alerts arrive)
- Hindi labels on AI brief, ranking section, Cabinet drafter, key buttons
- Responsive enough for tablet (iPad landscape, 1024×768 min)
- Polished using same Tailwind tokens as CMO build

### Out of scope
- Real backend integration
- Real geo-spatial map of MP (use a styled grid of 52 districts as a heatmap; a real choropleth is Phase 2)
- Voice playback of Hindi briefs
- Real Cabinet/Assembly AI generation (use a fixed library of pre-canned responses keyed to typed prompts)
- Mobile native
- Settings persistence
- Permission gating per sub-item

---

## 3. Tech approach

Same as CMO spec §3. Re-use everything possible:
- Same Next.js App Router, TypeScript, Zustand, Tailwind, Tabler icons
- Same mock API pattern (Promise-based with delays, in-memory mutable state)
- Same store pattern (one store per major concern)
- Same shared component contracts (AlertRow, ApprovalRow, etc.)

**Key difference:** the Secretary's mock data is one order of magnitude larger (52 districts vs 142 facilities), so seed data must be programmatically generated rather than hand-written for some collections.

---

## 4. Project structure

Layered on top of the CMO build. Create these files; do not modify existing CMO or patient files except where noted.

```
frontend/
├── app/
│   └── secretary/
│       ├── layout.tsx
│       ├── page.tsx                       # Home · State brief (route /secretary)
│       ├── alerts/page.tsx
│       ├── approvals/page.tsx
│       ├── ranking/page.tsx               # Map & district ranking ★
│       ├── mobilization/page.tsx          # Inter-district ★
│       ├── beds/page.tsx                  # State bed network
│       ├── emergency/page.tsx             # Statewide emergency
│       ├── districts/page.tsx             # 52 district cockpits
│       ├── dme/page.tsx                   # Medical colleges
│       ├── ayush/page.tsx
│       ├── surveillance/page.tsx
│       ├── mch/page.tsx
│       ├── disease-programs/page.tsx
│       ├── schemes/page.tsx               # PM-JAY & state schemes
│       ├── fraud/page.tsx
│       ├── workforce/page.tsx             # Workforce & DME faculty
│       ├── supply/page.tsx                # MPPHSCL & procurement
│       ├── quality/page.tsx
│       ├── cag-audit/page.tsx             # CAG audit & RTI
│       ├── reports/page.tsx               # National reports & PIP
│       ├── niti-abdm/page.tsx             # NITI Aayog & ABDM ★
│       ├── cabinet/page.tsx               # Cabinet, Assembly, policy ★
│       ├── centre/page.tsx                # MoHFW & NHA
│       ├── communication/page.tsx
│       ├── ai-assistants/page.tsx
│       ├── settings/page.tsx
│       ├── audit-log/page.tsx
│       └── profile/page.tsx
├── components/
│   ├── shared/                            # Refactored from cmo/primitives if not done already
│   │   ├── MetricTile.tsx
│   │   ├── AlertRow.tsx
│   │   ├── ApprovalRow.tsx
│   │   ├── DrillCard.tsx
│   │   ├── EmptyState.tsx
│   │   ├── TabBar.tsx
│   │   ├── SeverityDot.tsx
│   │   ├── HindiText.tsx
│   │   ├── LiveIndicator.tsx
│   │   └── ChipFilter.tsx
│   └── secretary/
│       ├── layout/
│       │   ├── SecretarySidebar.tsx
│       │   ├── SecretaryTopBar.tsx
│       │   └── SecretaryPageHeader.tsx
│       └── widgets/
│           ├── StateAiBriefCard.tsx
│           ├── StateKpiStrip.tsx
│           ├── DistrictRankingTable.tsx          # ★ core demo asset
│           ├── DistrictHeatmapGrid.tsx           # 52-district stylized "map"
│           ├── StateCriticalAlertsFeed.tsx
│           ├── InterDistrictMobilizationPanel.tsx # ★
│           ├── NitiAayogIndicatorGrid.tsx        # ★
│           ├── AbdmMilestoneTracker.tsx
│           ├── CabinetNoteDrafter.tsx            # ★
│           ├── AssemblyQaDrafter.tsx             # ★
│           ├── MedicalCollegeStatusGrid.tsx
│           ├── FundFlowDiagram.tsx
│           └── StrategicItemsList.tsx
├── lib/
│   ├── mocks/
│   │   └── secretary/
│   │       ├── api.ts                     # Exports mockSecretaryApi
│   │       ├── seed-state-brief.ts
│   │       ├── seed-districts.ts          # All 52 districts with composite scores
│   │       ├── seed-medical-colleges.ts   # 14 GMCs
│   │       ├── seed-state-alerts.ts
│   │       ├── seed-state-approvals.ts
│   │       ├── seed-mobilization-requests.ts
│   │       ├── seed-niti-indicators.ts
│   │       ├── seed-abdm-milestones.ts
│   │       ├── seed-cabinet-templates.ts  # Pre-canned AI responses
│   │       ├── seed-assembly-questions.ts
│   │       ├── seed-centre-correspondence.ts
│   │       ├── seed-fund-flow.ts
│   │       └── live-simulator.ts
│   └── stores/
│       └── secretary/
│           ├── useSecretarySessionStore.ts
│           ├── useSecretaryAlertsStore.ts
│           ├── useSecretaryApprovalsStore.ts
│           ├── useSecretaryDistrictsStore.ts
│           ├── useSecretaryMedicalCollegesStore.ts
│           ├── useSecretaryMobilizationStore.ts
│           ├── useSecretaryNitiStore.ts
│           ├── useSecretaryAbdmStore.ts
│           ├── useSecretaryCabinetStore.ts
│           ├── useSecretaryAssemblyStore.ts
│           └── useSecretaryCentreStore.ts
└── types/
    └── secretary.ts                        # All Secretary-specific interfaces
```

**Refactor note:** if the CMO build already created primitives under `components/cmo/primitives/`, move them to `components/shared/` and update CMO imports. The primitives are role-agnostic. This is a one-time refactor; takes ~30 minutes.

---

## 5. Role registration & login flow

Same dev-login pattern as CMO. Add a second entry:

```tsx
{
  id: 'secretary',
  label: 'PS Health · MP',
  landingRoute: '/secretary',
  persona: 'Smt. Anuradha Verma'        // placeholder name; never reference real official
}
```

### Session shape

```typescript
// types/secretary.ts
export interface SecretarySession {
  userId: string;                  // 'usr_secretary_mp_01'
  name: string;                    // 'Smt. Anuradha Verma'
  nameHindi: string;               // 'श्रीमती अनुराधा वर्मा'
  designation: string;             // 'Principal Secretary Health'
  designationHindi: string;        // 'प्रमुख सचिव स्वास्थ्य'
  state: string;                   // 'Madhya Pradesh'
  stateHindi: string;              // 'मध्य प्रदेश'
  districtCount: number;           // 52
  medicalCollegeCount: number;     // 14
  facilitiesCount: number;         // ~1,247
  populationCr: number;            // 8.5
  joinedDate: string;
  avatarInitials: string;          // 'AV'
  permissionScope: 'state';
}
```

Top bar should also show a "Switch role" affordance that opens a small modal listing the available role personas (Patient/Doctor/CMO/Secretary) — clicking one re-routes. This is for the demo to flow smoothly between cockpits.

---

## 6. Routing

| # | Route | Page title (EN) | Page title (HI) |
|---|---|---|---|
| 1 | `/secretary` | Home · State brief | होम · राज्य संक्षिप्ति |
| 2 | `/secretary/alerts` | Alerts | अलर्ट |
| 3 | `/secretary/approvals` | Approvals | अनुमोदन |
| 4 | `/secretary/ranking` | Map & district ranking | मानचित्र और जिला रैंकिंग |
| 5 | `/secretary/mobilization` | Inter-district mobilization | अंतर-जिला संसाधन |
| 6 | `/secretary/beds` | State bed network | राज्य बेड नेटवर्क |
| 7 | `/secretary/emergency` | Statewide emergency | राज्यव्यापी आपातकाल |
| 8 | `/secretary/districts` | 52 District cockpits | 52 जिला कॉकपिट |
| 9 | `/secretary/dme` | DME · 14 colleges | DME · 14 कॉलेज |
| 10 | `/secretary/ayush` | AYUSH facilities | AYUSH सुविधाएं |
| 11 | `/secretary/surveillance` | Surveillance & outbreaks | निगरानी और प्रकोप |
| 12 | `/secretary/mch` | MCH & immunization | मातृ-शिशु और टीकाकरण |
| 13 | `/secretary/disease-programs` | Disease programs | रोग कार्यक्रम |
| 14 | `/secretary/schemes` | PM-JAY & state schemes | PM-JAY और राज्य योजनाएं |
| 15 | `/secretary/fraud` | Fraud command | धोखाधड़ी कमांड |
| 16 | `/secretary/workforce` | Workforce & DME faculty | कार्यबल और DME संकाय |
| 17 | `/secretary/supply` | Supply chain & MPPHSCL | आपूर्ति शृंखला और MPPHSCL |
| 18 | `/secretary/quality` | Quality & incidents | गुणवत्ता और घटनाएं |
| 19 | `/secretary/cag-audit` | CAG audit & RTI | CAG ऑडिट और RTI |
| 20 | `/secretary/reports` | National reports & PIP | राष्ट्रीय रिपोर्ट और PIP |
| 21 | `/secretary/niti-abdm` | NITI Aayog & ABDM | NITI आयोग और ABDM |
| 22 | `/secretary/cabinet` | Cabinet, Assembly, policy | कैबिनेट, विधानसभा, नीति |
| 23 | `/secretary/centre` | Centre · MoHFW & NHA | केंद्र · MoHFW और NHA |
| 24 | `/secretary/communication` | Communication & press | संचार और प्रेस |
| 25 | `/secretary/ai-assistants` | AI assistants | AI सहायक |
| — | `/secretary/settings` | Settings | सेटिंग्स |
| — | `/secretary/audit-log` | Audit log | ऑडिट लॉग |
| — | `/secretary/profile` | Profile | प्रोफ़ाइल |

Plus 3 admin routes (settings, audit-log, profile) for a total of 28 routes.

---

## 7. Layout primitives

Same shell as CMO (sidebar + top bar). Differences:

### Top bar variations
- Left: "Madhya Pradesh · 52 districts · 14 colleges" instead of district info
- Add a **"Brief Minister"** quick-action button (top-right, primary color) — opens a modal with the latest AI brief and a "Send to Minister" button (logs to console, shows confirmation toast). The presence of this button signals to the demo audience: this seat serves the Minister.

### SecretarySidebar.tsx
Section ordering per §6 (English) / consolidated list:

1. **Daily** — Home, Alerts (badge), Approvals (badge)
2. **State command** — Map & ranking, Inter-district mobilization, State bed network, Statewide emergency
3. **Network** — 52 District cockpits, DME · 14 colleges, AYUSH
4. **Public health programs** — Surveillance & outbreaks, MCH & immunization, Disease programs
5. **Schemes & funds** — PM-JAY & state schemes, Fraud command
6. **Workforce & supply** — Workforce & DME faculty, Supply chain & MPPHSCL
7. **Quality & compliance** — Quality & incidents, CAG audit & RTI
8. **Reports & returns** — National reports & PIP, NITI Aayog & ABDM
9. **Policy & centre** — Cabinet/Assembly/policy, Centre · MoHFW
10. **Comms & AI** — Communication & press, AI assistants
11. **Admin** — Settings, Audit log, Profile

Header block in sidebar: "आरोग्य दृष्टि MP" / "State command · Mantralaya".

---

## 8. Design tokens & i18n

Same as CMO spec §8. No changes. Hindi text appears prominently on:
- State AI brief
- District ranking section headers ("श्रेष्ठ प्रदर्शन" / "हस्तक्षेप आवश्यक")
- Cabinet drafter heading
- Assembly Q&A section
- Key action buttons

---

## 9. Mock API layer

### `lib/mocks/secretary/api.ts`

```typescript
import { stateAlerts, stateApprovals, districts, medicalColleges, /* ... */ } from './seeds';

const delay = (ms = 250 + Math.random() * 400) =>
  new Promise(r => setTimeout(r, ms));

let _alerts = [...stateAlerts];
let _approvals = [...stateApprovals];
let _mobilizationRequests = [...seedMobilization];
let _cabinetNotes = [...seedCabinet];
let _assemblyQuestions = [...seedAssembly];
// ...

export const mockSecretaryApi = {
  // Session
  async getSession() { /* */ },

  // Dashboard
  async getStateDashboardSummary() {
    await delay();
    return {
      nitiRank: 17,
      nitiRankDelta: +3,
      redDistricts: 4,
      yellowDistricts: 12,
      stateAlertsCount: _alerts.filter(a => !a.acknowledged).length,
      pmJayTodayCr: 4.2,
      mmr: 163,
      mmrDelta: -4,
      immunizationPct: 87,
      abdmCompliancePct: 74,
    };
  },

  // District ranking ★
  async getDistrictRanking() {
    await delay();
    return districts; // 52 districts with composite scores
  },
  async getDistrictDetail(id: string) { /* */ },
  async sendCongratulation(districtId: string) { /* logs to audit */ },
  async issueShowCause(districtId: string, reason: string) { /* */ },

  // Inter-district mobilization ★
  async getMobilizationRequests() { /* */ },
  async approveMobilization(id: string) {
    await delay(400);
    _mobilizationRequests = _mobilizationRequests.map(r =>
      r.id === id ? { ...r, status: 'approved', approvedAt: new Date().toISOString() } : r
    );
    return _mobilizationRequests.find(r => r.id === id);
  },

  // NITI Aayog & ABDM ★
  async getNitiIndicators() { /* */ },
  async getAbdmMilestones() { /* */ },

  // Cabinet & Assembly ★
  async draftCabinetNote(prompt: string) {
    await delay(2000); // realistic AI-like delay
    return generateCabinetNoteFromPrompt(prompt);
  },
  async getAssemblyQuestions() { /* */ },
  async draftAssemblyAnswer(questionId: string) { /* */ },

  // Standard CRUD
  async getStateAlerts() { /* */ },
  async getStateApprovals() { /* */ },
  async getMedicalColleges() { /* */ },
  async getNationalReportsStatus() { /* */ },
  async getCentreCorrespondence() { /* */ },
  async getFundFlow() { /* */ },
  // ...
};
```

### Live simulator

Same pattern as CMO. Pushes:
- New state-level alert every 90s (e.g., "Centre fund release ₹47 Cr cleared", "Outbreak alert from Sehore CMO")
- District ranking shifts (one district moves up/down by 1 score point every 60s) — visible on the ranking screen
- NITI indicator update every 2 minutes (one indicator value updates)

---

## 10. Zustand stores

Same pattern as CMO. Each store has loading/loaded state, fetch action, mutation actions, and a `pushUpdate` for the live simulator.

Notable additions for Secretary:

```typescript
// useSecretaryCabinetStore.ts
interface CabinetState {
  notes: CabinetNote[];
  currentDraft: string | null;
  drafting: boolean;
  drafterPrompt: string;
  setDrafterPrompt: (p: string) => void;
  generateDraft: () => Promise<void>;
  signDraft: () => Promise<void>;
  history: CabinetNote[];
}
```

---

## 11. Shared components — contracts

Re-use all CMO primitives. Notable additions or variants:

### `<DistrictRankingTable />` ★

```tsx
<DistrictRankingTable
  districts={districts}              // 52 districts
  view="topbottom"                   // 'topbottom' | 'full' | 'movers'
  weightProfile="balanced"           // 'balanced' | 'mmr-focus' | 'scheme-focus' | 'custom'
  onDistrictClick={(d) => router.push(`/secretary/districts/${d.id}`)}
  onSendCongratulation={(d) => ...}
  onIssueShowCause={(d) => ...}
/>
```

### `<NitiAayogIndicatorGrid />` ★

Grid of NITI Aayog Health Index sub-indicators. Each cell shows: indicator name, MP value, best-state value, gap, trend arrow.

### `<CabinetNoteDrafter />` ★

```tsx
<CabinetNoteDrafter
  templates={cabinetTemplates}       // pre-canned prompts and responses
  onSign={(note) => ...}
  onSendToMinister={(note) => ...}
/>
```

Internally manages: prompt input, "Draft" button, loading state, generated draft (editable), Sign/Send buttons.

### `<DistrictHeatmapGrid />`

52 districts shown as a 9-wide grid of small tiles (5 rows × ~10 cols, with empty corners). Each tile color-coded by composite score. Hover shows tooltip with district name and score. Click opens drill.

### `<FundFlowDiagram />`

Simple Sankey-ish visualization: Centre → State (NHM, PM-JAY, schemes) → Districts → Facilities. Shows flow rates. Use SVG with rectangles and arrows — no fancy library.

---

## 12. Screen specifications

25 main screens plus 3 admin. Five demo-stars are marked ★.

---

### 12.1 Home · State brief — `/secretary` ★ DEMO STAR

**Purpose:** The Minister's morning screen.

**Layout (top to bottom):**

1. **Page header** — "Namaskar, Principal Secretary Health" + "Madhya Pradesh · 52 districts · 14 medical colleges · 8.5 Cr population" + live indicator + Brief Minister button (top right, primary)

2. **Hero KPI strip** — 4 tiles:
   - `MetricTile` — "NITI Aayog rank" — value `17` — delta `+3 ranks` — default
   - `MetricTile` — "Red districts" — value `4` — hint `of 52` — critical
   - `MetricTile` — "State alerts" — value `15` — hint `need action` — warning
   - `MetricTile` — "PM-JAY today" — value `₹4.2 Cr` — default

3. **State AI brief** — `<StateAiBriefCard />`:
   - Header: Sparkles icon + "AI राज्य संक्षिप्ति · Minister brief" + "Play audio" button + "Send to Minister" button (primary, small)
   - Body (Hindi-English mixed paragraph):
     > "राज्य में कल OPD 2.1L, deliveries 3,847, deaths 47 (माता 2, शिशु 9). Dengue outbreaks Bhopal, Indore, Gwalior — IHIP submitted. Mandla में oxygen संकट · Jabalpur से dispatch रवाना. PM-JAY में 7 fraud patterns detect, ₹3.4L flagged, NHA notified. कैबिनेट 3 बजे · Sickle cell mission progress note तैयार है. विधानसभा शुक्रवार · 5 starred Qs pending."
   - Footer chips: "Open Cabinet drafter", "Open Assembly Q&A", "View top 5 districts"

4. **District ranking** — embedded `<DistrictRankingTable view="topbottom" />`:
   - Two columns: Top 5 (green) and Bottom 5 (red) with composite scores and weekly delta
   - "View full ranking" link → `/secretary/ranking`

5. **Critical state alerts** — `<StateCriticalAlertsFeed />`:
   - 4 alerts (inter-district resource needs, multi-district outbreak, DME overload, Centre fund delay)
   - Same row pattern as CMO

6. **State KPI trends** — 3 small tiles:
   - MMR (per 1L births): 163, ↓4
   - Full immunization: 87%, ↑2
   - ABDM compliance: 74%, M2 met

7. **Strategic items needing sign-off** — `<StrategicItemsList />`:
   - 4 items: Cabinet note due today, Assembly Qs due Friday, NHM UC ₹187 Cr due 2 days, Tender ₹14.6 Cr due 5 days

**Mock data shape:**
```typescript
interface StateDashboardSummary {
  nitiRank: number;
  nitiRankDelta: number;
  redDistricts: number;
  yellowDistricts: number;
  stateAlertsCount: number;
  pmJayTodayCr: number;
  mmr: number;
  mmrDelta: number;
  immunizationPct: number;
  abdmCompliancePct: number;
  topDistricts: District[];
  bottomDistricts: District[];
}
```

**Interactions:**
- "Brief Minister" button → opens modal with the 1-page brief + "Send via WhatsApp/Email/Print" actions (all log to console + toast)
- Click any district in ranking → drills to that CMO cockpit (cross-product navigation)
- Click any state alert → opens DrillCard
- Click "Open Cabinet drafter" → navigates to `/secretary/cabinet`
- Hero tiles clickable → navigate to relevant screens

**Acceptance:**
- [ ] Page loads in <1.5s with all 7 sections populated
- [ ] State AI brief Hindi text renders correctly
- [ ] District ranking embedded view shows top 5 and bottom 5
- [ ] Brief Minister button opens modal with brief content
- [ ] All cross-links navigate correctly
- [ ] Live simulator pushes a new alert within 90s

---

### 12.2 Alerts — `/secretary/alerts`

**Purpose:** State-level alert inbox.

Same structure as CMO alerts screen (§12.2 of CMO spec) but with state-scoped alerts:
- Inter-district resource needs
- Multi-district outbreaks
- Centre fund delays / approvals
- DME tertiary referral overload
- High-profile incidents (VVIP, MLC, mass casualty)
- Fraud patterns
- Sentinel events bubbling up from districts

**Seed (12 alerts minimum):**
1. Critical — 3 districts request mobilization · Mandla O₂, Jhabua ICU, Alirajpur paediatric — 22 min
2. Warning — Dengue spread · Bhopal, Indore, Gwalior — 1h
3. Warning — DME tertiary referral overload · 4 colleges >95% — 2h
4. Info — Centre fund release delayed · NHM Q2 ₹187 Cr — 4h
5. Critical — Maternal death · CHC Berasia, Bhopal — escalated from CMO — 5h
6. Critical — Outbreak alert · Sehore CMO requests state team — 6h
7. Warning — 4 districts NHM PIP underutilized · Q1 below 60% — 1d
8. Info — NHA queries on 14 PM-JAY claims — 1d
9. Warning — CAG audit response due in 5 days — 1d
10. Info — RTI first appeal · pending response from PS office — 2d
11. Info — DME faculty vacancy · 17 posts in 4 colleges — 2d
12. Critical — Press story breaking · doctor absenteeism in tribal districts — 3h

**Filter additions** (vs CMO):
- "Severity" same
- "District" — multi-select 52 districts
- "Source" — Inter-district / Surveillance / Finance / DME / Centre / Quality / AI / Press
- "Owner" — CMO / Mission Director / DME Director / Self / Unassigned

**Acceptance:** Same as CMO §12.2, scoped to state data.

---

### 12.3 Approvals — `/secretary/approvals`

**Purpose:** Strategic sign-off queue.

Structure same as CMO Approvals (§12.3) but with state-level items.

**Tabs:**
- All (8)
- Tenders (2)
- MoUs (1)
- Cross-district transfers (3)
- Scheme launches (1)
- Policy circulars (1)

**Seed (8 items):**
1. Tender approval · 87 ventilators · ₹14.6 Cr · L1 vendor selected · 5 days
2. Tender approval · CT scan AMC · ₹2.4 Cr · 3 vendors shortlisted · 6 days
3. MoU · TCS for ABDM rollout integration · 7 days
4. Cross-district transfer · Dr. Mehta · Bhopal → Indore · faculty deputation · 2 days
5. Cross-district transfer · Dr. Rao · Jabalpur → Gwalior · 3 days
6. Cross-district transfer · Dr. Chouhan · Indore → Bhopal · cardiology rotation · 1 day
7. Scheme launch · Adolescent mental health pilot · 3 districts · 14 days
8. Policy circular · Mandatory ABHA at OPD registration · 7 days

**Drill drawer content:** Standard. Tender drill shows L1/L2/L3 quotes, technical evaluation summary, EMD/BG status, GeM compliance, recommendation, supporting documents.

**Acceptance:** Same as CMO §12.3.

---

### 12.4 Map & district ranking — `/secretary/ranking` ★ DEMO STAR

**Purpose:** The political accountability tool. THIS IS THE FEATURE THE MINISTER WILL SHOW THE CM.

**Layout:**

1. **Page header** — "Map & district ranking" + subtitle "Weekly composite score · 52 districts · last updated Sun 22 Jun"

2. **View toggle** — "Map · Table · Movers" (3-way segmented control)

3. **Weight profile selector** — radio chips:
   - "Balanced" (default — MMR 20% + IMR 20% + NQAS 15% + stock 15% + attendance 15% + scheme 15%)
   - "MMR focus" (MMR 40% + others reduced)
   - "Scheme delivery focus" (PM-JAY + state schemes 50%)
   - "Custom" — opens a sliders modal

4. **Map view** — `<DistrictHeatmapGrid />`:
   - 52 districts as colored tiles in a grid (try to roughly mimic MP geography: north tiles = Chambal districts, south = Mahakoshal, etc.)
   - Color scale: dark green (>85) → green (75-85) → amber (60-75) → orange (45-60) → red (<45)
   - Hover tile → tooltip with district name, score, key indicators
   - Click tile → drill drawer with full district detail (mini CMO cockpit preview + actions)

5. **Table view** — `<DistrictRankingTable view="full" />`:
   - All 52 districts as rows
   - Columns: Rank, District, Population, Score, MMR, IMR, NQAS%, Stock health, Attendance, Scheme coverage, Weekly delta, Actions
   - Sortable on any column
   - Search box
   - Click row → drill drawer

6. **Movers view** — Two side-by-side cards:
   - "Biggest improvers this week" — top 5 by positive delta
   - "Biggest decliners this week" — top 5 by negative delta

7. **Bottom: Actions panel** (sticky on scroll):
   - "Send congratulations to top 5" → opens compose modal (template pre-filled)
   - "Issue show-cause to bottom 5" → opens compose modal with reason field
   - "Schedule review with bottom 5 CMOs" → opens VC scheduler stub
   - "Generate ranking report (PDF)" → toast: "Report generated · sent to your Drive"

**District drill drawer:**
- Header: District name, CMO name, population, rank, weekly delta
- 6 metric tiles for the score components (MMR, IMR, NQAS, stock, attendance, scheme)
- Mini facility status (top 5 facilities)
- "Open full CMO cockpit" link → `/cmo` (logs you in as that district's CMO for demo continuity, OR shows a read-only preview)
- Action buttons: Send congratulation / Issue show-cause / Schedule review

**Mock data:**

```typescript
interface District {
  id: string;
  name: string;
  nameHindi: string;
  cmoName: string;
  population: number;            // lakhs
  isTribal: boolean;
  region: 'Chambal' | 'Malwa' | 'Mahakoshal' | 'Bundelkhand' | 'Vindhya' | 'Nimad';
  facilitiesCount: number;
  rank: number;                  // 1-52
  prevRank: number;
  score: number;                 // 0-100, composite
  prevScore: number;
  components: {
    mmr: { value: number; score: number };
    imr: { value: number; score: number };
    nqasPct: { value: number; score: number };
    stockHealth: { value: number; score: number };
    attendance: { value: number; score: number };
    schemeCoverage: { value: number; score: number };
  };
  topAlerts: number;
}
```

**Seed:** All 52 MP districts. Top performers (score 80-91): Indore, Ujjain, Jabalpur, Sagar, Bhopal. Mid-tier (60-79): Gwalior, Sehore, Rewa, Satna, Vidisha, Hoshangabad, Dewas, Mandsaur, Ratlam, Khargone, Khandwa, etc. Bottom (35-50): Sheopur, Panna, Jhabua, Alirajpur, Dindori. Include realistic Hindi names.

**Interactions:**
- Switching weight profile → all scores recompute in front of user (with smooth animation)
- "Send congratulations to top 5" → modal with template letter (Hindi + English), recipients pre-filled, signature line, Send button → toast + audit log
- "Issue show-cause to bottom 5" → modal with reason field (required), date for response (default 7 days), Send button → toast
- Click any tile or row → drill drawer
- "Open full CMO cockpit" from drill → navigates to CMO cockpit (could be a temporary role-impersonation for demo, or read-only preview)
- Live simulator: one random district's score changes by ±1 every 60s (visible animation in both map and table views)

**Acceptance:**
- [ ] All 52 districts render in both Map and Table views
- [ ] Map heatmap uses correct color gradient
- [ ] Sorting works on every table column
- [ ] Weight profile switch recomputes scores live
- [ ] Drill drawer shows full district detail
- [ ] Send congratulation / show-cause modals work end-to-end
- [ ] Score changes from live simulator visible within 60s
- [ ] **Performance:** Switching views is <300ms

---

### 12.5 Inter-district mobilization — `/secretary/mobilization` ★ DEMO STAR

**Purpose:** Move resources between districts.

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - Open requests: 3
   - Approved today: 2
   - Avg response time: 18 min
   - Resource volume this week: ₹47L equivalent

3. **Pending requests panel** — main feature, one card per request:
   - Each card shows:
     - **From district** (origin of the request, in red border-left if critical)
     - **Need:** "Liquid oxygen · 800L · within 6 hours"
     - **Reason:** "Mandla DH stock 4 hours · 26 patients on O2"
     - **AI suggestion:** "Source from Jabalpur MPPHSCL warehouse (47 km, ETA 2h 30m)"
     - **Alternative sources:** 2 other options ranked
     - **Action buttons:** "Approve as suggested · स्वीकार" · "Choose alternative" · "Reject"
4. **Active transfers in progress** — list of approved transfers en route, with ETA countdown

5. **History tab** — last 30 days of completed mobilizations

**Mock data:**
```typescript
interface MobilizationRequest {
  id: string;
  fromDistrict: string;
  fromFacility?: string;
  resourceType: 'oxygen' | 'blood' | 'ventilator' | 'icu-bed' | 'specialist' | 'drug' | 'ambulance';
  resourceDetail: string;
  quantity: string;
  urgencyHours: number;
  severity: 'critical' | 'warning' | 'info';
  reason: string;
  aiSuggestion: {
    source: string;
    sourceDistrict: string;
    distanceKm: number;
    etaMinutes: number;
    rationale: string;
  };
  alternatives: Array<{ source: string; etaMinutes: number; note: string }>;
  status: 'pending' | 'approved' | 'in-transit' | 'delivered' | 'rejected';
  createdAt: string;
  approvedAt?: string;
  deliveredAt?: string;
}
```

**Seed (3 pending + 2 in-transit + 10 history):**
1. PENDING · Mandla → liquid oxygen 800L · Jabalpur MPPHSCL · 2h ETA · CRITICAL
2. PENDING · Jhabua → 4 paediatric specialists for 48h · Indore MGM · 6h ETA · CRITICAL  
3. PENDING · Alirajpur → 6 ICU beds · Indore MGM · indefinite duration · WARNING
4. IN-TRANSIT · Sehore → AB- blood 10 units · Bhopal Hamidia · ETA 18 min
5. IN-TRANSIT · Datia → ventilators 3 units · Gwalior GRMC · ETA 1h 5m
6-15. HISTORY: completed transfers with varied resources

**Interactions:**
- "Approve as suggested" → confirmation modal showing the full plan → confirm → request status updates → moves to "in transit" → notification simulated to source & destination
- "Choose alternative" → expands to show alternatives, user picks one, then approves
- "Reject" → forces reason → request closes
- In-transit transfers: ETA decrements every 30s. On reaching 0, status changes to "delivered" briefly, then archived
- Live simulator: every 3 minutes, push a new pending request from a random district

**Acceptance:**
- [ ] 3 pending requests render with full detail
- [ ] AI suggestion clearly shown with rationale
- [ ] Approve action visibly updates the status and moves card to in-transit
- [ ] ETA ticks down in real time
- [ ] Live simulator adds a new request during demo

---

### 12.6 State bed network — `/secretary/beds`

**Purpose:** All beds across MP.

Structure similar to CMO bed network but at state level:
- Summary by district (52 rows in matrix, columns are ward types)
- Drill into a district → shows that district's facility matrix (same as CMO bed network)
- Heatmap of ICU/Ventilator availability across districts (4 critical districts in red)

**Acceptance:** Matrix renders for 52 districts × 7 ward types. Drill into district works.

---

### 12.7 Statewide emergency — `/secretary/emergency`

Same pattern as CMO Emergency mode (§12.7 of CMO spec) but at state level:
- Activate types: Pandemic surge, Mass casualty (inter-district), Natural disaster, Communal incident
- Resource mobilization across districts
- Inter-state requests
- Central liaison (NDRF, armed forces)
- Cabinet briefing draft auto-generated

**Acceptance:** Activation flow works. Resource mobilization panel renders.

---

### 12.8 52 District cockpits — `/secretary/districts`

**Purpose:** Drill into any district's CMO view.

**Layout:**
1. **Page header**
2. **Filter bar:** region · tribal toggle · score range · search
3. **Grid view** of 52 district cards. Each card:
   - District name (EN + HI)
   - CMO name
   - Population
   - Rank badge
   - Score with delta
   - Top 2 alerts
   - "Open cockpit" button
4. Click "Open cockpit" → opens CMO cockpit (impersonation or read-only preview)

**Acceptance:** 52 district cards render. Open cockpit works.

---

### 12.9 DME · 14 medical colleges — `/secretary/dme`

**Purpose:** Tertiary care coordination.

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - Total colleges: 14
   - Total beds: ~7,500
   - PG seats: ~2,400
   - Faculty vacancies: 187
   - NMC inspections due (90 days): 4

3. **College grid** — `<MedicalCollegeStatusGrid />`:
   - 14 cards, one per college
   - Each card: Name (Hamidia, MGM Indore, etc.), location, beds (used/total), specialty load heatmap, faculty vacancy count, last NMC inspection date, status
4. Click college → drill drawer with deep detail (departments, faculty, research, occupancy, referral pattern)

**Seed (14 colleges):**
1. Gandhi Medical College (Hamidia), Bhopal
2. Mahatma Gandhi Memorial Medical College, Indore
3. Gajra Raja Medical College, Gwalior
4. Netaji Subhash Chandra Bose Medical College, Jabalpur
5. Shyam Shah Medical College, Rewa
6. Bundelkhand Medical College, Sagar
7. Government Medical College, Datia
8. Government Medical College, Khandwa
9. Government Medical College, Ratlam
10. Government Medical College, Shahdol
11. Government Medical College, Shivpuri
12. Government Medical College, Chhindwara
13. Government Medical College, Vidisha
14. Government Medical College, Satna

**Acceptance:** 14 college cards render. Drill works.

---

### 12.10 AYUSH facilities — `/secretary/ayush`

**Purpose:** Ayurveda/Yoga/Unani/Siddha/Homoeopathy oversight.

**Layout:**
- Summary tiles: total AYUSH facilities, dispensaries, doctors, OPD footfall
- Tabs: Ayurveda · Homoeopathy · Unani · Yoga & Naturopathy · Integration with allopathy
- Each tab: facility list with relevant metrics

**Acceptance:** All 5 tabs render with at least 10 rows each.

---

### 12.11 Surveillance & outbreaks — `/secretary/surveillance`

**Purpose:** State-level disease surveillance.

Same pattern as CMO surveillance, scoped to state:
- Statewide IDSP/IHIP dashboard
- Active outbreaks across multiple districts (3 active: dengue Bhopal, dengue Indore, chikungunya Gwalior)
- Cross-district spread visualization (simple SVG arrows between affected districts)
- Notifiable disease counts by district
- IHIP national sync status

**Acceptance:** Outbreak map renders. Disease table sortable.

---

### 12.12 MCH & immunization — `/secretary/mch`

State-level MCH:
- MMR/IMR district-wise
- JSY payments status statewide
- Immunization coverage by district
- High-risk pregnancy aggregates
- Maternal death audit dashboard (statewide)

**Acceptance:** State-wide MMR/IMR district map renders.

---

### 12.13 Disease programs — `/secretary/disease-programs`

State-level program dashboards:
- TB / Nikshay statewide
- NCD program rollout
- Tribal health mission (21 tribal districts highlighted)
- Vector-borne diseases statewide

**Acceptance:** All 4 tabs render with state-scope data.

---

### 12.14 PM-JAY & state schemes — `/secretary/schemes`

State-level scheme dashboard:
- PM-JAY: total claims, ₹ approved, NHA score, district variation, top performers
- Sambal: enrolment, claims, payouts
- JSY: deliveries, payments, leakage
- RBSK: school health screening coverage
- Free drug & diagnostic: utilization

**Acceptance:** All schemes show statewide aggregates with district drill-down.

---

### 12.15 Fraud command — `/secretary/fraud`

**Purpose:** State fraud detection across schemes.

**Layout:**
- Summary tiles: ₹ flagged this week, hospitals under investigation, recovered, criminal referrals
- Tabs: Auto-flagged patterns · Under investigation · Recovered · Referred
- AI-flagged patterns list with severity, hospital, amount, pattern type
- Action: Suspend empanelment / Refer to NHA / Recover

**Acceptance:** 7+ flagged patterns visible. Suspend action works.

---

### 12.16 Workforce & DME faculty — `/secretary/workforce`

State-level workforce:
- Summary: total sanctioned posts, vacancies, AWOL%, specialists per lakh population
- Tabs: All staff · Doctors · Specialists · DME faculty · Recruitment in progress · Cross-district transfer board

**Acceptance:** All tabs render. Vacancy heatmap by district shown.

---

### 12.17 Supply chain & MPPHSCL — `/secretary/supply`

**Purpose:** State supply chain command.

**Layout:**
- Summary tiles: warehouse stock health, pending dispatches, vendor SLAs, expiring drugs value
- MPPHSCL warehouse view — top critical drugs, stock days, reorder status
- Procurement pipeline — open tenders, GeM orders, vendor performance
- Vendor scorecard table

**Acceptance:** Warehouse view renders. Tenders list visible.

---

### 12.18 Quality & incidents — `/secretary/quality`

State quality:
- NQAS/Kayakalp/LaQshya certification heatmap by district
- NABH for medical colleges
- Statewide incident dashboard
- Sentinel events register

**Acceptance:** Certification heatmap shows all 52 districts. Incident drill works.

---

### 12.19 CAG audit & RTI — `/secretary/cag-audit`

**Purpose:** Audit and RTI command.

**Layout:**
- Tabs: Open CAG findings · Action-taken reports · Pending responses · RTI queue
- Each tab: list with SLA tracker
- Drill: full finding text, response in progress, attachments

**Acceptance:** All tabs render with realistic content.

---

### 12.20 National reports & PIP — `/secretary/reports`

State-level reports:
- National HMIS submission status (auto-rolled-up from 52 districts)
- IHIP / RCH / U-WIN / Nikshay sync
- PIP utilization by activity head
- UC (Utilization Certificate) drafting for NHM funds

**Acceptance:** All standard reports show with realistic next-due dates. Sign UC action works.

---

### 12.21 NITI Aayog & ABDM — `/secretary/niti-abdm` ★ DEMO STAR

**Purpose:** The political legitimacy dashboard.

**Layout:**

1. **Page header** — "NITI Aayog Health Index · ABDM milestones"

2. **NITI Aayog section:**
   - **Big rank tile:** "Rank 17" with delta "+3 from last year"
   - **`<NitiAayogIndicatorGrid />`** — grid of all NITI Aayog Health Index sub-indicators:
     - Domain 1: Health Outcomes (MMR, IMR, U5MR, SRB, full immunization, ANC coverage, etc.)
     - Domain 2: Governance & Information (vacancy%, NABH-certified facilities, etc.)
     - Domain 3: Key Inputs & Processes (HRH, NQAS-certified, etc.)
   - Each cell: indicator name, MP current value, best-state value, gap, target, trend mini-spark
   - Color-coded: green (achieving), amber (in progress), red (lagging)

3. **ABDM section:**
   - **Milestone tracker (`<AbdmMilestoneTracker />`):**
     - M1 — basic ABDM compliance — ✓ Achieved
     - M2 — ABHA creation & HFR registration — ✓ Achieved (74%)
     - M3 — FHIR exchange & UHI — In progress (32% of facilities)
     - M4 — advanced clinical decision support — Not started
   - Incentive amounts earned vs available
   - District-wise compliance heatmap

4. **AI-suggested interventions** panel:
   - For the worst NITI indicators, AI suggests specific interventions ("To improve full immunization in 6 lagging districts, deploy 12 mobile vaccination teams; expected lift: +4 percentage points over 12 weeks")
   - Each suggestion has estimated cost, expected impact, timeline

**Mock data:**
```typescript
interface NitiIndicator {
  id: string;
  domain: 1 | 2 | 3;
  name: string;
  nameHindi: string;
  currentValue: number;
  bestStateValue: number;
  bestState: string;
  gap: number;
  target: number;
  trend: number[];                 // 8 data points for sparkline
  status: 'achieving' | 'in-progress' | 'lagging';
}

interface AbdmMilestone {
  id: string;                       // M1, M2, M3, M4
  name: string;
  description: string;
  status: 'not-started' | 'in-progress' | 'achieved';
  progressPct: number;
  incentiveAmountCr: number;
  earnedCr: number;
  achievedAt?: string;
}
```

**Interactions:**
- Click NITI indicator → drill shows historical trend, district contributors, AI recommendation
- Click "Apply suggestion" on AI panel → confirmation, sent for budget approval
- Click ABDM milestone → drill with district-wise compliance breakdown

**Acceptance:**
- [ ] NITI grid shows 20+ indicators across 3 domains
- [ ] ABDM milestone tracker shows 4 milestones with progress bars
- [ ] AI suggestions panel renders with 3 actionable suggestions
- [ ] District-wise ABDM heatmap renders

---

### 12.22 Cabinet, Assembly, policy — `/secretary/cabinet` ★ DEMO STAR

**Purpose:** The AI killer feature for this role.

**Layout:**

1. **Page header**

2. **Tabs:**
   - **Cabinet notes** (the main demo asset)
   - Assembly Q&A
   - Policy & circulars
   - MoUs & contracts

### Cabinet notes tab — `<CabinetNoteDrafter />`

**Layout (3-column):**

- **Left column (25%):** "Recent notes" list — 5–10 past notes with status (Draft / Signed / Sent)
- **Middle column (50%):** The drafter
  - Big text input: "What's the note about?"
  - Suggested templates as chips: "Scheme progress", "Outbreak response", "Budget request", "Crisis response", "Performance review"
  - "Draft" button (primary, big)
  - Below: Generated draft area (initially empty) — appears with a typewriter-like animation as AI "writes"
  - Edit buttons: "Make formal", "Translate to Hindi", "Add data", "Shorten", "Lengthen"
  - Bottom action buttons: "Sign & lock" · "Send to Minister" · "Save draft" · "Discard"
- **Right column (25%):** Live data sidebar — when drafting about "Sickle cell mission Q2 progress," shows live stats from the relevant data store (4 tribal districts, screening counts, etc.) that get pulled into the draft

**Drafter behavior:**
- User types or selects a template
- Click "Draft" → 2-second realistic delay with a "AI is drafting..." indicator (animated dots)
- Draft appears in chunks (simulate streaming with `setInterval` adding text every 100ms)
- Draft contains Hindi+English content, formatted with headings, numbered points, statistics pulled from mock data
- Each edit button modifies the draft (call mock API with the edit type, get back a modified version)
- Sign & lock → draft becomes immutable, status changes to "Signed", appears in left column with timestamp
- Send to Minister → opens modal with delivery options (WhatsApp, Email, Print, In-system) → confirm → toast

**Pre-canned responses for the demo:**

Pre-write 5–6 high-quality cabinet notes mapped to prompt keywords:
- "sickle cell" → 3-paragraph note about sickle cell mission progress
- "dengue" → outbreak response and resource allocation
- "PM-JAY" → scheme performance review
- "NHM" → fund utilization and Q2 progress
- "doctor recruitment" → workforce gap and recruitment proposal
- "budget" → supplementary budget request

If prompt doesn't match, return a generic but reasonable response.

### Assembly Q&A tab — `<AssemblyQaDrafter />`

**Layout:**
- List of pending Assembly questions (5 starred Qs, 12 unstarred for Friday session)
- Each question card: Question number, MLA name (placeholder), constituency, question text (Hindi + English), due date
- "Draft answer" button on each → opens drafter pane
- Drafter pane: shows full Q, AI-generated draft answer with footnoted data, edit area, action buttons (Sign & lodge, Forward to Minister, Save draft)

**Seed (5 starred Qs):**
1. Q on dengue cases and response measures
2. Q on doctor vacancies in tribal districts  
3. Q on PM-JAY utilization and fraud
4. Q on JSY payment delays
5. Q on NABH certification status of state medical colleges

### Policy & circulars tab

Simple list of draft policies and circulars with versioning. Compose new policy modal.

### MoUs & contracts tab

Active MoUs (e.g., with NHSRC, AIIMS, TCS, ICMR) with renewal dates and status.

**Acceptance:**
- [ ] Cabinet drafter accepts prompt, generates draft with streaming animation
- [ ] Edit buttons modify the draft
- [ ] Sign & lock works, note appears in history
- [ ] Send to Minister modal works
- [ ] At least 5 pre-canned prompts return polished responses
- [ ] Assembly Q&A drafter works for all 5 starred Qs
- [ ] Policy and MoU tabs functional

---

### 12.23 Centre · MoHFW & NHA — `/secretary/centre`

**Purpose:** Centre-state coordination.

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - Open correspondence: 17
   - Fund flow Q2: ₹287 Cr received / ₹420 Cr expected
   - National programs active: 11
   - UCs pending: 2

3. **Tabs:**
   - **MoHFW correspondence** — letters in/out, RTIs from Centre, scheme approvals
   - **NHA & PM-JAY** — empanelment, audit objections, claims correspondence
   - **Fund flow** — `<FundFlowDiagram />` showing money flow from Centre → State → Districts → Facilities; Q-by-Q breakdown
   - **National programs** — RNTCP, NHM, NPCDCS, NMHP, RBSK, RKSK, NTCP, etc. — each with target, achievement, fund flow status

4. Drill drawer for any item with attachment list and response form

**Acceptance:** All 4 tabs render. Fund flow diagram visible. National programs grid populated.

---

### 12.24 Communication & press — `/secretary/communication`

**Purpose:** Broadcast + press management.

**Layout:**

1. **Page header**

2. **Tabs:**
   - **Broadcast to CMOs** — composer (target by region / tribal / score band / individual), message, send
   - **Video conference** — schedule VC with CMOs / Deans / Mission Director, instant VC button
   - **Press releases** — compose, embargo, release, media coverage tracker
   - **Public dashboard admin** — what data is public, configurable

**Acceptance:** All 4 tabs functional. Broadcast composer works.

---

### 12.25 AI assistants — `/secretary/ai-assistants`

**Purpose:** Strategic AI tools.

**Layout:**

1. **Page header**

2. **Assistant cards (5):**

   1. **State brief generator** — daily Minister brief, "Generate now" button
   2. **Scenario modeler** — input form: "What if we add 100 ICU beds in Indore?" / "What if we recruit 200 doctors for tribal districts?" / "What if we spend ₹10 Cr on dengue control?" — returns AI-modeled outcome (impact, cost, timeline, risks)
   3. **Policy recommender** — based on NITI gaps and best-state benchmarks, suggests 3 policy interventions
   4. **Press response drafter** — similar to CMO version but state-scoped (negative story → AI drafts response)
   5. **Assembly answer drafter** — quick access to the same tool as in §12.22

Each card has an Open button that expands into a full-screen drawer with the assistant.

**Scenario modeler details:**
- Input: scenario description (free text or template)
- Output (after 2s spinner):
  - **Expected impact:** quantified outcomes (lives saved, MMR reduction, NITI rank lift)
  - **Estimated cost:** total ₹ + breakdown
  - **Timeline:** Gantt-style mini-chart
  - **Risks:** 2–3 bullet risks
  - **Action plan:** numbered steps
- "Save scenario" / "Convert to Cabinet note" / "Share with Minister" buttons

**Acceptance:** All 5 assistants open. Scenario modeler returns structured output for at least 3 pre-canned prompts.

---

### Admin screens — `/secretary/settings`, `/secretary/audit-log`, `/secretary/profile`

Same as CMO §12.22, §12.23, §12.24 with state-scope content.

---

## 13. Cross-screen interactivity behaviors

Same patterns as CMO §13:

### Live updates
- New state alert every 90s
- One district score changes ±1 every 60s on Ranking screen
- One NITI indicator updates every 2 minutes
- Mobilization request added every 3 minutes
- In-transit mobilizations: ETA decrements every 30s

### Toasts
On any user action: success toast top-right.
- "Mobilization approved · resources dispatched"
- "Cabinet note signed and locked"
- "Show-cause issued to Sheopur CMO"
- "Brief sent to Minister via WhatsApp"

### Cross-product navigation
- Click any district anywhere → option to open that district's CMO cockpit
- Top bar "Switch role" → modal listing personas → click → re-route

### Audit log auto-update
Every action logs an audit row.

### Language toggle
Same as CMO. Top bar EN | हिं toggle.

---

## 14. Demo script for tomorrow

After the CMO demo (~120s), continue with:

**The Secretary demo (~120s):**

1. **Top bar → "Switch role" → "PS Health · MP."** Land at `/secretary`. The state brief loads in Hindi. Pause. Let the Minister read.

2. **"This is your state in one screen, sir."** Point at the 4 KPI tiles. NITI rank 17, +3 from last year.

3. **Tap "Brief Minister" button** in top right. Modal opens with the 1-page brief. "This goes to your phone every morning at 7 AM. You can read it in 90 seconds."

4. **Scroll to District Ranking section** on the home page. Show top 5 and bottom 5. "Indore is winning. Sheopur, Panna, Jhabua, Alirajpur, Dindori need attention."

5. **Tap "View full ranking"** → land at `/secretary/ranking`. Show the map heatmap of MP. Tap a red district. The drill shows the score breakdown — MMR, IMR, NQAS, stock, attendance, scheme.

6. **Show the "Issue show-cause" button.** "Sir, with one tap, you can send a formal show-cause to a CMO. Audit-logged. Tracked. The CMO gets it on his phone."

7. **Tap NITI Aayog & ABDM** in sidebar. Show the indicator grid. Point at 3 indicators where MP is lagging. Then show ABDM milestones — M2 achieved.

8. **Tap Cabinet drafter** in sidebar. Type "Sickle cell mission Q2 progress." Click Draft. Wait 2 seconds. AI streams the note in Hindi+English. "Sir, you have a Cabinet meeting at 3 PM. This is your note. Edit. Sign. Done."

9. **Tap Inter-district mobilization.** Show the 3 pending requests. "Mandla needs oxygen in 6 hours. AI says route from Jabalpur. Tap Approve." Tap. Watch status update to in-transit. ETA starts ticking down. "This used to take 6 phone calls and 4 hours. Now it's 6 seconds."

10. **Close.** "Sir, this is आरोग्य दृष्टि MP. The CMO version for 52 districts. This version for you. Both live. Both ready. Both demo-able to CM-saheb tomorrow."

Rehearse this twice tonight. Time it. Should fit in 2 minutes leaving question time.

---

## 15. Acceptance checklist

### Build hygiene
- [ ] Builds clean with no TS errors
- [ ] No console errors during the demo flow
- [ ] No placeholders visible anywhere
- [ ] All 28 routes (25 + 3 admin) resolve to populated screens

### Visual quality
- [ ] Sidebar correctly grouped per §7
- [ ] Hindi text renders correctly
- [ ] Severity/score colors consistent with CMO build
- [ ] District ranking heatmap is legible and aesthetically right

### Interactivity (demo-critical)
- [ ] District ranking weight profile switch works
- [ ] Show-cause modal works with reason field
- [ ] Cabinet drafter accepts prompt and returns streamed draft
- [ ] Inter-district mobilization approve action works end-to-end
- [ ] NITI indicator drill shows historical trend
- [ ] Live simulator pushes alerts, district scores, mobilization requests
- [ ] Cross-product navigation (Secretary → CMO) works

### Performance
- [ ] First contentful paint < 1.5s
- [ ] District ranking with 52 rows loads <500ms
- [ ] Map heatmap renders <300ms
- [ ] No layout shifts

### Resilience
- [ ] Mock API calls have try/catch
- [ ] Demo flow tested end-to-end twice without breaks
- [ ] Both CMO and Secretary cockpits can be open in two tabs simultaneously without state collision

---

## 16. Out of scope / next sprint

- Real backend integration
- Real WebSocket / SSE
- Real choropleth map of MP (current: stylized grid heatmap)
- Real LLM-generated Cabinet/Assembly text (current: pre-canned + streaming animation)
- Voice playback of Hindi briefs
- Settings persistence
- Cross-user collaboration (multiple Secretaries / Ministers in real time)
- Full sub-item RBAC

---

## 17. Build order recommendation

If you have ~12 hours after CMO is done (or building in parallel):

1. **Hour 0–1.5:** Project scaffolding, layout, sidebar, role registration, mock api skeleton, types, refactor primitives to `components/shared/`
2. **Hour 1.5–3:** Home screen with state brief, KPI strip, embedded district ranking, strategic items
3. **Hour 3–5:** District ranking screen (★) — map heatmap, full table, weight profile switch, drill drawer, show-cause flow
4. **Hour 5–6.5:** Inter-district mobilization (★) — pending requests, approval flow, in-transit tracking
5. **Hour 6.5–8.5:** Cabinet drafter (★) + Assembly Q&A — prompt input, streaming draft, edit buttons, sign flow, pre-canned responses
6. **Hour 8.5–9.5:** NITI Aayog & ABDM dashboard (★) — indicator grid, milestone tracker, AI suggestions
7. **Hour 9.5–10.5:** Alerts, Approvals, State bed network, Statewide emergency
8. **Hour 10.5–11.5:** DME, Districts, Schemes, Centre, Workforce, Supply (light fidelity)
9. **Hour 11.5–12:** Remaining screens (AYUSH, Surveillance, MCH, Disease programs, Fraud, Quality, CAG, Reports, AI assistants, Comms, Settings, Audit log, Profile)
10. **Final pass:** Live simulator wiring, cross-product nav, demo flow rehearsal

**If time runs short**, deprioritize in this order: AYUSH, Audit log, Profile, Settings, Communication, MCH, Disease programs, MoUs tab, Fund flow diagram, AI assistants beyond the brief generator.

---

## 18. Notes for the implementer

1. **Refactor shared primitives FIRST.** Spending 30 minutes upfront moving `AlertRow`, `ApprovalRow`, `DrillCard`, `MetricTile`, etc. to `components/shared/` saves hours later. Both cockpits use them.

2. **The district ranking screen IS the political moment.** Spend extra polish budget here. The heatmap, the weight profile switcher, the show-cause modal — all need to feel premium.

3. **Cabinet drafter must feel like real AI.** The streaming effect (text appearing word by word) is what sells it. Spend time on the animation. The actual content can be pre-canned — that's fine.

4. **Pre-cache the demo prompts.** Make sure "sickle cell mission Q2 progress" returns a brilliant draft. The demo will probably use that exact prompt. Have a fallback "thinking really hard" message for unmatched prompts but make sure your 5–6 demo prompts work perfectly.

5. **District names matter.** Use real MP district names, in correct Hindi (मध्य प्रदेश). Mis-naming a district in front of the Minister is embarrassing.

6. **The "Brief Minister" button is symbolic.** It says: this seat exists to serve the Minister. Position it prominently in the top bar. Even if it just opens a modal that says "Brief sent" — it's worth the button.

7. **Don't try to render a real MP map.** A 9×6 grid of tiles is fine. The Minister cares about the data per district, not pixel-perfect geography. Use real district names in tooltips.

8. **Two browser tabs for the demo.** Have one tab on the CMO cockpit, one tab on the Secretary cockpit. Switch via tabs, not via "Switch role" — that's faster and less risky during the demo.

9. **Console.log everything.** Every button that doesn't have a real backend should log `[Secretary Demo] User clicked X`. This becomes the spec for next sprint.

10. **The Minister might tap things you didn't plan.** Make sure every menu item resolves to *something* — even if it's a basic table with mocked data. No 404s. No "Coming soon."

Build it tight.
