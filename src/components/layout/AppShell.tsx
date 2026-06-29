"use client"

import { usePathname, useRouter } from "next/navigation"
import Link from "next/link"
import { motion, AnimatePresence, useReducedMotion } from "framer-motion"
import {
  Activity, BarChart3, Bell, Calendar, ClipboardList, ClipboardCheck,
  FileText, Home, LogOut, Settings, Users, Stethoscope,
  LayoutDashboard, Receipt, UserCog, Workflow, Bot,
  FlaskConical, Pill, Search, PanelLeftClose, PanelLeft,
  Package, CheckCircle, ShieldCheck, Microscope, ScanLine, Ambulance, X,
  BedDouble, Scissors, CreditCard, Trash2, HeartPulse,
  Droplets, Utensils, Truck, Heart, BookOpen, AlertTriangle, ShieldAlert,
  Sparkles, ChevronRight, MessageSquare, MessageSquarePlus, Video, Siren, Menu, ShoppingCart, Send,
  List, Star, Building2, ArrowLeftRight, MapPin, Baby, Bug,
  Droplet, Cpu, SlidersHorizontal, RefreshCw, UserPlus,
} from "lucide-react"
import { useAuthStore, type Role } from "@/store/useAuthStore"
import { usePatientStore } from "@/store/usePatientStore"
import { useInpatientStore } from "@/store/useInpatientStore"
import { useNotificationStore } from "@/store/useNotificationStore"
import { Avatar } from "@/components/ui/avatar"
import { LocaleToggle } from "@/components/ui/LocaleToggle"
import { CommandPalette, CommandPaletteTrigger } from "@/components/layout/CommandPalette"
import { CriticalValueBanner } from "@/components/clinical/CriticalValueBanner"
import { useState, useEffect } from "react"
import { cn } from "@/lib/utils"

type NavItem = { href: string; label: string; icon: React.ElementType }

const PATIENT_SECTIONS: { header: string; items: NavItem[] }[] = [
  { header: 'Care', items: [
    { href: '/patient/dashboard',    label: 'Dashboard',       icon: Home },
    { href: '/patient/ai-care',      label: 'AI Care',         icon: Sparkles },
    { href: '/patient/health-story', label: 'My Health Story', icon: Activity },
  ] },
  { header: 'Consultations', items: [
    { href: '/patient/consultations', label: 'My Consultations', icon: Calendar },
    { href: '/patient/orders',        label: "Doctor's Orders",  icon: ClipboardList },
  ] },
  { header: 'Hospital Services', items: [
    { href: '/patient/emergency',  label: 'Emergency Visits', icon: Siren },
    { href: '/patient/ipd',        label: 'IPD / Admission', icon: BedDouble },
    { href: '/patient/discharge',  label: 'My Discharge',    icon: CheckCircle },
    { href: '/patient/pharmacy',   label: 'Pharmacy',        icon: Pill },
    { href: '/patient/pathology',  label: 'Pathology',       icon: FlaskConical },
    { href: '/patient/radiology',  label: 'Radiology',       icon: ScanLine },
    { href: '/patient/blood-bank', label: 'Blood Bank',      icon: Droplets },
    { href: '/patient/ambulance',  label: 'Ambulance',       icon: Truck },
  ] },
  { header: 'Records & Billing', items: [
    { href: '/patient/downloads', label: 'Download Center', icon: FileText },
    { href: '/patient/billing',   label: 'Billing',         icon: Receipt },
    { href: '/patient/insurance', label: 'Insurance',       icon: ShieldCheck },
  ] },
  { header: 'Experience', items: [
    { href: '/patient/feedback', label: 'Feedback', icon: MessageSquarePlus },
  ] },
  { header: 'Account', items: [
    { href: '/patient/followup', label: 'Care & Follow-up',  icon: HeartPulse },
    { href: '/patient/profile',  label: 'Profile & Privacy', icon: UserCog },
    { href: '/patient/help',     label: 'Help & Emergency',  icon: AlertTriangle },
  ] },
]

// Reception = front-desk command center. Owns the front-desk workflow;
// surfaces read-only "visibility" windows into other modules; shared utilities.
const RECEPTION_SECTIONS: { header: string; items: NavItem[] }[] = [
  { header: 'Front Desk', items: [
    { href: '/reception/dashboard',    label: 'Dashboard',     icon: Home },
    { href: '/reception/opd',          label: 'OPD Queue',     icon: LayoutDashboard },
    { href: '/reception/register',     label: 'Register Patient', icon: UserPlus },
    { href: '/reception/journey',      label: 'Journey Board', icon: Activity },
    { href: '/reception/queue',        label: 'OPD Display',   icon: Activity },
    { href: '/reception/appointments', label: 'Appointments',  icon: Calendar },
    { href: '/reception/patients',     label: 'Patients',      icon: Users },
  ] },
  { header: 'Coordination', items: [
    { href: '/reception/beds',        label: 'Bed Status',      icon: BedDouble },
    { href: '/reception/billing',     label: 'Billing Status',  icon: CreditCard },
    { href: '/reception/tpa',         label: 'TPA / Insurance', icon: ShieldCheck },
    { href: '/reception/diagnostics', label: 'Diagnostics',     icon: FlaskConical },
    { href: '/reception/ambulance',   label: 'Ambulance',       icon: Truck },
  ] },
  { header: 'Utilities', items: [
    { href: '/reception/messages',  label: 'Messaging',       icon: MessageSquare },
    { href: '/reception/downloads', label: 'Download Center', icon: FileText },
    { href: '/reception/reports',   label: 'Reports',         icon: BarChart3 },
    { href: '/checkin',             label: 'Kiosk Check-in',  icon: ScanLine },
    { href: '/reception/setup',     label: 'Setup',           icon: Settings },
  ] },
]

const DOCTOR_SECTIONS: { header: string; items: NavItem[] }[] = [
  { header: 'Clinical', items: [
    { href: '/doctor/dashboard',   label: 'OPD Consultations',  icon: Stethoscope },
    { href: '/doctor/online',      label: 'Online Consultation', icon: Video },
    { href: '/doctor/ipd',         label: 'IPD / Inpatients',   icon: HeartPulse },
    { href: '/doctor/emergencies', label: 'Emergencies',        icon: Siren },
  ] },
  { header: 'Patients', items: [
    { href: '/doctor/records',     label: 'Patient Records',    icon: ClipboardList },
    { href: '/doctor/ai-assistant',label: 'AI Assistant',       icon: Sparkles },
  ] },
  { header: 'Workspace', items: [
    { href: '/doctor/schedule',    label: 'My Schedule',        icon: Calendar },
    { href: '/doctor/inbox',       label: 'Inbox',              icon: MessageSquare },
  ] },
  { header: 'Insights', items: [
    { href: '/doctor/analytics',   label: 'My Activity',        icon: BarChart3 },
    { href: '/doctor/beds',        label: 'Bed Availability',   icon: BedDouble },
    { href: '/doctor/registries',  label: 'Disease Registries', icon: Users },
  ] },
]

const PHARMACY_SECTIONS: { header: string; items: NavItem[] }[] = [
  { header: 'Fulfilment', items: [
    { href: '/pharmacy/dashboard', label: 'Overview',           icon: LayoutDashboard },
    { href: '/pharmacy/queue',     label: 'Prescription Queue', icon: ClipboardList },
  ] },
  { header: 'Stock & Compliance', items: [
    { href: '/pharmacy/inventory', label: 'Inventory',     icon: Package },
    { href: '/pharmacy/master',    label: 'Drug Master',   icon: BookOpen },
    { href: '/pharmacy/narcotics', label: 'Narcotics Log', icon: AlertTriangle },
  ] },
  { header: 'Utilities', items: [
    { href: '/pharmacy/messages',  label: 'Messaging',     icon: MessageSquare },
  ] },
]

// Enterprise RIS — grouped sidebar (Command / Workflow / Reports).
const RADIOLOGY_SECTIONS: { header: string; items: NavItem[] }[] = [
  { header: 'Command', items: [
    { href: '/radiology/dashboard',   label: 'RIS Command Center', icon: LayoutDashboard },
    { href: '/radiology/ai-command',  label: 'AI Command Center',  icon: Sparkles },
    { href: '/radiology/critical',    label: 'Critical Results',   icon: Siren },
    { href: '/radiology/analytics',   label: 'Analytics',          icon: BarChart3 },
  ] },
  { header: 'Workflow', items: [
    { href: '/radiology/orders',      label: 'Order Desk',         icon: ClipboardCheck },
    { href: '/radiology/schedule',    label: 'Scheduling',         icon: Activity },
    { href: '/radiology/arrival',     label: 'Arrival Desk',       icon: ScanLine },
    { href: '/radiology/inbox',       label: 'Worklist Inbox',     icon: ClipboardList },
    { href: '/radiology/bench',       label: 'Modality Bench',     icon: ScanLine },
    { href: '/radiology/reading',     label: 'Reading Room',       icon: FileText },
    { href: '/radiology/verification',label: 'Verification',       icon: ShieldCheck },
  ] },
  { header: 'Reports', items: [
    { href: '/radiology/viewer',      label: 'DICOM Viewer',       icon: Microscope },
    { href: '/radiology/templates',   label: 'Report Templates',   icon: BookOpen },
    { href: '/radiology/distribution',label: 'Result Distribution',icon: Send },
  ] },
]

const CMO_SECTIONS: { header: string; items: NavItem[] }[] = [
  { header: 'Daily', items: [
    { href: '/cmo',           label: 'Home · Today\'s brief',  icon: Home },
    { href: '/cmo/alerts',    label: 'Alerts',                 icon: AlertTriangle },
    { href: '/cmo/approvals', label: 'Approvals',              icon: ClipboardCheck },
  ] },
  { header: 'Operations', items: [
    { href: '/cmo/facilities', label: 'Facilities & map',   icon: Building2 },
    { href: '/cmo/beds',       label: 'Bed network',        icon: BedDouble },
    { href: '/cmo/ambulance',  label: 'Ambulance command',  icon: Ambulance },
    { href: '/cmo/emergency',  label: 'Emergency mode',     icon: Siren },
  ] },
  { header: 'Workforce', items: [
    { href: '/cmo/staff',    label: 'Staff & attendance',    icon: Users },
    { href: '/cmo/postings', label: 'Postings & escalations', icon: ArrowLeftRight },
  ] },
  { header: 'Public Health', items: [
    { href: '/cmo/surveillance',     label: 'Surveillance & outbreaks', icon: Activity },
    { href: '/cmo/mch',              label: 'MCH & immunization',      icon: HeartPulse },
    { href: '/cmo/disease-programs', label: 'Disease programs',         icon: Stethoscope },
  ] },
  { header: 'Schemes & Supply', items: [
    { href: '/cmo/schemes',   label: 'PM-JAY & schemes', icon: ShieldCheck },
    { href: '/cmo/supply',    label: 'Drugs & supply',   icon: Pill },
    { href: '/cmo/equipment', label: 'Equipment & AMC',  icon: Settings },
  ] },
  { header: 'Quality', items: [
    { href: '/cmo/quality',    label: 'Quality & incidents', icon: Star },
    { href: '/cmo/grievances', label: 'RTI & grievances',    icon: MessageSquare },
  ] },
  { header: 'Field & Reports', items: [
    { href: '/cmo/field-visits', label: 'Field visits',      icon: MapPin },
    { href: '/cmo/reports',      label: 'Reports & returns', icon: FileText },
  ] },
  { header: 'Comms & AI', items: [
    { href: '/cmo/communication', label: 'Communication', icon: MessageSquarePlus },
    { href: '/cmo/ai-assistants', label: 'AI assistants', icon: Sparkles },
  ] },
  { header: 'Admin', items: [
    { href: '/cmo/settings',  label: 'Settings',  icon: Settings },
    { href: '/cmo/audit-log', label: 'Audit log', icon: ClipboardList },
    { href: '/cmo/profile',   label: 'Profile',   icon: UserCog },
  ] },
]

const SECRETARY_SECTIONS: { header: string; items: NavItem[] }[] = [
  { header: 'Daily', items: [
    { href: '/secretary',           label: 'Home · State brief',       icon: Home },
    { href: '/secretary/alerts',    label: 'Alerts',                   icon: AlertTriangle },
    { href: '/secretary/approvals', label: 'Approvals',                icon: ClipboardCheck },
  ] },
  { header: 'State command', items: [
    { href: '/secretary/ranking',      label: 'Map & district ranking',    icon: BarChart3 },
    { href: '/secretary/mobilization', label: 'Inter-district mobilization', icon: ArrowLeftRight },
    { href: '/secretary/beds',         label: 'State bed network',          icon: BedDouble },
    { href: '/secretary/emergency',    label: 'Statewide emergency',        icon: Siren },
  ] },
  { header: 'Network', items: [
    { href: '/secretary/districts', label: '52 District cockpits', icon: Building2 },
    { href: '/secretary/dme',       label: 'DME · 14 colleges',    icon: Stethoscope },
    { href: '/secretary/ayush',     label: 'AYUSH facilities',     icon: HeartPulse },
  ] },
  { header: 'Public Health', items: [
    { href: '/secretary/surveillance',     label: 'Surveillance & outbreaks', icon: Activity },
    { href: '/secretary/mch',              label: 'MCH & immunization',      icon: Baby },
    { href: '/secretary/disease-programs', label: 'Disease programs',         icon: Bug },
  ] },
  { header: 'Schemes & Funds', items: [
    { href: '/secretary/schemes', label: 'PM-JAY & state schemes', icon: ShieldCheck },
    { href: '/secretary/fraud',   label: 'Fraud command',           icon: ShieldAlert },
  ] },
  { header: 'Workforce & Supply', items: [
    { href: '/secretary/workforce', label: 'Workforce & DME faculty',   icon: Users },
    { href: '/secretary/supply',    label: 'Supply chain & MPPHSCL',    icon: Pill },
  ] },
  { header: 'Quality & Compliance', items: [
    { href: '/secretary/quality',   label: 'Quality & incidents', icon: Star },
    { href: '/secretary/cag-audit', label: 'CAG audit & RTI',     icon: FileText },
  ] },
  { header: 'Reports', items: [
    { href: '/secretary/reports',   label: 'National reports & PIP', icon: ClipboardList },
    { href: '/secretary/niti-abdm', label: 'NITI Aayog & ABDM',      icon: BarChart3 },
  ] },
  { header: 'Policy & Centre', items: [
    { href: '/secretary/cabinet',       label: 'Cabinet, Assembly, policy', icon: BookOpen },
    { href: '/secretary/centre',        label: 'Centre · MoHFW & NHA',     icon: Building2 },
  ] },
  { header: 'Comms & AI', items: [
    { href: '/secretary/communication', label: 'Communication & press', icon: MessageSquarePlus },
    { href: '/secretary/ai-assistants', label: 'AI assistants',          icon: Sparkles },
  ] },
  { header: 'Admin', items: [
    { href: '/secretary/settings',  label: 'Settings',  icon: Settings },
    { href: '/secretary/audit-log', label: 'Audit log', icon: ClipboardList },
    { href: '/secretary/profile',   label: 'Profile',   icon: UserCog },
  ] },
]

const navByRole: Record<Role, NavItem[]> = {
  patient: PATIENT_SECTIONS.flatMap(s => s.items),
  doctor: DOCTOR_SECTIONS.flatMap(s => s.items),
  reception: RECEPTION_SECTIONS.flatMap(s => s.items),
  pharmacy: PHARMACY_SECTIONS.flatMap(s => s.items),
  admin: [
    { href: '/admin/assistant',       label: 'AI Assistant',     icon: Sparkles },
    { href: '/admin/command-center',  label: 'Command Center',   icon: Activity },
    { href: '/admin/dashboard',       label: 'COO Dashboard',    icon: LayoutDashboard },
    { href: '/admin/users',           label: 'Staff Management', icon: UserCog },
    { href: '/admin/credentials',     label: 'Credentials',      icon: ShieldCheck },
    { href: '/admin/operations',      label: 'Operations',       icon: Workflow },
    { href: '/admin/analytics',       label: 'Analytics',        icon: BarChart3 },
    { href: '/admin/roster',          label: 'HR Roster',        icon: Calendar },
    { href: '/admin/duty',            label: 'Duty Assignment',  icon: ClipboardList },
    { href: '/admin/hours',           label: 'Hours & OT',       icon: Activity },
    { href: '/admin/on-call',         label: 'On-Call Rotation', icon: Bell },
    { href: '/admin/coverage',        label: 'Coverage Rules',   icon: ShieldCheck },
    { href: '/admin/staffing',        label: 'Staffing Overview',icon: Users },
    { href: '/admin/doctor-activity', label: 'Doctor Activity',  icon: Stethoscope },
    { href: '/admin/finance',         label: 'Hospital P&L',     icon: CreditCard },
    { href: '/admin/payroll',         label: 'Payroll',          icon: Receipt },
    { href: '/admin/vendors',         label: 'Vendors',          icon: Truck },
    { href: '/admin/disputes',        label: 'Disputes',         icon: ShieldAlert },
    { href: '/admin/compliance',      label: 'Compliance',       icon: ShieldCheck },
    { href: '/admin/statutory',       label: 'Statutory',        icon: Calendar },
    { href: '/admin/disha',           label: 'DISHA / DPDP',     icon: ShieldCheck },
    { href: '/quality/dashboard',     label: 'Quality',          icon: ShieldCheck },
    { href: '/quality/nabh',          label: 'NABH Cockpit',     icon: ShieldCheck },
    { href: '/admin/ai-performance',  label: 'AI Performance',   icon: Sparkles },
  ],
  hr: [
    { href: '/hr/dashboard',     label: 'HR Dashboard',          icon: LayoutDashboard },
    { href: '/hr/employees',     label: 'Employees',             icon: Users },
    { href: '/hr/leave',         label: 'Leave Management',      icon: Calendar },
    { href: '/hr/attendance',    label: 'Attendance & Time',     icon: Activity },
    { href: '/hr/recruitment',   label: 'Recruitment',           icon: Workflow },
    { href: '/hr/onboarding',    label: 'Onboarding',            icon: ClipboardCheck },
    { href: '/hr/appraisals',    label: 'Performance',           icon: BarChart3 },
  ],
  nurse: [
    { href: '/nurse/dashboard',       label: 'Ward Dashboard',  icon: LayoutDashboard },
    { href: '/nurse/vitals-requests', label: 'Vitals Requests', icon: HeartPulse },
    { href: '/nurse/orders',          label: 'Doctor Orders',   icon: ClipboardCheck },
    { href: '/nurse/patients',        label: 'My Ward',         icon: Users },
    { href: '/nurse/rounds',     label: 'Doctor Rounds',   icon: Stethoscope },
    { href: '/nurse/tasks',      label: 'Daily Tasks',     icon: ClipboardList },
    { href: '/nurse/medication', label: 'Medication (MAR)', icon: Pill },
    { href: '/nurse/fluid-balance', label: 'Fluid Balance', icon: Droplets },
    { href: '/nurse/handover',   label: 'Handover Brief',  icon: FileText },
    { href: '/nurse/ai-assistant', label: 'AI Assistant',  icon: Sparkles },
    { href: '/nurse/messages',   label: 'Messages',        icon: MessageSquare },
  ],
  emergency: [
    { href: '/emergency/triage',    label: 'Triage',        icon: Ambulance },
    { href: '/emergency/floor',     label: 'ER Floor',      icon: Activity },
    { href: '/emergency/dashboard', label: 'ER Overview',   icon: LayoutDashboard },
  ],
  lab: [
    { href: '/lab/dashboard',       label: 'Lab Overview',     icon: LayoutDashboard },
    { href: '/lab/phlebotomy',      label: 'Phlebotomy',       icon: Droplet },
    { href: '/lab/inbox',           label: 'Sample Inbox',     icon: ClipboardList },
    { href: '/lab/analyzer-feed',   label: 'Analyzer feed',    icon: Cpu },
    { href: '/lab/verify',          label: 'Verification',     icon: ClipboardCheck },
    { href: '/lab/benches',         label: 'Manual entries',   icon: Microscope },
    { href: '/lab/microbiology',    label: 'Microbiology',     icon: Bug },
    { href: '/lab/qc',              label: 'Quality Control',  icon: SlidersHorizontal },
    { href: '/lab/reflex',          label: 'Reflex Tests',     icon: RefreshCw },
  ],
  radiology: RADIOLOGY_SECTIONS.flatMap(s => s.items),
  insurance: [
    { href: '/insurance/dashboard', label: 'TPA Overview',       icon: LayoutDashboard },
    { href: '/insurance/pipeline',  label: 'Approval Pipeline',  icon: Workflow },
    { href: '/insurance/claims',    label: 'Active Claims',      icon: FileText },
    { href: '/insurance/preauth',   label: 'Pre-Auth',           icon: ShieldCheck },
    { href: '/insurance/documents', label: 'Documents',          icon: Package },
  ],
  inventory: [
    { href: '/inventory/dashboard', label: 'Asset Overview',     icon: LayoutDashboard },
    { href: '/inventory/stock',     label: 'Stock Levels',       icon: Package },
    { href: '/inventory/requests',  label: 'Pharmacy Requests',  icon: ShoppingCart },
  ],
  bed_manager: [
    { href: '/admission/dashboard', label: 'Admissions',   icon: BedDouble },
    { href: '/admission/beds',      label: 'Bed Board',    icon: LayoutDashboard },
    { href: '/admission/forecast',  label: 'Bed Forecast', icon: BarChart3 },
  ],
  discharge: [
    { href: '/discharge/dashboard', label: 'Discharge Queue', icon: CheckCircle },
  ],
  billing: [
    { href: '/billing/dashboard',   label: 'Billing Overview', icon: CreditCard },
    { href: '/billing/packages',    label: 'Packages',         icon: Package },
    { href: '/billing/refunds',     label: 'Refunds',          icon: Receipt },
    { href: '/billing/discounts',   label: 'Discounts',        icon: Heart },
  ],
  ot: [
    { href: '/ot/dashboard',    label: 'OT Live',          icon: Scissors },
    { href: '/ot/schedule',     label: 'OT Schedule',      icon: Calendar },
    { href: '/ot/checklist',    label: 'Pre-Op Checklist', icon: ClipboardList },
  ],
  housekeeping: [
    { href: '/housekeeping/dashboard', label: 'Cleaning Queue', icon: Trash2 },
  ],
  quality: [
    { href: '/quality/dashboard',  label: 'QI Dashboard', icon: ShieldCheck },
    { href: '/quality/incidents',  label: 'Incidents',    icon: Activity },
    { href: '/quality/nabh',       label: 'NABH Cockpit', icon: ShieldCheck },
  ],
  feedback_analyst: [
    { href: '/feedback/dashboard',   label: 'Dashboard',   icon: Star },
    { href: '/feedback/responses',   label: 'Responses',   icon: List },
    { href: '/feedback/ai-insights', label: 'AI Insights', icon: Sparkles },
  ],
  blood_bank: [
    { href: '/bloodbank/dashboard',  label: 'BB Dashboard',         icon: Droplets },
    { href: '/bloodbank/inventory',  label: 'Inventory',            icon: Package },
    { href: '/bloodbank/requests',   label: 'Cross-Match Requests', icon: ClipboardList },
    { href: '/bloodbank/donors',     label: 'Donor Registry',       icon: Heart },
  ],
  cssd: [
    { href: '/cssd/dashboard',    label: 'CSSD Dashboard',       icon: LayoutDashboard },
    { href: '/cssd/cycles',       label: 'Sterilization Cycles', icon: Activity },
    { href: '/cssd/instruments',  label: 'Instruments',          icon: Package },
  ],
  dietary: [
    { href: '/dietary/dashboard', label: 'Dietary Dashboard', icon: Utensils },
    { href: '/dietary/plans',     label: 'Diet Plans',        icon: BookOpen },
    { href: '/dietary/orders',    label: 'Meal Orders',       icon: ClipboardList },
  ],
  bmw: [
    { href: '/bmw/dashboard', label: 'BMW Dashboard',      icon: AlertTriangle },
    { href: '/bmw/log',       label: 'Waste Log',          icon: FileText },
    { href: '/bmw/reports',   label: 'Compliance Reports', icon: BarChart3 },
  ],
  mortuary: [
    { href: '/mortuary/dashboard',   label: 'Mortuary Dashboard', icon: LayoutDashboard },
    { href: '/mortuary/records',     label: 'Deceased Records',   icon: FileText },
    { href: '/mortuary/clearances',  label: 'Legal Clearances',   icon: CheckCircle },
  ],
  ambulance: [
    { href: '/ambulance/dashboard', label: 'Fleet Dashboard', icon: Truck },
    { href: '/ambulance/dispatch',  label: 'Dispatch',        icon: Activity },
    { href: '/ambulance/log',       label: 'Trip Log',        icon: FileText },
  ],
  audit_officer: [
    { href: '/audit/dashboard', label: 'Audit Dashboard',     icon: ShieldCheck },
    { href: '/audit/log',       label: 'Audit Trail',         icon: FileText },
    { href: '/audit/reports',   label: 'Compliance Reports',  icon: BarChart3 },
  ],
  vendor_manager: [
    { href: '/vendor-manager/dashboard',       label: 'Dashboard',       icon: LayoutDashboard },
    { href: '/vendor-manager/vendors',          label: 'Vendors',         icon: Truck },
    { href: '/vendor-manager/contracts',        label: 'Contracts',       icon: FileText },
    { href: '/vendor-manager/purchase-orders',  label: 'Purchase Orders', icon: ShoppingCart },
    { href: '/vendor-manager/payments',         label: 'Payments',        icon: CreditCard },
    { href: '/vendor-manager/performance',      label: 'Performance',     icon: BarChart3 },
    { href: '/vendor-manager/ai-insights',      label: 'AI Insights',     icon: Sparkles },
  ],
  cmo:       CMO_SECTIONS.flatMap(s => s.items),
  secretary: SECRETARY_SECTIONS.flatMap(s => s.items),
}

// Single disciplined deep-blue identity shared by every portal (uniform per design
// direction). Roles are distinguished by label + icon only — never by color.
const ROLE_LABELS: Record<Role, string> = {
  patient: 'Patient Portal',      doctor: 'Doctor Portal',       reception: 'Reception',
  admin: 'Admin Portal',          nurse: 'Nursing Station',      emergency: 'Emergency Room',
  lab: 'Laboratory',              radiology: 'Radiology Dept',   insurance: 'TPA & Insurance',
  inventory: 'Inventory Mgr',     pharmacy: 'Pharmacy',          bed_manager: 'Admission Desk',
  discharge: 'Discharge Desk',    billing: 'Billing Dept',       ot: 'Operation Theater',
  housekeeping: 'Housekeeping',   quality: 'Quality & Safety',   blood_bank: 'Blood Bank',
  cssd: 'CSSD',                   dietary: 'Dietary Services',   bmw: 'Bio-Medical Waste',
  mortuary: 'Mortuary',           ambulance: 'Ambulance Svc.',   audit_officer: 'Audit & Compliance',
  hr: 'HR Portal',                vendor_manager: 'Vendor Mgmt',
  feedback_analyst: 'Patient Feedback',
  cmo:       'CMO Cockpit',
  secretary: 'PS Health · MP',
}

// Roles whose sidebar is rendered as grouped sections (with headers) instead of a flat list.
const sectionsByRole: Partial<Record<Role, { header: string; items: NavItem[] }[]>> = {
  patient: PATIENT_SECTIONS,
  reception: RECEPTION_SECTIONS,
  doctor: DOCTOR_SECTIONS,
  pharmacy: PHARMACY_SECTIONS,
  radiology: RADIOLOGY_SECTIONS,
  cmo:       CMO_SECTIONS,
  secretary: SECRETARY_SECTIONS,
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const { currentUser, activeRole, logout } = useAuthStore()
  const pathname = usePathname()
  const router = useRouter()
  const nav = navByRole[activeRole] ?? []
  const roleLabel = ROLE_LABELS[activeRole]
  const [collapsed, setCollapsed] = useState(false)
  const [notifOpen, setNotifOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [query, setQuery] = useState('')
  const [mobileOpen, setMobileOpen] = useState(false)
  const shouldReduceMotion = useReducedMotion()

  // Close the mobile sidebar drawer on navigation.
  useEffect(() => { setMobileOpen(false) }, [pathname])

  // Wired header search + bell (M16).
  const allPatients = usePatientStore(s => s.patients)
  const allInpatients = useInpatientStore(s => s.inpatients)
  const notifications = useNotificationStore(s => s.notifications)
  const markNotifRead = useNotificationStore(s => s.markRead)
  const markAllRead = useNotificationStore(s => s.markAllRead)
  const dismissNotif = useNotificationStore(s => s.dismiss)

  const roleNotifs = notifications.filter(n => activeRole === 'admin' || !n.targetRole || n.targetRole === activeRole)
  const unreadCount = roleNotifs.filter(n => !n.read).length

  // Where clicking a notification takes the user. Prefers an explicit deep-link,
  // then a keyword/type match for the active role, then the role's home page so
  // a click always lands somewhere actionable.
  const notifHref = (n: typeof notifications[number]): string | null => {
    if (n.link) return n.link
    const t = `${n.type} ${n.title} ${n.body}`.toLowerCase()
    if (activeRole === 'doctor') {
      if (/discharge|round|ipd|inpatient|admit/.test(t)) return '/doctor/ipd'
      if (/radiolog|x-ray|ct |mri|scan|lab|result|critical|report/.test(t)) return '/doctor/inbox'
      if (/appointment|consult|opd/.test(t)) return '/doctor/dashboard'
    }
    if (activeRole === 'discharge' && /discharge|clearance|exit/.test(t)) return '/discharge/dashboard'
    if (activeRole === 'bed_manager' && /bed|admission|discharge/.test(t)) return '/admission/dashboard'
    if (activeRole === 'radiology' && /radiolog|x-ray|scan|study|report/.test(t)) return '/radiology/inbox'
    if (activeRole === 'lab' && /lab|result|sample|critical/.test(t)) return '/lab/inbox'
    if (activeRole === 'pharmacy' && /pharmac|medicine|rx|prescription|dispense/.test(t)) return '/pharmacy/queue'
    return nav[0]?.href ?? null
  }

  const handleNotifClick = (n: typeof notifications[number]) => {
    markNotifRead(n.id)
    setNotifOpen(false)
    const href = notifHref(n)
    if (href) router.push(href)
  }

  const q = query.trim().toLowerCase()
  const searchResults = q.length >= 1 ? (() => {
    const ipIds = new Set(allInpatients.map(i => i.patientId))
    const out: { id: string; name: string; sub: string; admitted: boolean }[] = []
    allInpatients.forEach(i => { if (i.name.toLowerCase().includes(q) || i.patientId.toLowerCase().includes(q)) out.push({ id: i.patientId, name: i.name, sub: `Admitted · ${i.ward} ${i.bed}`, admitted: true }) })
    allPatients.forEach(p => { if (!out.some(m => m.id === p.id) && (p.name.toLowerCase().includes(q) || p.id.toLowerCase().includes(q))) out.push({ id: p.id, name: p.name, sub: `${p.id} · ${p.department}`, admitted: ipIds.has(p.id) }) })
    return out.slice(0, 6)
  })() : []

  const PATIENTS_ROUTE: Partial<Record<Role, string>> = { reception: '/reception/patients', nurse: '/nurse/patients', admin: '/admin/users' }
  const gotoPatient = (m: { id: string; admitted: boolean }) => {
    setQuery('')
    if (activeRole === 'doctor') { router.push(m.admitted ? `/doctor/ipd/${m.id}` : '/doctor/records'); return }
    const dest = PATIENTS_ROUTE[activeRole]; if (dest) router.push(dest)
  }

  // Page-enter animation is attached only after mount so the server render and
  // the first client render emit identical (un-transformed) markup — avoids the
  // framer-motion `initial` transform causing a hydration attribute mismatch.
  useEffect(() => { setMounted(true) }, [])

  const handleLogout = () => {
    logout()
    router.push('/')
  }

  const transition = shouldReduceMotion
    ? { duration: 0 }
    : { duration: 0.28, ease: [0.16, 1, 0.3, 1] as [number, number, number, number] }

  const renderItem = (item: NavItem) => {
    // Exact match wins; prefix match only when no more-specific nav item also matches,
    // preventing the root route (/secretary) from staying active on every sub-page.
    const isActive =
      pathname === item.href ||
      (pathname.startsWith(item.href + '/') &&
        !nav.some(other => other.href !== item.href && pathname.startsWith(other.href)))
    const Icon = item.icon
    return (
      <Link key={item.href} href={item.href}>
        <div
          title={collapsed ? item.label : undefined}
          aria-current={isActive ? 'page' : undefined}
          className={cn(
            "flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all duration-200 cursor-pointer relative group",
            isActive
              ? "font-semibold bg-accent-soft text-primary"
              : "font-medium text-foreground-lighter hover:text-foreground"
          )}
        >
          {isActive && <motion.div layoutId="active-nav-pill" className="absolute left-0 top-1.5 bottom-1.5 w-[3px] rounded-r-full bg-primary" />}
          {!isActive && <div className="absolute inset-0 rounded-xl bg-surface-sunken opacity-0 group-hover:opacity-100 transition-opacity duration-150" />}
          <Icon className={cn("h-[18px] w-[18px] flex-shrink-0 relative z-10 transition-colors", isActive && "text-primary")} aria-hidden="true" />
          {!collapsed && <span className="flex-1 truncate relative z-10">{item.label}</span>}
          {isActive && !collapsed && <ChevronRight className="h-3.5 w-3.5 relative z-10 opacity-50 text-primary" />}
        </div>
      </Link>
    )
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <a href="#main-content" className="skip-link">Skip to main content</a>

      {/* Mobile drawer backdrop */}
      {mobileOpen && <div className="lg:hidden fixed inset-0 bg-foreground/40 backdrop-blur-[2px] z-40" onClick={() => setMobileOpen(false)} aria-hidden="true" />}

      {/* ── Sidebar ──────────────────────────────────────── */}
      <motion.aside
        animate={{ width: collapsed ? 72 : 264 }}
        transition={transition}
        className={cn(
          "flex-shrink-0 flex flex-col bg-surface border-r border-border z-20 relative overflow-hidden",
          "max-lg:fixed max-lg:inset-y-0 max-lg:left-0 max-lg:z-50 max-lg:w-64 max-lg:shadow-lg transition-transform",
          mobileOpen ? "max-lg:translate-x-0" : "max-lg:-translate-x-full",
        )}
        aria-label="Main sidebar"
      >
        {/* Brand Header */}
        <div className="h-[68px] flex items-center px-4 flex-shrink-0 border-b border-border-light">
          <div className="flex items-center overflow-hidden whitespace-nowrap w-full pl-2">
            <img src="/Agentix logo-health.svg" alt="Agentix HIMS" className={cn("w-auto object-contain", collapsed ? "h-8" : "h-10")} />
          </div>
        </div>

        {/* Navigation */}
        <nav aria-label="Main navigation" className="flex-1 px-2.5 py-4 overflow-y-auto">
          {sectionsByRole[activeRole] ? (
            sectionsByRole[activeRole]!.map(section => (
              <div key={section.header} className="mb-1">
                {!collapsed && <p className="px-3 pt-3 pb-1 t-overline text-foreground-placeholder">{section.header}</p>}
                <div className="space-y-0.5">{section.items.map(renderItem)}</div>
              </div>
            ))
          ) : (
            <div className="space-y-0.5">{nav.map(renderItem)}</div>
          )}
        </nav>

        {/* Bottom: Role Switcher + User */}
        <div className="px-2.5 pb-4 flex flex-col gap-2 pt-3 border-t border-border-light">
          {/* AI Status Chip */}
          {!collapsed && (
            <div className="flex items-center gap-2 px-3 py-2 rounded-xl bg-accent-soft border border-primary/15">
              <Sparkles className="h-3.5 w-3.5 flex-shrink-0 text-primary" />
              <span className="text-[11px] font-semibold text-primary">AI Active</span>
              <div className="ml-auto h-1.5 w-1.5 rounded-full bg-success" />
            </div>
          )}

          {/* User Row */}
          <div className={cn("flex items-center", collapsed ? "justify-center flex-col gap-2" : "gap-3 px-1")}>
            <Avatar name={currentUser?.name ?? 'User'} size="sm" />
            {!collapsed && (
              <div className="flex-1 min-w-0">
                <p className="text-sm font-bold text-foreground truncate">{currentUser?.name}</p>
                <p className="text-[11px] font-medium text-foreground-placeholder truncate">{currentUser?.id}</p>
              </div>
            )}
            <button
              onClick={handleLogout}
              aria-label="Log out"
              title="Log out"
              className="tap p-1.5 rounded-lg transition-colors flex-shrink-0 cursor-pointer text-foreground-placeholder hover:text-danger hover:bg-danger-bg"
            >
              <LogOut className="h-4 w-4" aria-hidden="true" />
            </button>
          </div>
        </div>
      </motion.aside>

      {/* ── Main Area ────────────────────────────────────── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden relative">
        {/* Top Header — z-30 keeps its dropdowns (notifications, search) above the
            page content in <main> (z-10) and the sidebar (z-20); equal z-index
            previously let <main> paint over the open notification panel. */}
        <header className="h-[68px] flex-shrink-0 flex items-center justify-between px-4 sm:px-6 bg-surface border-b border-border relative z-30">
          <div className="flex items-center gap-4">
            <button
              onClick={() => setMobileOpen(true)}
              aria-label="Open menu"
              className="lg:hidden tap p-2 -ml-2 rounded-xl transition-colors cursor-pointer text-foreground-lighter hover:bg-surface-sunken hover:text-foreground"
            >
              <Menu className="h-5 w-5" aria-hidden="true" />
            </button>
            <button
              onClick={() => setCollapsed(!collapsed)}
              aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
              className="hidden lg:block p-2 -ml-2 rounded-xl transition-colors cursor-pointer text-foreground-placeholder hover:text-foreground hover:bg-surface-sunken"
            >
              {collapsed
                ? <PanelLeft className="h-5 w-5" aria-hidden="true" />
                : <PanelLeftClose className="h-5 w-5" aria-hidden="true" />
              }
            </button>
            <div>
              <h1 className="t-title text-foreground">
                {pathname.startsWith('/doctor/settings') ? 'Profile & Settings' : nav.find(n => pathname.startsWith(n.href))?.label ?? 'Dashboard'}
              </h1>
              <nav aria-label="breadcrumb">
                <ol className="flex items-center gap-1 text-xs font-medium text-foreground-placeholder">
                  <li>{roleLabel}</li>
                  {nav.find(n => pathname.startsWith(n.href)) && (
                    <>
                      <li aria-hidden="true">/</li>
                      <li aria-current="page" className="font-semibold text-primary">
                        {nav.find(n => pathname.startsWith(n.href))?.label}
                      </li>
                    </>
                  )}
                </ol>
              </nav>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            {/* Mobile search — below md the desktop bar is hidden. For admin this
                routes to the AI assistant (the single admin search engine); for
                everyone else it opens the universal command palette. */}
            <button
              type="button"
              onClick={() => {
                if (activeRole === 'admin') { router.push('/admin/assistant'); return }
                if (typeof window === "undefined") return
                window.dispatchEvent(new KeyboardEvent("keydown", { key: "k", metaKey: true, ctrlKey: true, bubbles: true }))
              }}
              aria-label={activeRole === 'admin' ? "Ask Agentix HIMS AI" : "Search"}
              className="md:hidden tap inline-flex items-center justify-center p-2 rounded-xl text-foreground-muted hover:bg-surface-sunken transition-colors cursor-pointer"
            >
              {activeRole === 'admin' ? <Sparkles className="h-5 w-5" aria-hidden="true" /> : <Search className="h-5 w-5" aria-hidden="true" />}
            </button>

            {/* M2 — Command palette trigger (Cmd/Ctrl+K). Hidden for admin, whose
                single search surface is the AI assistant. */}
            {activeRole !== 'admin' && <CommandPaletteTrigger className="hidden lg:inline-flex" />}

            {/* Admin — single AI search engine entry (replaces patient search) */}
            {activeRole === 'admin' ? (
              <button
                type="button"
                onClick={() => router.push('/admin/assistant')}
                className="hidden md:inline-flex items-center gap-2 h-9 w-64 px-3 rounded-xl text-[13px] font-medium text-foreground-lighter bg-surface-sunken border border-border hover:border-primary hover:text-primary transition-colors cursor-pointer"
              >
                <Sparkles className="h-4 w-4 text-primary flex-shrink-0" aria-hidden="true" />
                <span className="truncate">Ask Agentix HIMS AI anything…</span>
              </button>
            ) : (
            /* Global Search */
            <div className="relative hidden md:block w-56">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-foreground-placeholder z-10" aria-hidden="true" />
              <input
                type="search"
                value={query}
                onChange={e => setQuery(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter' && searchResults[0]) gotoPatient(searchResults[0]); if (e.key === 'Escape') setQuery('') }}
                onBlur={() => setTimeout(() => setQuery(''), 150)}
                placeholder={activeRole === 'patient' ? "Search your records, doctors…" : "Search patients..."}
                aria-label="Search"
                className="w-full h-9 pl-9 pr-4 rounded-xl text-sm text-foreground placeholder:text-foreground-placeholder bg-surface-sunken border border-border hover:border-border-hover focus:border-primary focus:bg-surface transition-colors"
              />
              {searchResults.length > 0 && (
                <div className="absolute left-0 right-0 top-11 w-72 bg-surface border border-border rounded-2xl z-50 overflow-hidden py-1.5 shadow-dropdown">
                  {searchResults.map(m => (
                    <button key={m.id} onMouseDown={e => e.preventDefault()} onClick={() => gotoPatient(m)}
                      className="w-full text-left px-3.5 py-2 hover:bg-surface-sunken flex items-center justify-between gap-2 transition-colors">
                      <span className="min-w-0"><span className="block text-[13px] font-semibold text-foreground truncate">{m.name}</span><span className="block text-[11px] text-foreground-placeholder truncate">{m.sub}</span></span>
                      {m.admitted && <span className="text-[9.5px] font-bold px-1.5 py-0.5 rounded-full bg-danger-bg text-danger-strong flex-shrink-0">IPD</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
            )}

            {/* Notifications */}
            <div className="relative">
              <button
                onClick={() => setNotifOpen(!notifOpen)}
                aria-label="Notifications"
                aria-expanded={notifOpen}
                className="tap relative p-2 rounded-xl transition-colors cursor-pointer bg-surface-sunken border border-border text-foreground-lighter shadow-xs hover:bg-surface hover:text-foreground"
              >
                <Bell className="h-4 w-4" aria-hidden="true" />
                {unreadCount > 0 && <span className="absolute -top-1 -right-1 h-4 min-w-4 px-1 rounded-full bg-danger text-white text-[9px] font-bold flex items-center justify-center ring-2 ring-surface" aria-label={`${unreadCount} new notifications`}>{unreadCount}</span>}
              </button>
              <AnimatePresence>
                {notifOpen && (
                  <motion.div
                    initial={{ opacity: 0, y: 8, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0, y: 8, scale: 0.96 }}
                    transition={{ duration: 0.15 }}
                    className="absolute right-0 top-12 w-72 bg-surface border border-border rounded-2xl z-50 overflow-hidden shadow-dropdown"
                  >
                    <div className="flex items-center gap-2 px-4 py-3 border-b border-border-light">
                      <p className="text-sm font-bold text-foreground flex-1">Notifications{unreadCount > 0 ? ` · ${unreadCount}` : ''}</p>
                      {unreadCount > 0 ? (
                        <button onClick={() => activeRole && markAllRead(activeRole)} className="text-[10.5px] font-semibold text-primary px-2 py-1 rounded-md hover:bg-accent-soft cursor-pointer transition-colors">
                          Mark all read
                        </button>
                      ) : null}
                      <button onClick={() => setNotifOpen(false)} aria-label="Close" className="p-1 rounded-lg hover:bg-surface-sunken cursor-pointer">
                        <X className="h-4 w-4 text-foreground-placeholder" />
                      </button>
                    </div>
                    {roleNotifs.length === 0 ? (
                      <div className="p-6 text-center text-sm text-foreground-lighter">All caught up — no new notifications</div>
                    ) : (
                      <div className="max-h-80 overflow-y-auto">
                        {roleNotifs.slice(0, 12).map(n => (
                          <div key={n.id}
                            className={cn("w-full text-left px-4 py-2.5 border-b border-border-light last:border-0 hover:bg-surface-sunken flex items-start gap-2.5 group cursor-pointer transition-colors", !n.read && "bg-accent-soft/50")}
                            onClick={() => handleNotifClick(n)}>
                            {!n.read ? <span className={cn("h-2 w-2 rounded-full mt-1.5 flex-shrink-0", n.priority === 'critical' ? "bg-danger" : n.priority === 'high' ? "bg-warning" : "bg-primary")} /> : <span className="w-2 flex-shrink-0" />}
                            <span className="min-w-0 flex-1">
                              <span className="block text-[12.5px] font-semibold text-foreground truncate">{n.title}</span>
                              <span className="block text-[11.5px] text-foreground-lighter line-clamp-2">{n.body}</span>
                              {n.patientName ? <span className="block text-[10px] font-mono text-foreground-placeholder mt-0.5">{n.patientName}</span> : null}
                            </span>
                            <button onClick={(e) => { e.stopPropagation(); dismissNotif(n.id) }}
                              aria-label="Dismiss"
                              className="opacity-0 group-hover:opacity-100 transition-opacity p-1 rounded-md hover:bg-danger-bg text-foreground-placeholder hover:text-danger flex-shrink-0">
                              <X className="h-3 w-3" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            <LocaleToggle />

            <Link href={activeRole === 'patient' ? '/patient/settings' : activeRole === 'reception' ? '/reception/setup' : activeRole === 'doctor' ? '/doctor/settings' : '/admin/analytics'}>
              <button
                aria-label="Settings"
                className="tap p-2 rounded-xl transition-colors cursor-pointer bg-surface-sunken border border-border text-foreground-lighter shadow-xs hover:bg-surface hover:text-foreground"
              >
                <Settings className="h-4 w-4" aria-hidden="true" />
              </button>
            </Link>
          </div>
        </header>

        {/* Page Content */}
        <main id="main-content" className="flex-1 overflow-y-auto px-4 sm:px-6 lg:px-8 pb-8 pt-6 relative z-10">
          {/* M4-W1 — Closed-loop critical-value banner. Visible only when
              an unack'd lab_critical_callback exists, and only on the
              roles that own the loop (doctor, nurse). */}
          {(activeRole === 'doctor' || activeRole === 'nurse') ? (
            <div className="max-w-7xl mx-auto mb-3">
              <CriticalValueBanner role={activeRole === 'doctor' ? 'doctor' : 'nurse'} />
            </div>
          ) : null}

          {mounted ? (
            <AnimatePresence mode="wait">
              <motion.div
                key={pathname}
                initial={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={shouldReduceMotion ? { opacity: 1 } : { opacity: 0, y: -8 }}
                transition={shouldReduceMotion ? { duration: 0 } : { duration: 0.18, ease: 'easeOut' as const }}
                className="h-full max-w-7xl mx-auto"
              >
                {children}
              </motion.div>
            </AnimatePresence>
          ) : (
            <div className="h-full max-w-7xl mx-auto">{children}</div>
          )}
        </main>
      </div>
      {/* M2 — Command palette: Cmd/Ctrl+K from anywhere in the app. */}
      <CommandPalette />
    </div>
  )
}
