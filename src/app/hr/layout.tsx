import { RoleGuard } from "@/components/layout/RoleGuard"
import { CopilotLayout } from "@/components/features/CopilotLayout"

export default function HrLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="hr">
      <CopilotLayout role="hr">{children}</CopilotLayout>
    </RoleGuard>
  )
}
