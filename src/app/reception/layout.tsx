import { RoleGuard } from "@/components/layout/RoleGuard"

export default function ReceptionLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="reception">{children}</RoleGuard>
}
