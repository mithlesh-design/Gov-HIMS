"""Generate 03_AppFlow_v1.0.docx — End-to-end application flow per role."""
from pathlib import Path
from _helpers import *


def build(out: Path) -> None:
    doc = new_doc()
    cover(doc, "03 — App Flow", "Application Flow Document",
          "Per-role flows, navigation map, button-level interactions")
    toc(doc)

    h1(doc, "1. Overview")
    p(doc, "This document walks the user journey for every role end-to-end. Each role section "
           "shows: (a) entry point, (b) primary screens, (c) decisions and side-effects, (d) "
           "handover points to other roles. Mermaid diagrams accompany each role.")

    p(doc, "All flows are grounded in the actual routes under src/app/. Where a flow depends on "
           "infrastructure that does not yet exist (real auth, real LLM, payment gateway), the "
           "flow shows the target shape with a gap callout.")

    h1(doc, "2. Common Entry & Login")
    p(doc, "Today the login page lists every role as a card; selecting a card switches the user "
           "into that portal via useAuthStore.setRole(role). The RoleGuard then redirects to the "
           "role's home page. v1.0 replaces this with OIDC login — role membership flows from the "
           "IdP, not from a card click.")
    mermaid(doc, "Login + role gate", """
flowchart TD
    A[/] --> L[Login screen]
    L -->|Pick role / OIDC login| Auth{useAuthStore<br/>role + user}
    Auth --> Guard{RoleGuard<br/>activeRole == allowedRole?}
    Guard -->|yes| Home[Role home<br/>e.g. /doctor/dashboard]
    Guard -->|no| Redirect[redirect to that role's home]
    Auth -- no user --> L
""")

    h1(doc, "3. Global Navigation Map")
    mermaid(doc, "Top-level route tree (subset)", """
flowchart LR
    Login[/]
    Login --> Doctor[/doctor/*]
    Login --> Nurse[/nurse/*]
    Login --> ER[/emergency/*]
    Login --> Pharm[/pharmacy/*]
    Login --> Lab[/lab/*]
    Login --> Rad[/radiology/*]
    Login --> Recep[/reception/*]
    Login --> Bed[/admission/*]
    Login --> Disc[/discharge/*]
    Login --> OT[/ot/*]
    Login --> Bill[/billing/*]
    Login --> Ins[/insurance/*]
    Login --> Admin[/admin/*]
    Login --> Audit[/audit/*]
    Login --> Quality[/quality/*]
    Login --> SupportRoles[/bloodbank · /cssd · /dietary · /bmw · /mortuary · /ambulance · /housekeeping · /inventory/*]
    Login --> Pt[/patient/*]
""")

    page_break(doc)

    # ── DOCTOR ──────────────────────────────────────────────────────────────
    h1(doc, "4. Doctor — OPD Workspace, IPD Command, Online Consult")
    h2(doc, "4.1 Entry")
    p(doc, "Doctor lands on /doctor/dashboard. The dashboard shows: OPD queue (single-row table), "
           "IPD inpatients, online consults, activity graph (Phase 5 build).")
    h2(doc, "4.2 OPD consult flow")
    mermaid(doc, "Doctor OPD consult", """
flowchart TD
    Q[OPD queue<br/>/doctor/dashboard] -->|Open patient| Pt[/doctor/opd/[id]]
    Pt --> Pre[AI Pre-brief renders]
    Pre -->|Accept / dismiss| Hx[History review]
    Hx --> Note[Clinical notes / voice scribe]
    Note --> Rx[Prescription draft]
    Rx -->|Submit| Safety{Drug-safety<br/>allergy · interaction · dose · narcotic}
    Safety -->|all clear| Sign[Rx signed → emits to pharmacy + audit]
    Safety -->|flag| Edit[Edit / accept warning / cancel]
    Sign --> Orders[Investigations / referrals]
    Orders --> Done[Visit completed → bill auto-drafted]
""")
    bullet(doc, "Shift gate: if current time is outside the doctor's shift window and no override-on-call set, the consult ticket loads in read-only.")
    bullet(doc, "Voice scribe: the captured transcript is reviewable and editable before save.")
    bullet(doc, "Every Rx emits a prescription.signed audit event mapped to COP.")

    h2(doc, "4.3 IPD command")
    mermaid(doc, "Doctor IPD action menu", """
flowchart LR
    List[Single-row IPD table] --> Drawer[Patient drawer]
    Drawer --> Actions{Actions menu}
    Actions --> Vitals[Open chart]
    Actions --> AddMed[Add / remove medication]
    Actions --> Order[Order labs / radiology]
    Actions --> Refer[Refer to specialist]
    Actions --> OT[Plan surgery / ICU]
    Actions --> Disch[Initiate discharge]
""")
    bullet(doc, "Comprehensive chart: vitals, MAR, orders, notes, NEWS2 trend, escalations — full-page route /doctor/ipd/[id]/chart.")
    bullet(doc, "Add/remove med triggers drug-safety pre-check; nurse MAR queue updates live.")
    bullet(doc, "Discharge initiation enqueues the 4-pillar clearance for /discharge.")

    h2(doc, "4.4 Online consultation")
    bullet(doc, "/doctor/online — single-row-per-patient with quick vitals, last Rx, message thread.")
    bullet(doc, "Action menu mirrors OPD: open record, send Rx, schedule follow-up.")
    bullet(doc, "Voice / video bridge is via an iframe to the chosen vendor (out of v1 scope).")

    page_break(doc)

    # ── NURSE ──────────────────────────────────────────────────────────────
    h1(doc, "5. Nurse — Ward Dashboard, Rounds, MAR, Handover")
    h2(doc, "5.1 Ward dashboard")
    p(doc, "/nurse/dashboard surfaces: bed map, ward roster, active patients with NEWS2 chips, "
           "alerts (escalations, missed MAR), today's tasks.")
    h2(doc, "5.2 Round flow")
    mermaid(doc, "Nurse round + MAR", """
flowchart TD
    Round[Round on patient] --> Vitals[Capture vitals]
    Vitals --> News{NEWS2 ≥ 5?}
    News -- yes --> Esc[Auto-escalate to doctor + banner]
    News -- no --> MAR[MAR check]
    MAR --> Doses{Doses due now?}
    Doses --> Admin[Administer + audit]
    Doses --> Late[Mark late / refused with reason]
    Admin --> Hand[Continue round]
""")
    bullet(doc, "Sepsis monitor evaluates qSOFA on capture; positive trips escalation.")
    bullet(doc, "Late > 30 minutes flags red on the MAR; missed > 60 minutes emits an incident.")
    h2(doc, "5.3 Handover")
    bullet(doc, "Structured handover brief: SBAR template with AI summary suggestion (HITL).")
    bullet(doc, "Outgoing nurse saves; incoming nurse reads + acknowledges; both audited.")

    page_break(doc)

    # ── ER ────────────────────────────────────────────────────────────────
    h1(doc, "6. Emergency — Triage, Floor, Doctor Allocation")
    h2(doc, "6.1 Arrival → triage")
    mermaid(doc, "ER triage", """
flowchart TD
    Walk[Walk-in / Ambulance arrival] --> Reg[Quick reg]
    Reg --> Triage[Triage queue]
    Triage --> AI[AI ESI suggestion]
    AI --> Pick[Triage nurse picks ESI 1-5]
    Pick --> Floor[Assign bay on /emergency/floor]
    Floor --> Doc[Assign doctor]
    Doc --> Care[Resuscitation / observation]
    Care --> Disp{Disposition}
    Disp --> Admit[Admit → /admission]
    Disp --> Discharge[Discharge from ER]
    Disp --> Transfer[Transfer out]
""")
    bullet(doc, "ESI 1 / 2 → immediate doctor page + bed reservation.")
    bullet(doc, "Bay status (resuscitation / observation / discharged) drives the /emergency/floor view.")
    bullet(doc, "Every disposition emits an audit event mapped to COP / AAC.")

    page_break(doc)

    # ── RECEPTION ─────────────────────────────────────────────────────────
    h1(doc, "7. Reception — OPD Queue, Appointments, Walk-In")
    mermaid(doc, "Reception OPD intake", """
flowchart LR
    Walk[Walk-in / Booked] --> Find{Returning patient?}
    Find -- yes --> Verify[Verify phone OTP / HN]
    Find -- no --> Reg[Quick registration]
    Verify --> Queue[Add to OPD queue]
    Reg --> Queue
    Queue --> Token[Token issued]
    Token --> Pay{Cashless / cash?}
    Pay --> Done[Patient seated → doctor queue]
""")
    bullet(doc, "OPD queue: served / waiting / cancelled. Reception can promote, defer, cancel.")
    bullet(doc, "Appointment booking checks doctor on-shift via useShiftStore.")
    bullet(doc, "Walk-in registration target: ≤ 60 seconds.")

    page_break(doc)

    # ── BED MGR ──────────────────────────────────────────────────────────
    h1(doc, "8. Bed Manager — Admission Requests, Bed Map, Transfers")
    mermaid(doc, "Bed assignment", """
flowchart TD
    Req[Admission request from doctor] --> Q[/admission/dashboard queue]
    Q --> Map[/admission/bed-map]
    Map --> Pick[Pick available bed]
    Pick --> Assign[Assign + send patient]
    Assign --> Hk{Bed needs cleaning?}
    Hk -- yes --> HkQ[/housekeeping/queue]
    Hk -- no --> Done[Patient moved → IPD active]
""")
    bullet(doc, "Inter-ward transfers cascade clinical handover + housekeeping.")
    bullet(doc, "Bed status states: occupied · clean · cleaning · biohazard · out-of-service.")

    page_break(doc)

    # ── PHARMACY ─────────────────────────────────────────────────────────
    h1(doc, "9. Pharmacy — Unified Queue, Dispense, Narcotics")
    mermaid(doc, "Pharmacy unified queue", """
flowchart TD
    Rx[New Rx signed] --> Q[/pharmacy/queue<br/>tags: OPD/IPD/OT/ICU/Discharge]
    Q --> Claim[Pharmacist claims]
    Claim --> Verify[Drug-safety verify]
    Verify --> Substitute{Substitution needed?}
    Substitute -- yes --> Sub[Suggest equivalent → doctor approve]
    Substitute -- no --> Stock{In stock?}
    Stock -- no --> Borrow[Borrow / order]
    Stock -- yes --> Disp[Dispense / bedside]
    Disp --> Mar[Update MAR / billing]
""")
    bullet(doc, "Narcotic dispense routes through a separate register with sign-out trail (audited).")
    bullet(doc, "Discharge dispense merges with the discharge clearance pillar.")

    page_break(doc)

    # ── LAB ───────────────────────────────────────────────────────────────
    h1(doc, "10. Lab — 5-Bench Routing, QC, Verification, Microbiology")
    mermaid(doc, "Lab order lifecycle", """
flowchart TD
    O[Order created] --> Sam[Sample collected]
    Sam --> Route{Routed to bench}
    Route --> Hema[Haematology]
    Route --> Biochem[Biochemistry]
    Route --> Immuno[Immunology]
    Route --> Urine[Urine]
    Route --> Micro[Microbiology]
    Hema --> Run[Run + tech claim]
    Biochem --> Run
    Immuno --> Run
    Urine --> Run
    Run --> QC[QC pass]
    QC --> Verify[Verifier sign-off]
    Verify --> Crit{Critical value?}
    Crit -- yes --> Notify[Notify ordering doctor + nurse]
    Crit -- no --> Release[Release to ward]
""")
    bullet(doc, "Reflex rules add panels automatically (e.g. positive D-dimer → CT-PA suggest).")
    bullet(doc, "Microbiology is multi-day: gram → culture → sensitivities → report. Each step audited.")

    page_break(doc)

    # ── RADIOLOGY ─────────────────────────────────────────────────────────
    h1(doc, "11. Radiology — Inbox → Modality → Reading → Verification")
    mermaid(doc, "Radiology flow", """
flowchart TD
    Order[Imaging order] --> Inbox[/radiology/inbox]
    Inbox --> Mod[Schedule modality]
    Mod --> Acq[Acquire study]
    Acq --> Read[Reading bay]
    Read --> Draft[AI draft (HITL)]
    Draft --> Sign[Radiologist edit + sign]
    Sign --> Out[Release to ordering team + patient portal]
""")
    bullet(doc, "PACS / DICOM viewer link integration is out of v1 — the URI launches a vendor viewer.")

    page_break(doc)

    # ── OT ────────────────────────────────────────────────────────────────
    h1(doc, "12. OT — WHO 2009 Checklist + Pre-Brief + Scheduling")
    mermaid(doc, "OT day-of-surgery", """
flowchart TD
    Plan[Surgery planned] --> Bed[Pre-op bed]
    Bed --> Brief[AI pre-brief: history, allergies, labs, blood]
    Brief --> SignIn[Sign-in (WHO 2009 verbatim)]
    SignIn --> Time[Time-out]
    Time --> Op[Operation]
    Op --> SignOut[Sign-out]
    SignOut --> Recov[Recovery / ICU]
""")
    bullet(doc, "Each of sign-in / time-out / sign-out collects the verbatim WHO 2009 fields and is required to proceed.")
    bullet(doc, "Blood-bank cross-match and CSSD pack readiness are pre-conditions for sign-in.")

    page_break(doc)

    # ── DISCHARGE ─────────────────────────────────────────────────────────
    h1(doc, "13. Discharge — 4-Pillar Clearance + Summary")
    mermaid(doc, "Discharge clearance", """
flowchart TD
    Init[Doctor initiates discharge] --> P1[Pharmacy: unused returns]
    Init --> P2[Billing: final bill cleared]
    Init --> P3[Files: signed papers + documents]
    Init --> P4[Handover: instructions acknowledged]
    P1 --> Gate{All four green?}
    P2 --> Gate
    P3 --> Gate
    P4 --> Gate
    Gate -- yes --> Disch[Discharge confirmed]
    Disch --> Sum[AI summary draft → doctor HITL]
    Sum --> Out[Discharge documents to patient portal + GP]
""")
    bullet(doc, "Bills freeze on discharge approval; reopening requires freeze-override.")
    bullet(doc, "Discharge summary is an AI suggestion; the doctor must accept / modify.")

    page_break(doc)

    # ── BILLING ─────────────────────────────────────────────────────────
    h1(doc, "14. Billing — Itemisation, Payer Routing, Refunds")
    mermaid(doc, "Bill lifecycle", """
flowchart LR
    Visit[Visit / IPD stay] --> Lines[Line items auto-populated<br/>orders · drugs · bed · procedures]
    Lines --> Payer{Payer type}
    Payer --> Cash[Cash → /billing direct]
    Payer --> Corp[Corporate → routing]
    Payer --> Ins[Insurance → /insurance pre-auth]
    Cash --> Pay[Payment captured]
    Corp --> Inv[Invoice issued]
    Ins --> Claim[Claim submitted]
    Pay --> Receipt[Receipt + audit]
    Inv --> Receipt
    Claim --> Tpa[TPA processing]
""")
    bullet(doc, "Duplicate-charge AI runs on every save; red flags block submit until reviewed.")
    bullet(doc, "Refund requires two-step approval (Billing → Finance Head).")

    page_break(doc)

    # ── INSURANCE ─────────────────────────────────────────────────────────
    h1(doc, "15. Insurance — Pre-Auth & Claim Lifecycle")
    mermaid(doc, "Insurance flow", """
flowchart TD
    Need[Cashless required] --> Pre[Pre-auth drafted]
    Pre --> Risk[AI denial-risk score]
    Risk --> Justify[AI draft justification (HITL)]
    Justify --> Send[Pre-auth sent to TPA]
    Send --> Resp{Response}
    Resp -- Approved --> Treat[Treatment proceeds]
    Resp -- Queries --> Reply[Reply with docs / clarification]
    Resp -- Rejected --> Esc[Escalate / appeal]
    Treat --> Claim[Final claim on discharge]
    Claim --> Decision{Settlement}
    Decision -- accept --> Done[Reconciled]
    Decision -- deny --> Appeal[Appeal queue]
""")
    bullet(doc, "Denial-risk ≥ 0.7 surfaces guidance and requires sign-off before sending.")

    page_break(doc)

    # ── ADMIN ─────────────────────────────────────────────────────────────
    h1(doc, "16. Admin (COO) — Command Centre")
    h2(doc, "16.1 Dashboard")
    p(doc, "/admin/dashboard surfaces Hospital Analytics with widgets: P&L summary, "
           "coverage status, cash position, compliance status, AI performance, vendor MoUs, "
           "open finance disputes.")
    h2(doc, "16.2 Staff lifecycle")
    mermaid(doc, "Admin staff lifecycle", """
flowchart LR
    Dir[/admin/users<br/>Directory] --> Drawer[StaffProfileDrawer]
    Drawer --> Cred[/admin/credentials<br/>licence expiry]
    Drawer --> Roster[/admin/roster]
    Roster --> Hours[/admin/hours]
    Roster --> OnCall[/admin/on-call]
    Cred --> Onboard[Onboarding wizard]
""")
    h2(doc, "16.3 Shifts and coverage")
    bullet(doc, "Roster: 4-week grid, drag-and-drop, conflict engine, templates.")
    bullet(doc, "Coverage: configurable per-dept minimums; gauges; sick-call workflow; auto-escalation watcher.")
    bullet(doc, "On-call: rotation suggested then locked on manual override.")
    h2(doc, "16.4 Finance command")
    bullet(doc, "/admin/finance — P&L, revenue reconciliation, cash position, payroll preview, vendor payments.")
    bullet(doc, "/admin/disputes — billing disputes queue with resolution actions.")
    h2(doc, "16.5 Compliance command")
    bullet(doc, "/admin/compliance — overall score + 5 streams (NABH, DISHA, Statutory, MoUs, BMW).")
    bullet(doc, "/admin/disha — record-access log, RTBF queue, breach attestation.")
    bullet(doc, "/admin/statutory — PF / ESI / GST / TDS / PT calendar with File action.")

    page_break(doc)

    # ── AUDIT / QUALITY ───────────────────────────────────────────────────
    h1(doc, "17. Audit Officer & Quality")
    bullet(doc, "/audit/trail — module / role / actor / patient / date filters; export CSV.")
    bullet(doc, "/audit/nabh — chapter-wise evidence pack export.")
    bullet(doc, "/quality/incidents — file incident → investigate → CAPA → close.")
    bullet(doc, "/quality/dashboard — open incidents, CAPA velocity, near-miss trends.")

    h1(doc, "18. Support Roles (Compact)")
    table(doc, ["Role", "Flow at a glance"],
          [
              ["Blood Bank",   "Cross-match → bedside check → issue → traceability + recall"],
              ["CSSD",         "Receipt → wash → pack → autoclave (BI gate) → distribute"],
              ["Dietary",      "Diet plan → meal order → tray dispatch → return"],
              ["BMW",          "Segregation → barcode → store → handover to CPCB vendor"],
              ["Mortuary",     "Body in → MLC checks → certificate → handover"],
              ["Ambulance",    "Dispatch → on-scene → ER pre-notify → trip log"],
              ["Housekeeping", "Bed-free trigger → clean → mark ready → bed-manager pickup"],
              ["Inventory",    "Drug master, vendor PO, stock receipts, expiry sweeps"],
          ],
          col_widths_cm=[3.5, 13.5])

    page_break(doc)

    # ── PATIENT ───────────────────────────────────────────────────────────
    h1(doc, "19. Patient Portal")
    mermaid(doc, "Patient portal", """
flowchart LR
    Home[/patient/dashboard] --> Vits[Vitals + active visits]
    Home --> Lab[/patient/lab]
    Home --> Rad[/patient/radiology]
    Home --> Ipd[/patient/ipd]
    Home --> Disc[/patient/discharge]
    Home --> Msg[/patient/messages]
    Home --> Fb[/patient/feedback]
    Home --> Fam[/patient/family-track]
""")
    bullet(doc, "Lab/radiology results visible only after verifier sign-off.")
    bullet(doc, "Family-track is read-only and consented by the patient.")
    bullet(doc, "Messaging shares the unified messaging bus with staff (useMessagingStore).")

    h1(doc, "20. Cross-Role Handovers")
    table(doc, ["From → To", "Trigger", "Carries"],
          [
              ["Reception → Doctor",      "Queue served",                  "Patient summary + intake form"],
              ["Doctor → Pharmacy",       "Rx signed",                     "Drugs + safety-cleared envelope"],
              ["Doctor → Lab",            "Lab order",                     "Patient, panel, urgency, indication"],
              ["Doctor → Radiology",      "Imaging order",                  "Patient, modality, clinical question"],
              ["Doctor → Bed Mgr",        "Admission request",              "Patient, ward, urgency, dx"],
              ["Bed Mgr → Nurse",         "Bed assigned",                  "Patient, bed, nursing plan"],
              ["Nurse → Doctor",          "NEWS2 escalation",              "Vitals trend, time-stamped"],
              ["Doctor → Discharge",       "Discharge initiated",          "Patient, plan, follow-up"],
              ["Pharmacy → Discharge",     "Returns processed",              "Unused-drug summary"],
              ["Billing → Discharge",      "Bill cleared",                  "Receipt"],
              ["Discharge → Housekeeping", "Bed free",                       "Bed, contamination flag"],
              ["OT → ICU/Ward",            "Sign-out",                       "Op summary, post-op orders"],
              ["Insurance → Billing",      "Pre-auth approved / denied",    "Amount, conditions"],
              ["Quality ↔ All",            "Incident filed",                "Incident, CAPA tasks"],
          ],
          col_widths_cm=[5.0, 5.0, 7.0])

    h1(doc, "21. Notifications & Messaging")
    bullet(doc, "useNotificationStore — bell + toast across staff portals; persisted.")
    bullet(doc, "useMessagingStore — inbox shared by staff + patient portal.")
    bullet(doc, "WhatsApp Business API — outbound (appointment reminders, OTPs) + inbound webhook.")

    h1(doc, "A. Version History")
    table(doc, ["Version", "Date", "Author", "Notes"],
          [["v1.0", DOC_DATE, AUTHOR, "Initial issue covering every role end-to-end"]],
          col_widths_cm=[2.0, 3.0, 4.5, 7.5])

    save(doc, out)


if __name__ == "__main__":
    build(Path(__file__).parent / "03_AppFlow_v1.0.docx")
