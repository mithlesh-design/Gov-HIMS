import { RoleGuard } from "@/components/layout/RoleGuard"

export default function VendorManagerLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="vendor_manager">{children}</RoleGuard>
}
