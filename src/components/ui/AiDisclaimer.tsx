"use client"

import { Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface AiDisclaimerProps {
  className?: string
  compact?: boolean
}

export function AiDisclaimer({ className, compact = false }: AiDisclaimerProps) {
  if (compact) {
    return (
      <p className={cn("text-[10px] text-slate-400 italic", className)}>
        AI suggestions — verify before acting
      </p>
    )
  }
  return (
    <div className={cn("flex items-start gap-2 px-3 py-2 bg-slate-50 border border-slate-200 rounded-lg", className)}>
      <Bot className="h-3.5 w-3.5 text-slate-400 flex-shrink-0 mt-0.5" />
      <p className="text-[11px] text-slate-500 leading-relaxed">
        <span className="font-semibold text-slate-600">AI-generated</span> — suggestions are for clinical decision support only. Always verify before acting on clinical data.
      </p>
    </div>
  )
}
