import { RoleGuard } from "@/components/layout/RoleGuard"
import { ResultsTicker } from "@/components/ResultsTicker"

export default function DoctorLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="doctor">
      <ResultsTicker />
      {children}
    </RoleGuard>
  )
}
