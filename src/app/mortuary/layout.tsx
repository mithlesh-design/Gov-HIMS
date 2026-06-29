import { RoleGuard } from "@/components/layout/RoleGuard"

export default function MortuaryLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="mortuary">{children}</RoleGuard>
}
