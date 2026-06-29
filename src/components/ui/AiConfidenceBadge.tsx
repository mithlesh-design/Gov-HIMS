"use client"

import { cn } from "@/lib/utils"
import { confidenceColor, confidenceBorderColor } from "@/lib/ai-helpers"
import type { ConfidenceTier } from "@/types/ai"
import { Info } from "lucide-react"
import { useState } from "react"

interface AiConfidenceBadgeProps {
  confidence: number
  tier: ConfidenceTier
  reasoning?: string
  className?: string
}

export function AiConfidenceBadge({ confidence, tier, reasoning, className }: AiConfidenceBadgeProps) {
  const [showTooltip, setShowTooltip] = useState(false)
  const pct = Math.round(confidence * 100)
  const label = tier === 'high' ? 'High Confidence' : tier === 'medium' ? 'Review Required' : 'Low Confidence'

  return (
    <div className={cn("relative inline-flex items-center gap-1.5", className)}>
      <span className={cn(
        "inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full border",
        confidenceColor(tier),
        confidenceBorderColor(tier),
        tier === 'high' ? 'bg-green-50' : tier === 'medium' ? 'bg-amber-50' : 'bg-red-50'
      )}>
        <span className={cn("h-1.5 w-1.5 rounded-full flex-shrink-0", tier === 'high' ? 'bg-green-500' : tier === 'medium' ? 'bg-amber-500' : 'bg-red-500')} />
        {pct}% · {label}
      </span>
      {reasoning && (
        <button
          onMouseEnter={() => setShowTooltip(true)}
          onMouseLeave={() => setShowTooltip(false)}
          className="text-slate-400 hover:text-slate-600 transition-colors"
          aria-label="AI reasoning"
        >
          <Info className="h-3.5 w-3.5" />
        </button>
      )}
      {showTooltip && reasoning && (
        <div className="absolute bottom-full left-0 mb-2 w-72 bg-slate-900 text-white text-xs rounded-lg p-3 shadow-xl z-50 leading-relaxed">
          <p className="font-semibold mb-1 text-slate-300">AI Reasoning</p>
          <p>{reasoning}</p>
          <div className="absolute top-full left-4 w-0 h-0 border-l-4 border-r-4 border-t-4 border-l-transparent border-r-transparent border-t-slate-900" />
        </div>
      )}
    </div>
  )
}
