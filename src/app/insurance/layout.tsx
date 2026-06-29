import { RoleGuard } from "@/components/layout/RoleGuard"
import { CopilotLayout } from "@/components/features/CopilotLayout"

export default function InsuranceLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="insurance">
      <CopilotLayout role="insurance">{children}</CopilotLayout>
    </RoleGuard>
  )
}
