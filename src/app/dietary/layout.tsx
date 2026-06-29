import { RoleGuard } from "@/components/layout/RoleGuard"

export default function DietaryLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="dietary">{children}</RoleGuard>
}
