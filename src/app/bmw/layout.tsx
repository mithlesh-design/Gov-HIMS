import { RoleGuard } from "@/components/layout/RoleGuard"

export default function BmwLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="bmw">{children}</RoleGuard>
}
