"use client"

import { ThumbsUp, ThumbsDown } from "lucide-react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import { useFeedbackStore } from "@/store/useFeedbackStore"
import { useAuditStore } from "@/store/useAuditStore"
import { useAuthStore } from "@/store/useAuthStore"

interface AiFeedbackButtonsProps {
  featureId: string
  envelopeId?: string
  className?: string
}

export function AiFeedbackButtons({ featureId, envelopeId, className }: AiFeedbackButtonsProps) {
  const [voted, setVoted] = useState<'up' | 'down' | null>(null)
  const addFeedback = useFeedbackStore((s) => s.addFeedback)
  const log = useAuditStore((s) => s.log)
  const { currentUser } = useAuthStore()

  const handleVote = (vote: 'up' | 'down') => {
    if (voted) return
    setVoted(vote)
    addFeedback({
      featureId,
      envelopeId,
      vote,
      userId: currentUser?.id ?? 'unknown',
      userName: currentUser?.name ?? 'Unknown',
    })
    log({
      userId: currentUser?.id ?? 'unknown',
      userName: currentUser?.name ?? 'Unknown',
      action: vote === 'up' ? 'ai_feedback_up' : 'ai_feedback_down',
      resource: 'ai_feature',
      resourceId: featureId,
      detail: `AI feedback ${vote} on feature: ${featureId}`,
    })
  }

  return (
    <div className={cn("flex items-center gap-1", className)} aria-label="Was this AI suggestion helpful?">
      <span className="text-[10px] text-slate-400 mr-1">Helpful?</span>
      <button
        onClick={() => handleVote('up')}
        disabled={!!voted}
        aria-label="Thumbs up — helpful"
        className={cn(
          "p-1 rounded transition-colors",
          voted === 'up' ? 'text-green-600 bg-green-50' : 'text-slate-400 hover:text-green-600 hover:bg-green-50',
          voted && voted !== 'up' && 'opacity-40 cursor-not-allowed'
        )}
      >
        <ThumbsUp className="h-3.5 w-3.5" />
      </button>
      <button
        onClick={() => handleVote('down')}
        disabled={!!voted}
        aria-label="Thumbs down — not helpful"
        className={cn(
          "p-1 rounded transition-colors",
          voted === 'down' ? 'text-red-600 bg-red-50' : 'text-slate-400 hover:text-red-600 hover:bg-red-50',
          voted && voted !== 'down' && 'opacity-40 cursor-not-allowed'
        )}
      >
        <ThumbsDown className="h-3.5 w-3.5" />
      </button>
      {voted && <span className="text-[10px] text-slate-400 ml-1">Thanks!</span>}
    </div>
  )
}
