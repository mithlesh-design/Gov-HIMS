import { RoleGuard }       from '@/components/layout/RoleGuard'
import { CopilotLayout }   from '@/components/features/CopilotLayout'
import { CmoDataProvider } from '@/components/cmo/CmoDataProvider'

export default function CmoLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="cmo">
      <CopilotLayout role="admin">
        <CmoDataProvider>{children}</CmoDataProvider>
      </CopilotLayout>
    </RoleGuard>
  )
}
