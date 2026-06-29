import { RoleGuard }              from '@/components/layout/RoleGuard'
import { CopilotLayout }          from '@/components/features/CopilotLayout'
import { SecretaryDataProvider }  from '@/components/secretary/SecretaryDataProvider'

export const metadata = { title: 'PS Health · MP — आरोग्य दृष्टि' }

export default function SecretaryLayout({ children }: { children: React.ReactNode }) {
  return (
    <RoleGuard allowedRole="secretary">
      <CopilotLayout role="admin">
        <SecretaryDataProvider>{children}</SecretaryDataProvider>
      </CopilotLayout>
    </RoleGuard>
  )
}
