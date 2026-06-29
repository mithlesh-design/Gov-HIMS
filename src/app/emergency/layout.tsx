import { RoleGuard } from "@/components/layout/RoleGuard"

export default function EmergencyLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="emergency">{children}</RoleGuard>
}
