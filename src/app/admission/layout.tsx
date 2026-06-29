import { RoleGuard } from "@/components/layout/RoleGuard"

export default function AdmissionLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="bed_manager">{children}</RoleGuard>
}
