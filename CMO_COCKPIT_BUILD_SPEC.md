# CMO Cockpit — Frontend Build Specification

> **Audience:** Claude Code 4.7 (implementer)
> **Owner:** Amandeep
> **Module:** New role + cockpit module inside existing HMS frontend on `hms-build` branch
> **Deadline:** Demoable to MP Health Minister tomorrow
> **Backend:** Fake/mock API for this build. No backend changes required.

---

## 0. TL;DR for the implementer

Build a new role-scoped cockpit (`/cmo`) inside the existing Next.js HMS frontend. The cockpit is **role = CMO** (Chief Medical & Health Officer of a district). It has its own layout (sidebar + main), 24 menu items, fully interactive with mock data, and looks polished enough to put on a tablet in front of the Health Minister of MP.

**Non-negotiables:**
1. Do not touch any existing patient/clinical UI. New routes only.
2. All data is mocked. No backend calls. Use the `mockCmoApi` module described in §9.
3. Hindi labels alongside English in key surfaces (per master plan §2.13).
4. Must look professional. The Minister will judge on first 5 seconds.
5. Every menu item must open to a working screen — no "coming soon" placeholders.
6. Interactivity must feel live: clicking Approve actually updates the count, dismissing an alert actually removes it, etc.
7. Tabler outline icons throughout. No emoji.

**What you have to deliver:**
- New route tree under `app/cmo/*`
- A CMO role added to the existing role/auth system, with a dev-login button that lands you in `/cmo`
- All 24 menu items working with mock data
- The 5 "demo-star" screens polished to a high finish (Home, Alerts, Approvals, Bed Network, Ambulance Command)
- The other 19 screens functional with sensible content but lower fidelity is acceptable
- A 90-second demo flow that reliably works end-to-end

---

## 1. Demo target

Tomorrow morning, Amandeep walks into a room with the Health Minister of MP. He hands over a tablet showing the `/cmo` route logged in as "Dr. Rajesh Sharma, CMO Bhopal." The Minister taps around. Nothing must break. The aha moments are:

1. **Hindi 8 AM brief** — Minister reads it, recognizes it as government voice
2. **Critical alerts feed** — taps the oxygen alert, sees the drill-in with action history
3. **Bed network** — sees live bed availability across 142 facilities
4. **Ambulance command** — sees a live ambulance with patient data flowing to the receiving ED
5. **District ranking sneak peek** (we'll cross-link to a state view if there's time)

If these five work flawlessly, the rest of the menu is browseable, the visual language is consistent, and the polish reads as "government-grade" — we win the meeting.

---

## 2. Scope

### In scope
- All 24 menu items with at least functional content
- Sidebar navigation with section grouping
- Top bar with CMO identity, district, live indicator, time
- Mock API layer with realistic data and simulated latency
- Stateful mock — approve/dismiss/transfer actions persist in session
- Simulated push: new alerts arrive every 90 seconds during demo
- Hindi labels on AI brief, alerts headers, key buttons
- Responsive enough for tablet (target: iPad landscape, 1024×768 min)
- Polished visual finish using Tailwind + Tabler icons

### Out of scope (defer to next sprint)
- Real backend integration (will replace `mockCmoApi` later)
- Real WebSocket — use `setInterval` to simulate
- Real geo-spatial map rendering (use a styled district list/grid; map is decorative)
- Voice playback of the Hindi brief (Phase 2)
- Mobile native — tablet web is enough for demo
- Settings persistence across page reload (mock state can reset)
- Audit log full functionality — show last 50 mocked entries
- Profile editing — read-only is fine
- Print/export — show the button, log a console message

---

## 3. Tech approach

**Stack (locked, from master plan §2.3 and §6):**
- Next.js App Router (existing)
- TypeScript
- Zustand for state (existing pattern, ~50 stores already)
- Tailwind CSS (assume installed; if not, install)
- Tabler outline icons via `@tabler/icons-react`

**Install if not already present:**
```
npm install @tabler/icons-react
```

**Mock API approach:**
- Self-contained module at `lib/mocks/cmo/`
- Returns Promises with 200–600ms artificial delay
- Mutable in-memory state for the session
- Exposed via a single `mockCmoApi` object

**State management:**
- One Zustand store per major concern (alerts, approvals, facilities, beds, ambulance, etc.)
- Stores call `mockCmoApi` methods
- Components subscribe to stores via selectors

**Routing:**
- Nested routes under `/cmo`
- Shared layout at `app/cmo/layout.tsx` provides sidebar + top bar
- Each menu item maps to a route

---

## 4. Project structure

Create these files. Do not modify existing files except where explicitly noted.

```
frontend/
├── app/
│   └── cmo/
│       ├── layout.tsx                    # Sidebar + top bar shell
│       ├── page.tsx                       # Home / brief (route /cmo)
│       ├── alerts/page.tsx
│       ├── approvals/page.tsx
│       ├── facilities/page.tsx
│       ├── beds/page.tsx
│       ├── ambulance/page.tsx
│       ├── emergency/page.tsx
│       ├── staff/page.tsx
│       ├── postings/page.tsx
│       ├── surveillance/page.tsx
│       ├── mch/page.tsx
│       ├── disease-programs/page.tsx
│       ├── schemes/page.tsx
│       ├── supply/page.tsx
│       ├── equipment/page.tsx
│       ├── quality/page.tsx
│       ├── grievances/page.tsx
│       ├── field-visits/page.tsx
│       ├── reports/page.tsx
│       ├── communication/page.tsx
│       ├── ai-assistants/page.tsx
│       ├── settings/page.tsx
│       ├── audit-log/page.tsx
│       └── profile/page.tsx
├── components/
│   └── cmo/
│       ├── layout/
│       │   ├── CmoSidebar.tsx
│       │   ├── CmoSidebarSection.tsx
│       │   ├── CmoSidebarItem.tsx
│       │   ├── CmoTopBar.tsx
│       │   └── CmoPageHeader.tsx
│       ├── primitives/
│       │   ├── MetricTile.tsx
│       │   ├── AlertRow.tsx
│       │   ├── ApprovalRow.tsx
│       │   ├── FacilityRow.tsx
│       │   ├── BedTile.tsx
│       │   ├── AmbulanceCard.tsx
│       │   ├── DrillCard.tsx
│       │   ├── EmptyState.tsx
│       │   ├── TabBar.tsx
│       │   ├── SeverityDot.tsx
│       │   ├── HindiText.tsx
│       │   └── LiveIndicator.tsx
│       └── widgets/
│           ├── AiBriefCard.tsx
│           ├── CriticalAlertsFeed.tsx
│           ├── LiveOpsTiles.tsx
│           ├── FacilityStatusList.tsx
│           ├── PendingApprovalsList.tsx
│           ├── DistrictHealthScore.tsx
│           ├── BedAvailabilityMatrix.tsx
│           ├── AmbulanceLiveBoard.tsx
│           └── OutbreakHeatmap.tsx
├── lib/
│   ├── mocks/
│   │   └── cmo/
│   │       ├── api.ts                     # Exports mockCmoApi
│   │       ├── seed-alerts.ts
│   │       ├── seed-approvals.ts
│   │       ├── seed-facilities.ts
│   │       ├── seed-beds.ts
│   │       ├── seed-ambulances.ts
│   │       ├── seed-staff.ts
│   │       ├── seed-schemes.ts
│   │       ├── seed-supply.ts
│   │       ├── seed-incidents.ts
│   │       ├── seed-audit-log.ts
│   │       └── live-simulator.ts          # Pushes new alerts every 90s
│   └── stores/
│       └── cmo/
│           ├── useCmoSessionStore.ts
│           ├── useCmoAlertsStore.ts
│           ├── useCmoApprovalsStore.ts
│           ├── useCmoFacilitiesStore.ts
│           ├── useCmoBedsStore.ts
│           ├── useCmoAmbulancesStore.ts
│           ├── useCmoStaffStore.ts
│           ├── useCmoSurveillanceStore.ts
│           ├── useCmoSchemesStore.ts
│           ├── useCmoSupplyStore.ts
│           └── useCmoQualityStore.ts
└── types/
    └── cmo.ts                              # All TypeScript interfaces
```

---

## 5. Role registration & login flow

The existing system has 24 roles per master plan §2.2 and frontend memory. Add the CMO role to whatever role-switcher / dev-login exists today.

### What to add

In the existing dev-login screen (or wherever roles are selectable):

```tsx
{ id: 'cmo', label: 'CMO — Bhopal', landingRoute: '/cmo', persona: 'Dr. Rajesh Sharma' }
```

When the user clicks this entry, set the session (via existing pattern) and redirect to `/cmo`.

### Session shape used by the cockpit

```typescript
// types/cmo.ts
export interface CmoSession {
  userId: string;              // 'usr_cmo_bhopal_01'
  name: string;                 // 'Dr. Rajesh Sharma'
  nameHindi: string;            // 'डॉ. राजेश शर्मा'
  designation: string;          // 'CMHO'
  district: string;             // 'Bhopal'
  districtHindi: string;        // 'भोपाल'
  facilitiesCount: number;      // 142
  populationLakhs: number;      // 38.4
  joinedDate: string;           // ISO date
  avatarInitials: string;       // 'RS'
  permissionScope: 'district';
}
```

Seed the session into `useCmoSessionStore` on first mount of `app/cmo/layout.tsx`.

---

## 6. Routing

| # | Route | Page title (EN) | Page title (HI) |
|---|---|---|---|
| 1 | `/cmo` | Home · Today's brief | होम · आज की संक्षिप्ति |
| 2 | `/cmo/alerts` | Alerts | अलर्ट |
| 3 | `/cmo/approvals` | Approvals | अनुमोदन |
| 4 | `/cmo/facilities` | Facilities & map | सुविधाएं और मानचित्र |
| 5 | `/cmo/beds` | Bed network | बेड नेटवर्क |
| 6 | `/cmo/ambulance` | Ambulance command | एम्बुलेंस कमांड |
| 7 | `/cmo/emergency` | Emergency mode | आपातकालीन मोड |
| 8 | `/cmo/staff` | Staff & attendance | स्टाफ़ और उपस्थिति |
| 9 | `/cmo/postings` | Postings & escalations | पोस्टिंग और एस्केलेशन |
| 10 | `/cmo/surveillance` | Surveillance & outbreaks | निगरानी और प्रकोप |
| 11 | `/cmo/mch` | MCH & immunization | मातृ-शिशु और टीकाकरण |
| 12 | `/cmo/disease-programs` | Disease programs | रोग कार्यक्रम |
| 13 | `/cmo/schemes` | PM-JAY & schemes | PM-JAY और योजनाएं |
| 14 | `/cmo/supply` | Drugs & supply | दवाएं और आपूर्ति |
| 15 | `/cmo/equipment` | Equipment & AMC | उपकरण और AMC |
| 16 | `/cmo/quality` | Quality, incidents, deaths | गुणवत्ता, घटनाएं, मृत्यु |
| 17 | `/cmo/grievances` | RTI & grievances | RTI और शिकायतें |
| 18 | `/cmo/field-visits` | Field visits | फ़ील्ड विज़िट |
| 19 | `/cmo/reports` | Reports & returns | रिपोर्ट और रिटर्न |
| 20 | `/cmo/communication` | Communication | संचार |
| 21 | `/cmo/ai-assistants` | AI assistants | AI सहायक |
| 22 | `/cmo/settings` | Settings | सेटिंग्स |
| 23 | `/cmo/audit-log` | Audit log | ऑडिट लॉग |
| 24 | `/cmo/profile` | Profile | प्रोफ़ाइल |

Tip: also support `/cmo/home` → redirect to `/cmo`.

---

## 7. Layout primitives

### `app/cmo/layout.tsx`

```
[ Sidebar 240px | Main content min-w-0 ]
```

- Sidebar: white background, light border on right, full height, scrollable
- Main: light gray background (`bg-slate-50` or equivalent), with top bar + content
- Top bar: 56px height, sticky, white, light border bottom, contains:
  - Left: District badge + CMO name + designation
  - Right: Live indicator (green dot + "Live · updated 12 sec ago"), notifications icon with badge, language toggle (EN | हिं), avatar

### `CmoSidebar.tsx`

- Logo block at top (`आरोग्य दृष्टि MP` / `CMO Cockpit · Bhopal`)
- Grouped menu items per §6 list, in the section order:
  1. **Daily** — Home, Alerts (badge: count of critical), Approvals (badge: count)
  2. **Operations** — Facilities & map, Bed network, Ambulance command, Emergency mode
  3. **Workforce** — Staff & attendance, Postings & escalations
  4. **Public health** — Surveillance & outbreaks, MCH & immunization, Disease programs
  5. **Schemes & supply** — PM-JAY & schemes, Drugs & supply, Equipment & AMC
  6. **Quality & compliance** — Quality/incidents/deaths, RTI & grievances
  7. **Field & reports** — Field visits, Reports & returns
  8. **Comms & AI** — Communication, AI assistants
  9. **Admin** — Settings, Audit log, Profile
- Each item has: Tabler icon (16px), label, optional badge (right-aligned)
- Active item: light blue background (`bg-blue-50`) with darker blue text
- Section header: uppercase 10px tracking-wider, muted text color, padding-top above each group
- Footer: small "v0.1 — Demo build" text in muted color

### `CmoPageHeader.tsx`

Each page wraps content with this:
```tsx
<CmoPageHeader
  title="Home · Today's brief"
  titleHindi="होम · आज की संक्षिप्ति"
  subtitle="142 facilities · 38.4 lakh population"
  actions={<button>Refresh</button>}
/>
```

---

## 8. Design tokens & i18n

### Tailwind palette (use these consistently)

- **Backgrounds:** `bg-white`, `bg-slate-50`, `bg-slate-100`
- **Borders:** `border-slate-200`
- **Text:** `text-slate-900` (primary), `text-slate-600` (secondary), `text-slate-400` (tertiary)
- **Severity:**
  - Critical: `bg-red-50`, text `text-red-900`, border-left `border-red-700`
  - Warning: `bg-amber-50`, text `text-amber-900`, border-left `border-amber-700`
  - Info: `bg-blue-50`, text `text-blue-900`, border-left `border-blue-700`
  - Success: `bg-green-50`, text `text-green-900`, border-left `border-green-700`
- **Active nav:** `bg-blue-50 text-blue-900`
- **Sidebar group headers:** `text-slate-400 text-[10px] uppercase tracking-wider font-medium`

### Typography

- Font: System default (Inter or Noto Sans if available). Add Devanagari fallback: `font-family: 'Inter', 'Noto Sans Devanagari', system-ui`
- Body: 14px / 1.5
- Compact rows: 12px
- Section titles: 16px / 500 weight
- Numbers/KPIs: 22–24px / 500 weight

### Hindi labels

Hindi appears on:
- 8 AM AI brief (full sentences in Hindi-English mix)
- Alert section header ("मंत्री जी का ध्यान · Critical alerts")
- District ranking section (if shown): "श्रेष्ठ प्रदर्शन" / "हस्तक्षेप आवश्यक"
- Approve / Reject buttons (दोनों भाषाओं में): "स्वीकार करें · Approve", "अस्वीकार · Reject"
- Page titles in subheaders (English primary, Hindi smaller below)

Use a `<HindiText>` primitive that renders Devanagari with proper line-height and the secondary text size.

---

## 9. Mock API layer

### `lib/mocks/cmo/api.ts`

Single object exported. All methods return Promises with 200–600ms delay.

```typescript
import type { Alert, Approval, Facility, Bed, Ambulance, Staff, /* ... */ } from '@/types/cmo';

const delay = (ms = 300 + Math.random() * 300) =>
  new Promise(r => setTimeout(r, ms));

// In-memory mutable state (resets on page reload, that's fine for demo)
let _alerts = [...seedAlerts];
let _approvals = [...seedApprovals];
let _facilities = [...seedFacilities];
// ...

export const mockCmoApi = {
  // Session
  async getSession() {
    await delay(150);
    return seedSession;
  },

  // Dashboard
  async getDashboardSummary() {
    await delay();
    return {
      districtHealthScore: 73,
      districtHealthScoreDelta: +2,
      criticalAlertsCount: _alerts.filter(a => a.severity === 'critical' && !a.acknowledged).length,
      pendingApprovalsCount: _approvals.filter(a => a.status === 'pending').length,
      liveOps: { opd: 4127, ipdCensus: 412, erArrivals: 89, deliveries: 38, ambulanceTrips: 64, deathsAll: 7 },
    };
  },

  // Alerts
  async getAlerts() { await delay(); return _alerts; },
  async acknowledgeAlert(id: string) {
    await delay(200);
    _alerts = _alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a);
    return _alerts.find(a => a.id === id);
  },
  async assignAlert(id: string, ownerId: string) { /* similar */ },
  async dismissAlert(id: string) { /* similar */ },

  // Approvals
  async getApprovals() { await delay(); return _approvals; },
  async approveItem(id: string, note?: string) {
    await delay(300);
    _approvals = _approvals.map(a => a.id === id ? { ...a, status: 'approved', actionedAt: new Date().toISOString() } : a);
    return _approvals.find(a => a.id === id);
  },
  async rejectItem(id: string, reason: string) { /* similar */ },

  // Facilities
  async getFacilities() { await delay(); return _facilities; },
  async getFacility(id: string) { await delay(200); return _facilities.find(f => f.id === id); },

  // Beds
  async getBedNetwork() { await delay(); return seedBeds; },
  async reserveBed(facilityId: string, bedId: string, patientId: string) { /* mutate */ },

  // Ambulance
  async getActiveAmbulances() { await delay(); return seedAmbulances.filter(a => a.status !== 'idle'); },
  async getAmbulance(id: string) { /* */ },

  // Staff
  async getStaffSummary() { /* */ },
  async getAbsentees() { /* */ },

  // Surveillance
  async getOutbreaks() { /* */ },
  async getDiseaseSurveillance() { /* */ },

  // MCH
  async getMchSummary() { /* */ },

  // Schemes
  async getSchemesSummary() { /* */ },
  async getPmJayClaims() { /* */ },

  // Supply
  async getDrugStock() { /* */ },
  async getIndents() { /* */ },

  // Quality
  async getIncidents() { /* */ },
  async getDeathAudits() { /* */ },

  // Grievances
  async getRtiQueue() { /* */ },

  // Field
  async getFieldVisits() { /* */ },

  // Reports
  async getReports() { /* */ },

  // AI
  async getAiBrief() { /* */ },
  async getOutbreakPrediction() { /* */ },
  async getStockoutForecast() { /* */ },

  // Audit log
  async getAuditLog(limit = 50) { /* */ },
};
```

### `lib/mocks/cmo/live-simulator.ts`

Background ticker that pushes a new alert every 90 seconds to make the demo feel alive.

```typescript
let started = false;

export function startLiveSimulator(addAlert: (alert: Alert) => void) {
  if (started) return;
  started = true;

  const surpriseAlerts: Alert[] = [
    {
      id: 'sim_1',
      severity: 'warning',
      icon: 'ti-thermometer',
      title: 'Fever clinic surge · PHC Phanda',
      detail: '23 walk-ins in last hour · 3× baseline',
      facility: 'PHC Phanda',
      ageMinutes: 0,
      acknowledged: false,
    },
    // ...3 more
  ];

  let idx = 0;
  setInterval(() => {
    if (idx < surpriseAlerts.length) {
      addAlert({ ...surpriseAlerts[idx], ageMinutes: 0 });
      idx++;
    }
  }, 90_000);

  // Also age existing alerts every 10s
  setInterval(() => {
    // ... increment ageMinutes for all alerts
  }, 10_000);
}
```

Start the simulator in `app/cmo/layout.tsx` on mount.

---

## 10. Zustand stores (skeleton example)

```typescript
// lib/stores/cmo/useCmoAlertsStore.ts
import { create } from 'zustand';
import { mockCmoApi } from '@/lib/mocks/cmo/api';
import type { Alert } from '@/types/cmo';

interface AlertsState {
  alerts: Alert[];
  loading: boolean;
  loaded: boolean;
  fetchAlerts: () => Promise<void>;
  acknowledge: (id: string) => Promise<void>;
  dismiss: (id: string) => Promise<void>;
  pushAlert: (a: Alert) => void;  // for live simulator
}

export const useCmoAlertsStore = create<AlertsState>((set, get) => ({
  alerts: [],
  loading: false,
  loaded: false,
  async fetchAlerts() {
    set({ loading: true });
    const alerts = await mockCmoApi.getAlerts();
    set({ alerts, loading: false, loaded: true });
  },
  async acknowledge(id) {
    await mockCmoApi.acknowledgeAlert(id);
    set({ alerts: get().alerts.map(a => a.id === id ? { ...a, acknowledged: true } : a) });
  },
  async dismiss(id) {
    await mockCmoApi.dismissAlert(id);
    set({ alerts: get().alerts.filter(a => a.id !== id) });
  },
  pushAlert(a) {
    set({ alerts: [a, ...get().alerts] });
  },
}));
```

Replicate this pattern for each store.

---

## 11. Shared components — contracts

### `<MetricTile />`
```tsx
<MetricTile
  label="District health score"
  value={73}
  delta={+2}                       // shows arrow + value
  variant="default"                // 'default' | 'critical' | 'warning' | 'info' | 'success'
  hint="↑ from 71 last week"       // optional
/>
```

### `<AlertRow />`
```tsx
<AlertRow
  severity="critical"              // critical | warning | info
  icon="lungs"                     // tabler icon name
  title="O₂ < 4 hrs · Hamidia DH"
  detail="26 on O2 · MPPHSCL dispatch ETA 4h 20m"
  ageLabel="12 min"
  onAcknowledge={() => ...}
  onClick={() => router.push(`/cmo/alerts/${alert.id}`)}
/>
```

### `<ApprovalRow />`
```tsx
<ApprovalRow
  icon="truck-delivery"
  title="Emergency indent · oxytocin · 3 PHCs"
  subtitle="Raised by BMO Berasia · ₹47,200"
  ageLabel="2h ago"
  onApprove={() => ...}
  onReject={() => ...}
  onOpen={() => ...}
/>
```

### `<FacilityRow />`
```tsx
<FacilityRow
  name="Hamidia DH"
  type="District Hospital"
  status="critical"                 // 'ok' | 'watch' | 'warning' | 'critical'
  summary="487 IPD · 94% occupancy · O₂ critical"
  alertCount={3}
  onClick={() => router.push(`/cmo/facilities/${id}`)}
/>
```

### `<DrillCard />`
A right-side panel (drawer) that slides in when a row is clicked. Used across alerts, approvals, facilities. Contains:
- Header with title + close button
- Tabs (e.g., for Alert: Details / Timeline / Recommended actions / Audit)
- Action buttons at bottom (Acknowledge, Assign, Escalate)

---

## 12. Screen specifications

Below: each of the 24 screens, with the visible layout, mock data shape, interactions, and acceptance criteria.

The 5 demo-star screens (12.1, 12.2, 12.3, 12.5, 12.6) get the deepest spec. The rest are tighter.

---

### 12.1 Home · Today's brief — `/cmo` ★ DEMO STAR

**Purpose:** Landing screen. The first thing the Minister sees.

**Layout (top to bottom):**

1. **Page header** — "Namaste, Dr. Rajesh Sharma" + subtext "CMHO Bhopal · 142 facilities · 38.4L district population" + live indicator on right + Tue, 24 Jun · 08:14

2. **Hero metrics row** — 3 tiles, equal width:
   - `MetricTile` — "District health score" — value `73` — delta `+2` — default
   - `MetricTile` — "Critical alerts" — value `7` — hint "need action" — critical variant
   - `MetricTile` — "Pending approvals" — value `12` — hint "indents · transfers" — warning variant

3. **AI 8 AM brief card** — `<AiBriefCard />`:
   - Header: Sparkles icon + "AI सुबह की संक्षिप्ति · 8 AM brief" + "Play audio" button (logs to console)
   - Body: Hindi-English mixed paragraph (sample below)
   - Footer: 3 chips → "Open Bhopal map", "Brief Collector", "View dengue cluster"

   Sample body text:
   > "कल रात OPD में 4,127 मरीज, IPD में 412 भर्ती, 38 deliveries, 2 maternal deaths under review. Dengue cases wards 14/17/19 में 3.2× baseline — outbreak management में देखें. Hamidia DH में oxygen 4 hrs से कम. 12 doctors AWOL across 4 PHCs. कलेक्टर ब्रीफिंग 10:30 बजे · draft तैयार है."

4. **Critical alerts section** — `<CriticalAlertsFeed />`:
   - Title: "Critical alerts" + small "View all" link → `/cmo/alerts`
   - Top 4 `AlertRow`s from the store, sorted by severity desc then age asc
   - Click row → opens `<DrillCard />` on the right

5. **Live operations** — `<LiveOpsTiles />`:
   - Title: "Live operations · today"
   - 6 mini tiles in a grid (3 cols × 2 rows):
     - OPD: 4,127
     - IPD census: 412
     - ER arrivals: 89
     - Deliveries: 38
     - Ambulance trips: 64
     - Deaths · all: 7
   - Each tile clickable → routes to relevant screen

6. **Facility status** — `<FacilityStatusList />`:
   - Title: "Facility status" + subtext "Top 5 of 142 · tap to drill in"
   - 5 `FacilityRow`s, sorted by alert count desc
   - Click → opens drill drawer

7. **Pending approvals** — `<PendingApprovalsList />`:
   - Title: "Pending approvals · sign-off needed"
   - Top 3 `ApprovalRow`s
   - Approve / Reject inline (calls store action, count updates)

**Mock data shape:**
```typescript
interface DashboardSummary {
  districtHealthScore: number;
  districtHealthScoreDelta: number;
  criticalAlertsCount: number;
  pendingApprovalsCount: number;
  liveOps: {
    opd: number;
    ipdCensus: number;
    erArrivals: number;
    deliveries: number;
    ambulanceTrips: number;
    deathsAll: number;
  };
}
```

**Interactions:**
- Click any AlertRow → DrillCard slides in from right with full detail
- Click "Acknowledge" inside drill → alert is marked acknowledged, count in sidebar badge decrements, drill closes
- Click any ApprovalRow → drill shows full request with documents (mock placeholders)
- Inline Approve/Reject buttons work without opening drill — fire toast: "Approved · audit log updated"
- Click any LiveOps tile → routes to the corresponding screen
- Click any FacilityRow → drill with facility detail (drug stock, attendance summary, recent incidents)
- "Refresh" button in page header re-fetches everything with a spinner
- Sidebar badges (Alerts: 7, Approvals: 12) update in real time as actions are taken

**Acceptance:**
- [ ] Page loads in <1.5s with all 7 sections populated
- [ ] AI brief Hindi text renders correctly with Devanagari font
- [ ] Clicking any alert opens drill with smooth animation
- [ ] Acknowledging an alert immediately updates sidebar badge
- [ ] Approving an item immediately updates the count
- [ ] Live simulator pushes a new alert within 90s of page open (visible at top of feed with "new" highlight pulse)

---

### 12.2 Alerts — `/cmo/alerts` ★ DEMO STAR

**Purpose:** Single inbox for all alerts.

**Layout:**

1. **Page header** — "Alerts · अलर्ट" + subtitle "All open alerts across 142 facilities"

2. **Filter bar** — horizontal:
   - Severity chips: "All · Critical (3) · Warning (3) · Info (1)" — single-select, default "All"
   - Facility filter: dropdown (all 142 facilities or "All facilities")
   - Source filter: dropdown ("All · Surveillance · Supply · HR · Quality · Finance · AI")
   - Time range: "Last 24h · 7d · 30d" — single-select, default "24h"
   - "Acknowledged" toggle: "Show acknowledged" off by default

3. **Alert table** — full width, one row per alert:
   - Columns: Severity (dot), Time, Title (with subtitle line), Facility, Owner (avatar + name or "Unassigned"), Status, Actions
   - Default sort: severity desc, then ageMinutes asc
   - Sortable columns
   - Click row → DrillCard

4. **Bulk actions bar** (visible when rows selected) — "Acknowledge all", "Assign to..."

**Mock data shape:**
```typescript
interface Alert {
  id: string;
  severity: 'critical' | 'warning' | 'info';
  iconTabler: string;
  title: string;
  detail: string;
  facility: string;
  source: 'surveillance' | 'supply' | 'hr' | 'quality' | 'finance' | 'ai';
  ageMinutes: number;
  acknowledged: boolean;
  owner: { id: string; name: string; avatar: string } | null;
  recommendedActions: string[];
  timeline: AlertTimelineEntry[];
}

interface AlertTimelineEntry {
  timestamp: string;
  actor: string;
  action: string;
}
```

**Seed data (8 alerts minimum):**
1. Critical — O₂ < 4 hrs · Hamidia DH — Supply — 12 min — unack
2. Warning — Dengue cluster · wards 14, 17, 19 — Surveillance — 28 min — unack
3. Critical — Maternal death · CHC Berasia — Quality — 2h — assigned to "Dr. Mehta"
4. Warning — 12 doctors AWOL · 4 PHCs — HR — 1h — unack
5. Warning — Paracetamol stockout · 3 PHCs — Supply — 3h — unack
6. Critical — Oxygen plant down · CH Kolar — Equipment — 4h — assigned to "Vendor: MedTech"
7. Info — PM-JAY fraud pattern · 1 hospital — Finance — 5h — assigned
8. Info — NQAS reassessment due · CHC Berasia — Quality — 1d — unack

**Interactions:**
- Click row → DrillCard opens with 4 tabs:
  - **Details:** title, severity, full description, facility info, age, status, owner
  - **Timeline:** AlertTimelineEntry list (system created → assigned → notes added)
  - **Recommended actions:** 2–4 button-card options (e.g., for O₂: "Reroute from Itarsi", "Escalate to MPPHSCL", "Notify Collector")
  - **Audit:** raw audit log entries
- Bottom of drill: "Acknowledge" button + "Assign to..." dropdown + "Escalate to State" button
- Acknowledging an alert: row moves to "Acknowledged" filter section, sidebar badge decrements
- Filter changes: smooth table update with skeleton during refetch

**Acceptance:**
- [ ] All filters work and combine correctly
- [ ] Sort by severity / time works
- [ ] Drill card shows all 4 tabs with non-empty content
- [ ] Acknowledging updates sidebar badge in <500ms
- [ ] Empty state shown if filter combination yields zero results
- [ ] At least one critical alert has all 4 drill tabs filled with realistic content

---

### 12.3 Approvals — `/cmo/approvals` ★ DEMO STAR

**Purpose:** Items needing CMO sign-off.

**Layout:**

1. **Page header** — "Approvals · अनुमोदन" + subtitle "12 items awaiting your sign-off"

2. **Tabs** at top:
   - All (12)
   - Indents (5)
   - Transfers (3)
   - Leaves (2)
   - PIP reallocations (1)
   - Postings (1)

3. **Approval list** — one card per item:
   - Icon (left)
   - Title
   - Subtitle (raised by, amount, justification snippet)
   - Age
   - Action buttons: "Open · विवरण" · "Approve · स्वीकार" · "Reject · अस्वीकार"
   - Optional inline note field on Reject

4. **Right sidebar** — summary card:
   - Today: 8 approved, 2 rejected
   - This week: 47 approved, 6 rejected
   - Average response time: 1.4h

**Mock data shape:**
```typescript
interface Approval {
  id: string;
  type: 'indent' | 'transfer' | 'leave' | 'pip-reallocation' | 'posting';
  iconTabler: string;
  title: string;
  subtitle: string;
  justification: string;
  raisedBy: string;
  raisedByRole: string;
  amount?: number;       // for indents/PIP
  documents: Array<{ name: string; url: string }>;
  ageHours: number;
  status: 'pending' | 'approved' | 'rejected';
  actionedAt?: string;
  actionNote?: string;
}
```

**Seed data (12 items):**
1. Indent — oxytocin · 3 PHCs · ₹47,200 · Berasia · 2h
2. Indent — paracetamol · 5 PHCs · ₹12,400 · Phanda · 4h
3. Transfer — Dr. Verma · PHC Phanda → CHC Berasia · backfill maternal death facility · 4h
4. Transfer — Dr. Singh · CH Kolar → DH Hamidia · cardiology rotation · 1d
5. Leave — Dr. Patel · 5 days · medical reason · 6h
6. Leave — Nurse Sharma · 10 days · maternity · 1d
7. PIP reallocation · JSY → NCD screening · ₹2.4L · Q1 underspend · 1d
8. Posting — new staff nurse · CHC Bairagarh · vacancy filled · 2d
9. Indent — gloves · DH Hamidia · ₹86,000 · 6h
10. Indent — RDT kits · 4 PHCs · ₹38,000 · 8h
11. Transfer — Dr. Joshi · CHC Berasia → DH Hamidia · faculty deputation · 2d
12. Indent — antibiotics · DH Hamidia · ₹1.4L · 3h

**Interactions:**
- Click "Open" → drill drawer with full detail, documents list (mock — show file names), justification, and big Approve/Reject buttons at bottom
- Inline Approve → confirmation modal with optional note → API call → row updates to "approved" state with timestamp → fades out of pending list after 2s → counter updates
- Inline Reject → modal forces a reason field → API call → row updates
- Filter tabs change list smoothly
- Right sidebar stats update after each action

**Acceptance:**
- [ ] All 5 tabs filter correctly
- [ ] Approve action mutates the store and decrements sidebar badge
- [ ] Reject requires a reason; submit disabled until reason filled
- [ ] Drill drawer shows all approval metadata cleanly
- [ ] Approved/rejected items fade out after 2s and move to a "recent actions" section at bottom

---

### 12.4 Facilities & map — `/cmo/facilities`

**Purpose:** List + grid view of all 142 facilities.

**Layout:**

1. **Page header** — "Facilities & map" + subtitle "142 facilities in Bhopal district"

2. **View toggle** — "List · Grid · Map" (Map is decorative, show a styled district outline with pins)

3. **Filter bar:**
   - Facility type: All · DH (1) · CH (2) · CHC (8) · PHC (52) · SHC/HWC (79)
   - Block: All · Bhopal Urban · Berasia · Phanda · Bairagarh · Kolar
   - Status: All · OK · Watch · Warning · Critical
   - Search box (name)

4. **List view:**
   - Table: Name, Type, Block, Status (colored dot), Beds (used/total), OPD today, IPD today, NQAS score, Last visited, Alerts count, Actions
   - Sortable
   - Click row → drill drawer with full facility view

5. **Drill drawer for facility:**
   - Header: Name, type, block
   - 4 metric tiles: Beds (47/60), OPD today (218), IPD census (39), Active alerts (3)
   - Tabs: Overview · Beds · Stock · Staff · Recent incidents · Map
   - Actions: "Open in live ops board", "Schedule field visit", "Brief Collector"

**Mock data shape:**
```typescript
interface Facility {
  id: string;
  name: string;
  type: 'DH' | 'CH' | 'CHC' | 'PHC' | 'SHC' | 'HWC';
  block: string;
  status: 'ok' | 'watch' | 'warning' | 'critical';
  beds: { used: number; total: number };
  opdToday: number;
  ipdCensusToday: number;
  nqasScore: number | null;
  lastVisited: string;       // ISO date or null
  alertsCount: number;
  population: number;
  staffCount: number;
}
```

**Seed:** Generate 142 facilities. Make Hamidia DH always critical; CHC Berasia warning; PHC Phanda warning; others mixed.

**Acceptance:**
- [ ] 142 rows render without lag
- [ ] Filters combine correctly
- [ ] Drill drawer tabs all populated
- [ ] List/Grid/Map toggle works (Map view shows a stylized SVG district outline with pins at approximate positions)

---

### 12.5 Bed network — `/cmo/beds` ★ DEMO STAR

**Purpose:** District-wide live bed map.

**Layout:**

1. **Page header** — "Bed network" + subtitle "Live bed status across 142 facilities · updated 12s ago"

2. **Summary strip** — 5 tiles:
   - Total beds: 2,847
   - Occupied: 2,103 (74%)
   - ICU beds (used/total): 78/89
   - Ventilators (used/total): 41/52
   - Isolation (used/total): 12/24

3. **Facility × Ward type matrix** — main feature:
   - Rows: top facilities (DH, CH, top CHCs — about 15 rows)
   - Columns: General · ICU · NICU · Ventilator · Isolation · Pediatric · Maternity
   - Cells: colored fill (green/amber/red based on % occupied) showing "47/60"
   - Click cell → bed-level drill showing each bed (P-001, P-002, etc.) with patient status

4. **AI suggestion banner** (if any facility critical):
   - "Hamidia ICU 94% full. AI suggests transferring 3 stable patients to JK Hospital (private, empanelled) — 6 km away. Approve transfers?"
   - Buttons: "Review suggestion" · "Dismiss"

5. **Bottom: Inter-facility transfer history** — last 10 transfers, with from → to, time, status

**Mock data shape:**
```typescript
interface BedNetworkSummary {
  totalBeds: number;
  occupied: number;
  byType: Record<WardType, { used: number; total: number }>;
  perFacility: Array<{
    facilityId: string;
    facilityName: string;
    wards: Record<WardType, { used: number; total: number; beds: Bed[] }>;
  }>;
  aiSuggestion?: { from: string; to: string; reason: string; patients: number };
  recentTransfers: Transfer[];
}

interface Bed {
  id: string;
  number: string;
  status: 'free' | 'occupied' | 'cleaning' | 'reserved' | 'out-of-service';
  patientId?: string;
  patientName?: string;
  admittedAt?: string;
}
```

**Interactions:**
- Click matrix cell → modal with bed-by-bed list. Each bed shows status, patient (if occupied), admit date.
- Click "Reserve" on a free bed → mini form to assign incoming patient → on submit, bed turns yellow (reserved) and the AI suggestion banner refreshes
- Live update: every 30s, randomly change 1–2 bed states (a free becomes occupied, etc.) — gives demo a "live" feel
- "Review suggestion" → opens drill with full transfer plan + Approve / Modify / Dismiss

**Acceptance:**
- [ ] Matrix renders for 15 facilities × 7 ward types
- [ ] Color coding clearly readable
- [ ] Click cell opens bed-level detail
- [ ] AI suggestion banner appears when ICU > 90%
- [ ] Live bed status changes visible within first 60 seconds of opening the page
- [ ] Reserve action updates matrix immediately

---

### 12.6 Ambulance command — `/cmo/ambulance` ★ DEMO STAR

**Purpose:** Live ambulance fleet + pre-arrival pipeline.

**Layout:**

1. **Page header** — "Ambulance command" + subtitle "23 vehicles · 8 active · live tracking"

2. **Summary row** — 4 tiles:
   - Active ambulances: 8
   - En route to facility: 3
   - At incident: 2
   - Returning to base: 3

3. **Active ambulance cards** — main feature, 3 prominent cards (the en-route ones), each showing:
   - **Header:** Vehicle ID + driver name + 108/102 badge
   - **Patient panel:** Name (or "Unknown"), Age, Gender, ABHA ID (or "—"), chief complaint
   - **Vitals strip:** HR, BP, SpO2, Temp — live-updating mini sparklines
   - **ETA:** "22 min to Hamidia DH" with map placeholder
   - **AI prediction:** "Likely diagnosis: Acute MI (87% confidence)"
   - **Receiving facility status:** "Specialist paged · Bed reserved · OT prep started"
   - **Action buttons:** "Re-route" · "Page specialist" · "View full record"

4. **Other ambulances list** — compact rows for the remaining 5 (at incident / returning)

5. **Today's dispatches log** — bottom: chronological list of 30+ trips today, with outcome

**Mock data shape:**
```typescript
interface Ambulance {
  id: string;
  vehicleNumber: string;       // 'MP-04-AMB-2341'
  service: '108' | '102' | 'private';
  driver: { name: string; phone: string };
  emt: { name: string; certificationLevel: string };
  status: 'idle' | 'dispatched' | 'at-incident' | 'en-route-facility' | 'returning';
  currentLocation: { lat: number; lng: number; address: string };
  destinationFacility?: { id: string; name: string };
  etaMinutes?: number;
  patient?: {
    name?: string;
    age?: number;
    gender?: 'M' | 'F' | 'O';
    abhaId?: string;
    chiefComplaint: string;
    vitals: { hr: number; bp: string; spo2: number; temp: number; lastUpdated: string };
  };
  aiPrediction?: { diagnosis: string; confidence: number; specialty: string };
  receivingFacilityStatus?: {
    specialistPaged: boolean;
    bedReserved: boolean;
    bedId?: string;
    otPrepStarted: boolean;
  };
  dispatchedAt: string;
}
```

**Seed (8 active vehicles, 3 with full patient data):**
1. AMB-2341 — chest pain, 58M, ETA 22 min Hamidia DH, AI: Acute MI 87%
2. AMB-1872 — RTA polytrauma, 34M, ETA 14 min Hamidia DH, AI: Polytrauma 92%
3. AMB-3019 — labor pains, 27F, ETA 9 min CHC Berasia, AI: Active labor 95%
4. AMB-2245 — at incident, fall from height, 45M
5. AMB-1640 — at incident, unconscious, 60F
6. AMB-2870 — returning to base (Bairagarh)
7. AMB-3128 — returning to base (Berasia)
8. AMB-1190 — returning to base (Phanda)

**Interactions:**
- Click ambulance card → full-screen drill view with:
  - Detailed patient panel
  - Vitals graphs (last 10 minutes — fake mini line charts)
  - Past medical history (from ABHA mock pull)
  - Receiving facility prep checklist
  - Re-route dropdown (lists other facilities with capability for this case)
  - Specialist paging confirmation
- "Re-route" → modal with 3 alternative facilities ranked by AI (distance + capability + bed availability) → confirm → ambulance card updates with new ETA and new facility
- Vitals tick every 5 seconds (random small +/- changes)
- ETA decrements every 30 seconds for en-route vehicles
- When ETA reaches 0 → card shows "Arrived" briefly, then disappears

**Acceptance:**
- [ ] 8 active ambulance cards visible
- [ ] 3 cards have full patient panel + vitals + AI prediction
- [ ] Vitals update every 5s (small fluctuations)
- [ ] ETA decrements every 30s
- [ ] Click card opens full drill view
- [ ] Re-route action works and updates the card

---

### 12.7 Emergency mode — `/cmo/emergency`

**Purpose:** Mass casualty / disaster command.

**Layout:**

1. **Page header** — "Emergency mode" + subtitle "Mass casualty incident response"

2. **Big "Activate" panel** (when not active):
   - Title: "No active emergency"
   - Subtext: "Activate MCI mode to coordinate district-wide response"
   - Three big buttons: "Mass casualty (RTA)" · "Disaster (flood/quake)" · "Outbreak surge"
   - Each click → activates mode with template config

3. **Active emergency view** (when active):
   - Banner: "MCI MODE ACTIVE · activated 14 min ago"
   - **Resource mobilization grid:**
     - Beds available now: 247
     - Surge beds activated: 0 → buttons to "Activate +50"
     - Blood units available: 89 O-neg / 47 A+ / etc.
     - OTs available: 3 of 5
     - Surgeons on-call: 4 (with phone numbers)
     - Ventilators: 11 free
   - **Staff recall panel:** "Page all surgeons", "Recall all ICU nurses" buttons → shows acknowledgement count
   - **Casualty intake form:** simple form to log arriving casualties, with triage level
   - **Triage board:** live list of casualties with triage level color
   - **Inter-district request panel:** "Request resources from neighboring district" → drafts a message to State

**Seed:** Default to "no active emergency"; clicking activation shows the active mode.

**Acceptance:**
- [ ] Activation flow works end-to-end
- [ ] Once active, all panels are visible and interactive
- [ ] Triage board updates when casualty added via form

---

### 12.8 Staff & attendance — `/cmo/staff`

**Purpose:** District workforce dashboard.

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - Total staff: 2,847
   - Present today: 2,431 (85.4%)
   - AWOL: 12
   - On leave: 197
   - Vacancies: 207 of 3,054 sanctioned

3. **Tabs:** All · Doctors · Nurses · Paramedics · Admin · ASHA/ANM

4. **Staff table:** Name, role, facility, attendance today (✓ Present / ✗ Absent / L Leave / A AWOL), OPD count (this month), complaints, last 7-day attendance dots

5. **Right sidebar — AWOL list** — 12 staff with photos and "Demand explanation" button

**Interactions:**
- Click row → drill with full profile: photo, HPR-ID, qualification, posting history, last 30-day attendance calendar, OPD/surgery counts, complaints, performance scorecard
- "Demand explanation" → sends mock notification, logs in audit

**Acceptance:**
- [ ] Table renders 50+ rows
- [ ] Tabs filter correctly
- [ ] Drill view fully populated
- [ ] AWOL action logs to audit

---

### 12.9 Postings & escalations — `/cmo/postings`

**Layout:**

1. **Page header** + summary tiles: Vacancies 207 · Pending transfers 8 · BMO escalations 4 (aged)

2. **Tabs:** Vacancies · Pending transfers · BMO escalations · Staff grievances

3. **Each tab shows a list with relevant action buttons.**

**Mock data shape (escalation):**
```typescript
interface BmoEscalation {
  id: string;
  from: { name: string; facility: string; role: string };
  issue: string;
  severity: 'low' | 'medium' | 'high';
  raisedAt: string;
  ageHours: number;
  slaBreached: boolean;
  status: 'open' | 'in-progress' | 'resolved';
}
```

**Acceptance:**
- [ ] 4 tabs functional
- [ ] At least 4 escalations seeded, 2 SLA-breached (red)
- [ ] Resolve action works

---

### 12.10 Surveillance & outbreaks — `/cmo/surveillance` ★

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - Notifiable diseases this week: 247
   - Active outbreaks: 1
   - Weekly returns submitted: ✓
   - National sync: ✓

3. **Active outbreak panel** — Dengue cluster, Bhopal urban wards 14/17/19:
   - Severity badge
   - Map placeholder showing affected wards
   - Cases: 47 (3.2× baseline)
   - Days active: 4
   - Containment actions taken (checklist with progress)
   - Runbook button: "Activate dengue response runbook"

4. **Disease surveillance table** — all notifiable diseases this week with counts, change, trend sparkline

5. **IDSP/IHIP submission status** — when last submitted, queued for next

**Acceptance:**
- [ ] Outbreak panel renders with containment checklist
- [ ] Runbook activation opens modal with stepped actions
- [ ] Disease table sortable

---

### 12.11 MCH & immunization — `/cmo/mch`

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - MMR (district, per lakh): 152
   - IMR (district): 41
   - Institutional delivery %: 91
   - JSY payments pending: 23

3. **Tabs:** ANC register · PNC · High-risk pregnancies · Deliveries · Immunization due-list · JSY payments

4. **Each tab has its own table with relevant columns.**

**Acceptance:**
- [ ] All 6 tabs render with at least 10 rows each
- [ ] Pay JSY action works (moves row to "paid")

---

### 12.12 Disease programs — `/cmo/disease-programs`

**Layout:**

1. **Page header**

2. **Tabs:** TB (Nikshay) · NCD screening · Tribal/Sickle cell · Vector-borne (malaria/dengue/chikungunya)

3. **Each tab has its own dashboard:**
   - TB: notifications, treatment success, defaulters, Ni-kshay Mitra count
   - NCD: 30+ screened, hypertension/diabetes positive, follow-up due
   - Tribal: sickle cell screened, anemia, malnutrition (visible only if district is tribal — Bhopal is not, so show "Not applicable for this district" with a switch to demo data)
   - Vector-borne: fever clinic count, RDT positivity, fogging dispatched

**Acceptance:**
- [ ] 4 tabs render distinct content
- [ ] Tribal tab gracefully handles non-tribal district

---

### 12.13 PM-JAY & schemes — `/cmo/schemes`

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - PM-JAY claims today: 47
   - PM-JAY ₹ approved: ₹4.2 Cr
   - Pre-auth pending: 12
   - Fraud flagged: 2

3. **Tabs:** PM-JAY · Sambal · JSY · RBSK · Free drug & diagnostic · Fraud

4. **Tables under each tab with claim/coverage data**

5. **Fraud tab:** AI-flagged patterns with severity and "Suspend empanelment" action

**Acceptance:**
- [ ] All tabs render
- [ ] Fraud action works (logs to audit)

---

### 12.14 Drugs & supply — `/cmo/supply`

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - Critical drugs at risk (14-day): 23 facilities
   - Stock-out current: 3 facilities
   - Pending indents to MPPHSCL: 8
   - Expiring in 30 days: ₹47L worth

3. **Tabs:** Stock status · Indents · Inter-facility transfers · Expiry alerts

4. **Stock status:** Matrix view by critical drug × facility, color-coded
5. **Indents:** Standard list with status flow (draft → raised → dispatched → delivered)
6. **Transfers:** AI suggestions ("Move 200 oxytocin vials from PHC Phanda to CHC Berasia") with approve/dismiss
7. **Expiry:** Sortable list with redistribute option

**Acceptance:**
- [ ] Stock matrix renders for 20 critical drugs × top 15 facilities
- [ ] Approve transfer suggestion works
- [ ] Raise indent button opens form

---

### 12.15 Equipment & AMC — `/cmo/equipment`

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - Total major equipment: 247
   - Operational: 231 (93%)
   - Down: 16
   - AMC expiring (30 days): 12

3. **Table:** Equipment name, facility, status, last service, AMC vendor, AMC expiry, downtime hours (this month), escalate button

**Acceptance:**
- [ ] Table renders 30+ items
- [ ] Escalate action logs

---

### 12.16 Quality, incidents, deaths — `/cmo/quality`

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - NQAS-certified facilities: 18 of 142
   - Open incidents: 14
   - Pending death audits: 5
   - Patient satisfaction (avg): 4.1/5

3. **Tabs:** NQAS/Kayakalp/LaQshya · Incidents · Death audits · Patient satisfaction

4. **Each tab has its own list/dashboard.**

5. **Death audit detail:** Maternal/infant death cases with audit status, family contact log, RCA outcome

**Acceptance:**
- [ ] 4 tabs render
- [ ] Open incident drill shows full RCA
- [ ] Death audit case shows timeline

---

### 12.17 RTI & grievances — `/cmo/grievances`

**Layout:**

1. **Page header**

2. **Summary tiles:**
   - RTI applications pending: 7
   - Grievances open: 23
   - SLA breached: 3

3. **Tabs:** RTI · Citizen grievances · Internal grievances

4. **Each has list + drill view**

**Acceptance:**
- [ ] All tabs functional
- [ ] Respond action drafts a reply

---

### 12.18 Field visits — `/cmo/field-visits`

**Layout:**

1. **Page header**

2. **Tabs:** My visits · Scheduled · Surprise inspections

3. **Map view of visited vs unvisited facilities** (color-coded)

4. **Visits table:** facility, date, findings summary, follow-up actions

5. **"Start surprise inspection" button** → opens a mock geo-locked form with "Capture photo" placeholder buttons

**Acceptance:**
- [ ] Visit log renders
- [ ] Start inspection flow works (form submits and logs)

---

### 12.19 Reports & returns — `/cmo/reports`

**Layout:**

1. **Page header**

2. **Auto-submit calendar:** monthly HMIS, weekly IHIP, RCH sync, U-WIN sync, Nikshay — with last submitted date and next due

3. **Each report card:** "View draft", "Sign & submit", history

4. **Custom report builder** stub: simple filter form, "Generate" button → mock PDF download

5. **PIP utilization dashboard:** activity-wise spend vs budget

6. **Collector brief generator:** "Generate today's brief" → mock 1-pager preview

**Acceptance:**
- [ ] All standard reports show with realistic next-due dates
- [ ] Sign & submit action works (with mock signature)
- [ ] Collector brief generator returns a 1-pager preview

---

### 12.20 Communication — `/cmo/communication`

**Layout:**

1. **Page header**

2. **Tabs:** Broadcast · Video conference · Escalate to state

3. **Broadcast:** Compose form (recipients: by facility group / role / individual), message, send → confirmation modal with delivery status

4. **VC:** "Start instant VC" button (logs mock), scheduled VCs list

5. **Escalate to state:** Compose form with "What's escalating" + supporting data + recipient (PS Health / Mission Director)

**Acceptance:**
- [ ] Broadcast composer works
- [ ] Escalation form submits and shows mock "Sent to PS Health"

---

### 12.21 AI assistants — `/cmo/ai-assistants`

**Layout:**

1. **Page header** + subtitle "AI tools to assist your day"

2. **Assistant cards (4):**
   - **8 AM Hindi brief** — last brief preview, "Generate now" button
   - **Outbreak predictor** — current predictions (1 amber, 0 red), confidence scores
   - **Stock-out forecaster** — 14-day forecast view by facility/drug
   - **Press brief drafter** — text input "What event?" → AI drafts (mock — paste a pre-canned response)

**Interactions:**
- Each card has "Open" button that expands the full assistant in a drawer
- Press drafter accepts a prompt and returns a mock-generated paragraph after 2s spinner

**Acceptance:**
- [ ] All 4 cards open their assistant
- [ ] Press drafter returns a relevant paragraph for the input

---

### 12.22 Settings — `/cmo/settings`

**Layout:**

Simple form with sections:
- Notification preferences (channels per event type)
- Language (English / Hindi / Both — currently Both)
- Alert thresholds (e.g., O₂ alert at < N hours)
- Delegation rules (deputy CMO when I'm away)
- Time zone

All controls visible, save button shows toast (no real persistence needed).

**Acceptance:**
- [ ] All settings visible
- [ ] Save button works (toast confirmation)

---

### 12.23 Audit log — `/cmo/audit-log`

**Layout:**

1. **Page header**

2. **Filter bar:** Date range · Action type · User · Facility

3. **Audit table:** Timestamp, User, Action, Target, Details, IP (mock)

4. **Export button** (logs to console)

**Seed:** 50 audit entries spanning the last 7 days (alerts acknowledged, approvals signed, transfers initiated, etc.)

**Acceptance:**
- [ ] 50 entries render
- [ ] Filters work
- [ ] As actions are taken elsewhere in the cockpit, new entries appear here

---

### 12.24 Profile — `/cmo/profile`

**Layout:**

1. **Page header**

2. **Profile card:** Avatar (initials RS in circle), name (EN + HI), designation, district, joining date, HPR-ID (mock), contact

3. **Delegation:** Current deputy, "Set deputy" button

4. **Activity summary:** Logins this month, decisions taken, average response time

5. **Read-only** for this demo (no editing).

**Acceptance:**
- [ ] Profile renders with all data
- [ ] Delegation visible

---

## 13. Cross-screen interactivity behaviors

### Live updates
- **Alerts:** new alert pushed every 90s via simulator. Plays a subtle sound (optional — disabled by default). Sidebar badge increments. If user is on `/cmo` or `/cmo/alerts`, new row appears at top with brief pulse animation.
- **Bed network:** 1–2 random bed state changes every 30s.
- **Ambulance ETA:** decrements every 30s.
- **Ambulance vitals:** small fluctuations every 5s.

### Toasts
On any user action that succeeds, show a brief toast top-right:
- "Approved · audit log updated"
- "Alert acknowledged"
- "Transfer initiated"
- "Brief drafted"

### Audit log auto-update
Every action taken in the cockpit appends a row to the audit log store.

### Language toggle
Top bar has a "EN | हिं" toggle. When set to हिं, primary text labels switch to Hindi, English appears as subtitle. (Stretch: only required to toggle headers and section titles, not entire pages.)

---

## 14. Demo script for tomorrow

The 90-second core flow to rehearse:

1. **Open the URL.** Land on dev login. Click "CMO — Bhopal."
2. **Home loads.** Pause. Let the Minister see the Hindi brief. Read the first line aloud: "कल रात OPD में 4,127 मरीज..."
3. **Hand over the tablet.**
4. **Tap the oxygen alert** in Critical alerts. The drill drawer opens. Show the timeline tab. Show recommended actions. Tap "Acknowledge." The sidebar badge goes from 7 → 6.
5. **Tap Bed network** in sidebar. The bed matrix loads. Show ICU red zones. The AI suggestion banner is visible. Tap "Review suggestion." Show the transfer plan.
6. **Tap Ambulance command.** Show the 3 active ambulance cards. Vitals tick. ETA counts down. Tap one card. Show the full patient panel and the AI diagnosis.
7. **Tap Approvals.** Tap "Approve" on the oxytocin indent. Count goes from 12 → 11.
8. **Tap AI assistants.** Show the 4 cards. Tap "Press brief drafter." Type "Maternal death CHC Berasia." Wait 2 seconds. Show the AI-drafted paragraph.
9. **Tap District ranking** sneak peek (if added — otherwise skip).
10. **Return to Home.** Point at the live indicator. "Everything you just saw, sir, was live."

Rehearse this twice tonight. Time it. It should run in 90–120 seconds, leaving 3+ minutes for the Minister to explore on his own.

---

## 15. Acceptance checklist (must all pass before demo)

### Build hygiene
- [ ] Builds clean with no TS errors
- [ ] No console errors during the demo flow
- [ ] No "TODO" or "Lorem ipsum" visible anywhere
- [ ] All 24 routes resolve to a populated screen (no 404, no "coming soon")

### Visual quality
- [ ] Sidebar correctly grouped per §11
- [ ] Tabler icons used consistently (no emoji)
- [ ] Hindi text renders correctly in Devanagari
- [ ] Severity colors consistent across screens
- [ ] Tables and cards align to a consistent grid

### Interactivity (demo-critical)
- [ ] Acknowledge alert → badge decrements
- [ ] Approve item → counter decrements
- [ ] Drill drawer opens and closes smoothly
- [ ] Live simulator pushes alerts at expected interval
- [ ] Ambulance vitals tick visibly
- [ ] Bed status changes visibly

### Performance
- [ ] First contentful paint < 1.5s on Home
- [ ] Navigation between routes < 300ms
- [ ] No layout shifts during data load (use skeletons)

### Resilience
- [ ] All mock API calls have a try/catch — UI handles failure gracefully (show error toast)
- [ ] Demo flow tested end-to-end at least twice without breaks

---

## 16. Out of scope / next sprint

These are explicitly NOT for this build. Park in a Phase 2 list.

- Real backend integration
- Real WebSocket / SSE
- Real Hindi voice playback for AI brief
- Real geo-spatial map with district outline (current: stylized SVG)
- Mobile native app
- Settings persistence to localStorage
- Permission gating per menu item (currently CMO sees everything; later we'll RBAC sub-items)
- Multi-CMO switching (just one persona for now)
- Full audit log search and export
- Profile editing
- Print/export of reports (button stubs only)

---

## 17. Build order recommendation

If you have ~16 hours:

1. **Hour 0–2:** Project scaffolding, layout, sidebar, types, mock api skeleton, role registration
2. **Hour 2–4:** Home screen with AI brief, hero metrics, critical alerts feed, live ops tiles
3. **Hour 4–6:** Alerts screen with full drill + Approvals screen with full drill
4. **Hour 6–8:** Bed network matrix + Ambulance command
5. **Hour 8–10:** Facilities, Staff, Surveillance & outbreaks (3 mid-tier screens)
6. **Hour 10–12:** MCH, Schemes, Supply, Quality (4 mid-tier screens)
7. **Hour 12–14:** Remaining screens (Emergency, Equipment, Grievances, Field, Reports, Comms, AI, Settings, Audit, Profile, Disease programs, Postings)
8. **Hour 14–15:** Live simulator wiring, cross-screen audit log integration, toasts, language toggle
9. **Hour 15–16:** Polish pass — fix visual inconsistencies, write loading states, double-check the demo flow

If time runs short, the order to deprioritize is roughly the reverse of demo importance — Profile, Audit log, Settings, Disease programs, Postings, Equipment, Grievances, RTI, Field visits, Reports, Communication — these can all be 50-line placeholder pages with the correct sidebar entries and headers but minimal content.

---

## 18. Notes for the implementer

1. **Steal from the existing app.** Whatever Zustand, Tailwind, and Next.js patterns are already in use, follow them. Match the existing button style, modal style, form style.
2. **Don't touch existing patient/clinical code.** This is purely additive. New folders, new files.
3. **Use the existing dev login flow.** Don't build a new login screen. Just add CMO as a selectable role.
4. **Mock state must persist across navigation within a session.** Use Zustand for everything. Page reload resets is fine.
5. **The Hindi text is critical.** Get the Devanagari rendering right. Use a system font fallback chain that includes Noto Sans Devanagari.
6. **Make it feel alive.** The single biggest demo win is when the Minister sees a number change while he's looking at the screen. Wire up the live simulator on day one — even if everything else is half-built, a ticking screen impresses.
7. **Console.log everything user-facing.** Whenever a button does nothing real, `console.info('[CMO Demo] User clicked X')`. This is the spec for the next sprint.

Good luck. Build it tight.
