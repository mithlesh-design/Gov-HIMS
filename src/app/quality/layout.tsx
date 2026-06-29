import { RoleGuard } from "@/components/layout/RoleGuard"
import { CopilotLayout } from "@/components/features/CopilotLayout"

export default function QualityLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="quality">
      <CopilotLayout role="quality">{children}</CopilotLayout>
    </RoleGuard>
  )
}
