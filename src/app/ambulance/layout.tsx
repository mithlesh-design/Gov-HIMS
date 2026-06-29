import { RoleGuard } from "@/components/layout/RoleGuard"

export default function AmbulanceLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="ambulance">{children}</RoleGuard>
}
