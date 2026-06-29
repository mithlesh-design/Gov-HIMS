import { RoleGuard } from "@/components/layout/RoleGuard"

export default function BloodBankLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="blood_bank">{children}</RoleGuard>
}
