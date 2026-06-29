"use client"

import { useRef, useEffect, useCallback, useState } from "react"
import { Trash2, PenLine } from "lucide-react"

interface SignaturePadProps {
  onSignature: (base64: string) => void
  onClear: () => void
  disabled?: boolean
}

export function SignaturePad({ onSignature, onClear, disabled }: SignaturePadProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const drawing = useRef(false)
  const [hasSignature, setHasSignature] = useState(false)

  // Draw the placeholder guide line
  const drawPlaceholder = useCallback(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext('2d')
    if (!ctx) return
    ctx.clearRect(0, 0, canvas.width, canvas.height)
    // Dashed baseline
    ctx.beginPath()
    ctx.setLineDash([6, 4])
    ctx.strokeStyle = '#CBD5E1'
    ctx.lineWidth = 1
    ctx.moveTo(20, canvas.height - 30)
    ctx.lineTo(canvas.width - 20, canvas.height - 30)
    ctx.stroke()
    ctx.setLineDash([])
    // "Sign here" text
    ctx.font = '13px system-ui, sans-serif'
    ctx.fillStyle = '#94A3B8'
    ctx.textAlign = 'center'
    ctx.fillText('Sign here', canvas.width / 2, canvas.height / 2 - 4)
  }, [])

  useEffect(() => {
    drawPlaceholder()
  }, [drawPlaceholder])

  const getPos = (e: React.PointerEvent<HTMLCanvasElement>): { x: number; y: number } => {
    const canvas = canvasRef.current!
    const rect = canvas.getBoundingClientRect()
    const scaleX = canvas.width / rect.width
    const scaleY = canvas.height / rect.height
    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    }
  }

  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (disabled) return
    drawing.current = true
    const canvas = canvasRef.current!
    canvas.setPointerCapture(e.pointerId)
    if (!hasSignature) {
      // Clear placeholder on first stroke
      const ctx = canvas.getContext('2d')!
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.setLineDash([])
    }
    const ctx = canvas.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!drawing.current || disabled) return
    const ctx = canvasRef.current!.getContext('2d')!
    const { x, y } = getPos(e)
    ctx.lineTo(x, y)
    ctx.strokeStyle = '#1E293B'
    ctx.lineWidth = 2.2
    ctx.lineCap = 'round'
    ctx.lineJoin = 'round'
    ctx.stroke()
    ctx.beginPath()
    ctx.moveTo(x, y)
  }

  const handlePointerUp = () => {
    if (!drawing.current) return
    drawing.current = false
    setHasSignature(true)
    const canvas = canvasRef.current!
    onSignature(canvas.toDataURL('image/png'))
  }

  const handleClear = () => {
    setHasSignature(false)
    drawPlaceholder()
    onClear()
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-semibold">
          <PenLine className="h-3.5 w-3.5" />
          Signature
        </div>
        {hasSignature && !disabled && (
          <button
            type="button"
            onClick={handleClear}
            className="inline-flex items-center gap-1 text-xs text-red-500 hover:text-red-700 font-semibold transition-colors"
          >
            <Trash2 className="h-3 w-3" /> Clear
          </button>
        )}
      </div>
      <canvas
        ref={canvasRef}
        width={600}
        height={160}
        className="w-full rounded-xl border-2 border-dashed border-slate-200 bg-white cursor-crosshair"
        style={{ touchAction: 'none', maxHeight: '160px' }}
        onPointerDown={handlePointerDown}
        onPointerMove={handlePointerMove}
        onPointerUp={handlePointerUp}
        onPointerLeave={handlePointerUp}
      />
    </div>
  )
}
