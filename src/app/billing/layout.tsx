import { RoleGuard } from "@/components/layout/RoleGuard"
import { CopilotLayout } from "@/components/features/CopilotLayout"

export default function BillingLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="billing">
      <CopilotLayout role="billing">{children}</CopilotLayout>
    </RoleGuard>
  )
}
