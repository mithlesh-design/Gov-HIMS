import { RoleGuard } from "@/components/layout/RoleGuard"

export default function AuditLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="audit_officer">{children}</RoleGuard>
}
