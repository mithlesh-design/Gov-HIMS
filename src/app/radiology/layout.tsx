import { RoleGuard } from "@/components/layout/RoleGuard"

export default function RadiologyLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="radiology">{children}</RoleGuard>
}
