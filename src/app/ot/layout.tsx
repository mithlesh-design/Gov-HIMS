import { RoleGuard } from "@/components/layout/RoleGuard"

export default function OTLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="ot">{children}</RoleGuard>
}
