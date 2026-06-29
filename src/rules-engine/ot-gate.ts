export interface ChecklistItemInput {
  id: string
  label: string
  isCritical: boolean
  status: 'verified' | 'pending' | 'not_applicable'
}

export interface OTGateResult {
  canProceed: boolean
  blockingItems: string[]
  pendingNonCritical: string[]
  allItemsVerified: boolean
}

export function canProceedToOT(checklist: ChecklistItemInput[]): OTGateResult {
  const blockingItems = checklist
    .filter((i) => i.isCritical && i.status === 'pending')
    .map((i) => i.label)
  const pendingNonCritical = checklist
    .filter((i) => !i.isCritical && i.status === 'pending')
    .map((i) => i.label)
  const allItemsVerified = checklist.every((i) => i.status === 'verified' || i.status === 'not_applicable')
  return { canProceed: blockingItems.length === 0, blockingItems, pendingNonCritical, allItemsVerified }
}
