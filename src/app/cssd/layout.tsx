import { RoleGuard } from "@/components/layout/RoleGuard"

export default function CssdLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="cssd">{children}</RoleGuard>
}
