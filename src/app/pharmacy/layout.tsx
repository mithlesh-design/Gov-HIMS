import { RoleGuard } from "@/components/layout/RoleGuard"

export default function PharmacyLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="pharmacy">{children}</RoleGuard>
}
