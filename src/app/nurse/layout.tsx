import { RoleGuard } from "@/components/layout/RoleGuard"
import { CopilotLayout } from "@/components/features/CopilotLayout"

export default function NurseLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="nurse">
      <CopilotLayout role="nurse">{children}</CopilotLayout>
    </RoleGuard>
  )
}
