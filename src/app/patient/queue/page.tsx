"use client"

import { motion } from "framer-motion"
import { usePatientStore } from "@/store/usePatientStore"
import { StatusStepper } from "@/components/ui/status-stepper"
import { PatientCard } from "@/components/features/PatientCard"
import { Avatar } from "@/components/ui/avatar"

export default function PatientQueue() {
  const { patients } = usePatientStore()
  const me = patients.find(p => p.id === 'PT-20392')!
  const inQueue = patients.filter(p => ['waiting','vitals','consulting'].includes(p.queueStatus))
    .sort((a, b) => a.token - b.token)

  return (
    <div className="p-6 max-w-3xl mx-auto space-y-5">
      <div className="bg-white rounded-xl border border-slate-200 p-5">
        <h3 className="text-sm font-semibold mb-4">Your Journey</h3>
        <StatusStepper status={me.queueStatus} />
      </div>
      <h3 className="font-bold text-base">Live OPD Queue — {me.doctor}</h3>
      <div className="space-y-2">
        {inQueue.map((p, i) => (
          <PatientCard key={p.id} patient={p} compact delay={i * 0.05} selected={p.id === me.id} />
        ))}
      </div>
    </div>
  )
}
