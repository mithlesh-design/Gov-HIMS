import { RoleGuard } from "@/components/layout/RoleGuard"
import { CopilotLayout } from "@/components/features/CopilotLayout"

export default function DischargeLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="discharge">
      <CopilotLayout role="discharge">{children}</CopilotLayout>
    </RoleGuard>
  )
}
