import { RoleGuard } from "@/components/layout/RoleGuard"
import { CopilotLayout } from "@/components/features/CopilotLayout"
import { CoverageWatcherProvider } from "@/components/admin/CoverageWatcherProvider"

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="admin">
      <CopilotLayout role="admin">
        <CoverageWatcherProvider>{children}</CoverageWatcherProvider>
      </CopilotLayout>
    </RoleGuard>
  )
}
