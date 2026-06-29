import { RoleGuard } from "@/components/layout/RoleGuard"

export default function HousekeepingLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="housekeeping">{children}</RoleGuard>
}
