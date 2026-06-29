"use client"

import { useAuthStore } from "@/store/useAuthStore"
import { StaffMessages } from "@/components/messaging/StaffMessages"

export default function PharmacyMessages() {
  const meId = useAuthStore(s => s.currentUser?.id ?? "PH-301")
  return (
    <div className="pb-6 h-full flex flex-col min-h-0">
      <div className="mb-4">
        <h1 className="text-[24px] font-bold text-slate-900 tracking-tight">Messaging</h1>
        <p className="text-[13px] text-slate-500 mt-0.5">Reach doctors, wards and colleagues across the hospital</p>
      </div>
      <div className="flex-1 min-h-0"><StaffMessages meId={meId} /></div>
    </div>
  )
}
