import type { ReactNode } from 'react'

// Public minimal layout — no AppShell, no auth, no sidebar.
// This page is opened by next-of-kin on their phone via a WhatsApp link.
export default function ConsentLayout({ children }: { children: ReactNode }) {
  return <>{children}</>
}
