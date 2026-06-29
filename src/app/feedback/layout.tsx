import { RoleGuard } from "@/components/layout/RoleGuard"

export default function FeedbackLayout({ children }: { children: React.ReactNode }) {
  return <RoleGuard allowedRole="feedback_analyst">{children}</RoleGuard>
}
