'use client'

import { useEffect } from 'react'
import { RoleGuard } from "@/components/layout/RoleGuard"
import { useLabOrdersStore } from "@/store/useLabOrdersStore"

export default function LabLayout({ children }: { children: React.ReactNode }) {
  useEffect(() => {
    useLabOrdersStore.persist.rehydrate()

    const onStorage = (e: StorageEvent) => {
      if (e.key === 'agentix-labordersstore' && e.newValue) {
        useLabOrdersStore.persist.rehydrate()
      }
    }
    window.addEventListener('storage', onStorage)
    return () => window.removeEventListener('storage', onStorage)
  }, [])

  return <RoleGuard allowedRole="lab">{children}</RoleGuard>
}
