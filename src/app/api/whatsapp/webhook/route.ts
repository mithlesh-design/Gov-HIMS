import { NextRequest, NextResponse } from 'next/server'
import { classifyWhatsAppMessage } from '@/ai-services/whatsapp-assistant'
import type { WhatsAppMessage } from '@/store/useWhatsAppStore'

// In-memory conversation state — client-side useWhatsAppStore is seeded with demo data
// Production would use a database
const conversationHistory = new Map<string, WhatsAppMessage[]>()

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { phone?: string; message?: string; threadId?: string }
    const { phone, message, threadId } = body

    if (!phone || !message) {
      return NextResponse.json({ error: 'phone and message are required' }, { status: 400 })
    }

    const id = threadId ?? phone
    const history = conversationHistory.get(id) ?? []

    const classification = await classifyWhatsAppMessage(message, history)
    const { intent, suggestedResponse, requiresOTP, escalateToHuman, detectedLanguage } = classification.data

    // Append incoming message to history
    const incomingMsg: WhatsAppMessage = {
      id: `msg-${Date.now()}`,
      from: 'patient',
      text: message,
      timestamp: new Date().toISOString(),
      intent,
      requiresOTP,
    }
    history.push(incomingMsg)
    conversationHistory.set(id, history)

    console.log(`[WhatsApp Webhook] ${phone} → intent: ${intent} | lang: ${detectedLanguage} | OTP: ${requiresOTP} | escalate: ${escalateToHuman}`)

    return NextResponse.json({
      threadId: id,
      intent,
      detectedLanguage,
      suggestedResponse,
      requiresOTP,
      escalateToHuman,
      confidence: classification.confidence,
    })
  } catch (err) {
    console.error('[WhatsApp Webhook] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}

export async function GET() {
  return NextResponse.json({ status: 'WhatsApp webhook ready' })
}
