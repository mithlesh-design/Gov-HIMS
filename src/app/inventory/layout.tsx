import { RoleGuard } from "@/components/layout/RoleGuard"

export default function InventoryLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="inventory">{children}</RoleGuard>
}
