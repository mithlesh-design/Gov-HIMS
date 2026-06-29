"use client"

import { Select } from "@/components/ui/Select"
import { useMemo, useState } from "react"
import { motion } from "framer-motion"
import {
  Trash2, Plus, Truck, CheckCircle2, ShieldCheck, ChevronDown, ChevronRight,
} from "lucide-react"
import { useAuthStore } from "@/store/useAuthStore"
import { useBMWStore, CATEGORY_INFO, type WasteCategory } from "@/store/useBMWStore"
import { cn } from "@/lib/utils"
import { toast } from "sonner"

const fmt = (iso: string) => new Date(iso).toLocaleString('en-IN', { day: '2-digit', month: 'short', hour: '2-digit', minute: '2-digit' })
const CATS: WasteCategory[] = ['Yellow', 'Red', 'Blue', 'Black', 'White', 'Cytotoxic']
const WARDS = ['General Ward', 'ICU', 'OT', 'Pharmacy', 'CSSD', 'Lab', 'Radiology', 'OPD', 'Emergency']
const VENDORS = ['BMW-VENDOR-01', 'BMW-VENDOR-02']

export default function BMWLogPage() {
  const currentUser  = useAuthStore(s => s.currentUser)
  const wasteLogs    = useBMWStore(s => s.wasteLogs)
  const collectBag   = useBMWStore(s => s.collectBag)
  const markTreated  = useBMWStore(s => s.markTreated)
  const handoverToVendor = useBMWStore(s => s.handoverToVendor)

  const [tab, setTab]       = useState<'today' | 'pipeline' | 'history'>('pipeline')
  const [open, setOpen]     = useState<string | null>(null)
  const [ward, setWard]     = useState<string>('General Ward')
  const [category, setCategory] = useState<WasteCategory>('Yellow')
  const [weight, setWeight] = useState<string>('')
  const [bags, setBags]     = useState<string>('1')

  const todayDate = new Date().toISOString().slice(0, 10)
  const todayLogs = useMemo(() => wasteLogs.filter(l => l.date === todayDate), [wasteLogs, todayDate])
  const pipelineLogs = useMemo(() =>
    wasteLogs.filter(l => l.status === 'pending' || l.status === 'collected' || l.status === 'treated')
      .sort((a, b) => new Date(b.collectedAt).getTime() - new Date(a.collectedAt).getTime()),
    [wasteLogs],
  )
  const historyLogs = useMemo(() =>
    wasteLogs.filter(l => l.status === 'disposed' || l.status === 'non_compliant')
      .sort((a, b) => new Date(b.disposedAt ?? b.collectedAt).getTime() - new Date(a.disposedAt ?? a.collectedAt).getTime()),
    [wasteLogs],
  )

  const handleCollect = () => {
    const w = parseFloat(weight)
    const b = parseInt(bags, 10)
    if (!Number.isFinite(w) || w <= 0 || !Number.isFinite(b) || b <= 0) {
      toast.error('Enter a valid weight (kg) and bag count')
      return
    }
    collectBag({
      ward, category, weightKg: w, bagCount: b,
      collectedBy: currentUser?.id ?? 'BW-1501',
      collectedByName: currentUser?.name ?? 'BMW Tech',
    })
    setWeight(''); setBags('1')
    toast.success(`${category} · ${w}kg · ${b} bag(s) collected from ${ward}`)
  }

  return (
    <div className="space-y-5 p-6 max-w-6xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 flex items-center gap-2">
          <Trash2 className="h-6 w-6 text-amber-700" />Biomedical Waste Log
        </h1>
        <p className="text-sm text-slate-500 mt-1">CPCB 2016 colour-coded segregation · vendor handover with manifest · NABH HIC evidence</p>
      </div>

      {/* Collect form */}
      <div className="bg-white rounded-xl border border-slate-200 p-4 space-y-3">
        <p className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <Plus className="h-4 w-4 text-emerald-600" />Log a new collection
        </p>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
          <Select value={ward} onChange={(e) => setWard(e.target.value)}
            className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-2">
            {WARDS.map(w => <option key={w}>{w}</option>)}
          </Select>
          <Select value={category} onChange={(e) => setCategory(e.target.value as WasteCategory)}
            className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-2">
            {CATS.map(c => <option key={c}>{c}</option>)}
          </Select>
          <input type="number" step="0.1" min="0" value={weight} onChange={(e) => setWeight(e.target.value)} placeholder="Weight (kg)"
            className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-2" />
          <input type="number" min="1" value={bags} onChange={(e) => setBags(e.target.value)} placeholder="Bags"
            className="text-xs font-bold border border-slate-300 rounded-lg px-2 py-2" />
          <button onClick={handleCollect}
            className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg text-xs font-bold bg-amber-600 hover:bg-amber-700 text-white cursor-pointer">
            <CheckCircle2 className="h-3.5 w-3.5" />Log collection
          </button>
        </div>
        <p className="text-[11px] text-slate-500">{CATEGORY_INFO[category].types} · treatment: {CATEGORY_INFO[category].treatment}</p>
      </div>

      {/* Tabs */}
      <div className="flex items-center gap-2 p-1 rounded-xl bg-slate-100 w-fit">
        {(['pipeline', 'today', 'history'] as const).map(t => (
          <button key={t} onClick={() => setTab(t)}
            className={cn('px-3 py-1.5 rounded-lg text-xs font-bold cursor-pointer capitalize',
              tab === t ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-500 hover:text-slate-700')}>
            {t} <span className="text-slate-400">
              {t === 'pipeline' ? pipelineLogs.length : t === 'today' ? todayLogs.length : historyLogs.length}
            </span>
          </button>
        ))}
      </div>

      {/* List */}
      <div className="space-y-2">
        {(tab === 'pipeline' ? pipelineLogs : tab === 'today' ? todayLogs : historyLogs).map(l => {
          const info = CATEGORY_INFO[l.category]
          const isOpen = open === l.id
          return (
            <motion.div key={l.id} initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-xl border border-slate-200 overflow-hidden">
              <button onClick={() => setOpen(isOpen ? null : l.id)}
                className="w-full text-left px-4 py-3 hover:bg-slate-50 cursor-pointer flex items-center gap-3">
                <span className={cn("text-[10px] font-bold px-2 py-0.5 rounded ring-1 flex-shrink-0", info.tint)}>
                  {l.category}
                </span>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-bold text-slate-900 flex items-center gap-2 flex-wrap">
                    {l.ward} · {l.weightKg}kg · {l.bagCount} bag(s)
                    {l.status === 'pending' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-amber-100 text-amber-700">Pending</span>}
                    {l.status === 'collected' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]">Collected</span>}
                    {l.status === 'treated' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-[rgba(8,145,178,0.12)] text-[var(--color-primary)]">Treated</span>}
                    {l.status === 'disposed' && <span className="text-[10px] font-bold uppercase px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">Disposed</span>}
                  </p>
                  <p className="text-[11px] text-slate-500 mt-0.5">
                    Collected {fmt(l.collectedAt)}{l.collectedByName ? ` · ${l.collectedByName}` : ''}
                    {l.manifestNumber ? ` · ${l.manifestNumber}` : ''}
                  </p>
                </div>
                {isOpen ? <ChevronDown className="h-4 w-4 text-slate-400" /> : <ChevronRight className="h-4 w-4 text-slate-400" />}
              </button>
              {isOpen && (
                <div className="border-t border-slate-100 bg-slate-50/40 px-4 py-3 space-y-2 text-xs">
                  <p className="text-slate-600">
                    <b>Waste type:</b> {info.types}<br />
                    <b>Treatment:</b> {info.treatment}
                  </p>
                  {l.status === 'collected' && (
                    <button onClick={() => { markTreated(l.id); toast.success('Marked treated') }}
                      className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-[var(--color-primary)] hover:bg-[var(--color-primary-dark)] text-white cursor-pointer">
                      <ShieldCheck className="h-3.5 w-3.5" />Mark treated
                    </button>
                  )}
                  {l.status === 'treated' && (
                    <div className="flex flex-wrap gap-2">
                      {VENDORS.map(v => (
                        <button key={v} onClick={() => {
                          handoverToVendor(l.id, v, currentUser?.name ?? 'BMW Tech')
                          toast.success(`Handed over to ${v} · manifest generated`)
                        }} className="flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer">
                          <Truck className="h-3.5 w-3.5" />Hand over to {v}
                        </button>
                      ))}
                    </div>
                  )}
                  {l.status === 'disposed' && (
                    <p className="text-emerald-700 text-[11px]">
                      Manifest <b>{l.manifestNumber}</b> · vendor {l.vendorId} · disposed {l.disposedAt ? fmt(l.disposedAt) : ''}
                    </p>
                  )}
                </div>
              )}
            </motion.div>
          )
        })}
      </div>
    </div>
  )
}
