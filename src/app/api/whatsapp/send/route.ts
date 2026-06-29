import { NextRequest, NextResponse } from 'next/server'

export async function POST(req: NextRequest) {
  try {
    const body = await req.json() as { to?: string; message?: string; type?: string }
    const { to, message, type } = body

    if (!to || !message) {
      return NextResponse.json({ error: 'to and message are required' }, { status: 400 })
    }

    // Mock: log outbound message (production would call WhatsApp Business API)
    console.log(`[WhatsApp Outbound] → ${to} | type: ${type ?? 'text'} | msg: ${message.slice(0, 80)}`)

    return NextResponse.json({
      success: true,
      messageId: `wa-out-${Date.now()}`,
      to,
      deliveredAt: new Date().toISOString(),
    })
  } catch (err) {
    console.error('[WhatsApp Send] Error:', err)
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 })
  }
}
