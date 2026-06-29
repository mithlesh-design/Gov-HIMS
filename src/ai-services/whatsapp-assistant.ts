import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'
import type { IntentType, WhatsAppMessage } from '@/store/useWhatsAppStore'

export interface WhatsAppClassification {
  intent: IntentType
  detectedLanguage: 'en' | 'hi'
  confidence: number
  extractedEntities: {
    date?: string
    doctorName?: string
    symptom?: string
    department?: string
  }
  suggestedResponse: string
  requiresOTP: boolean
  escalateToHuman: boolean
}

const INTENT_KEYWORDS: Array<{ intent: IntentType; keywords: string[]; requiresOTP?: boolean; escalate?: boolean }> = [
  { intent: 'APPOINTMENT_BOOK', keywords: ['book', 'appointment', 'schedule', 'slot', 'doctor', 'consult', 'अपॉइंटमेंट', 'बुक', 'मिलना'] },
  { intent: 'APPOINTMENT_QUERY', keywords: ['when is my appointment', 'appointment time', 'appointment date', 'confirm appointment'] },
  { intent: 'REPORT_REQUEST', keywords: ['report', 'result', 'lab', 'test result', 'reports send', 'रिपोर्ट', 'परिणाम'], requiresOTP: true },
  { intent: 'PRESCRIPTION_REMINDER', keywords: ['medicine', 'prescription', 'tablet', 'dosage', 'दवाई', 'दवा', 'prescription reminder'] },
  { intent: 'FOLLOWUP_BOOK', keywords: ['follow up', 'follow-up', 'revisit', 'next visit', 'फॉलो अप'] },
  { intent: 'INTAKE_ASSIST', keywords: ['register', 'new patient', 'first time', 'check in', 'registration', 'नया मरीज'] },
  { intent: 'ESCALATION_NEEDED', keywords: ['emergency', 'urgent', 'critical', 'ambulance', 'very sick', 'bahut bura', 'बहुत खराब', 'bahut dard', 'बहुत दर्द'], escalate: true },
]

const HINDI_MARKERS = ['मेरा', 'मुझे', 'है', 'हूं', 'और', 'कैसे', 'बुखार', 'दर्द', 'लेकिन', 'बहुत', 'नहीं', 'करना', 'मैं']

function detectLanguage(text: string): 'en' | 'hi' {
  const lower = text.toLowerCase()
  return HINDI_MARKERS.some(m => lower.includes(m)) ? 'hi' : 'en'
}

function classifyIntent(text: string): { intent: IntentType; requiresOTP: boolean; escalate: boolean } {
  const lower = text.toLowerCase()
  for (const rule of INTENT_KEYWORDS) {
    if (rule.keywords.some(k => lower.includes(k))) {
      return { intent: rule.intent, requiresOTP: rule.requiresOTP ?? false, escalate: rule.escalate ?? false }
    }
  }
  return { intent: 'GENERAL_QUERY', requiresOTP: false, escalate: false }
}

function buildResponse(intent: IntentType, lang: 'en' | 'hi', entities: WhatsAppClassification['extractedEntities']): string {
  const responses: Partial<Record<IntentType, { en: string; hi: string }>> = {
    APPOINTMENT_BOOK: {
      en: `I can help you book an appointment${entities.department ? ` with ${entities.department}` : ''}. What date and time works for you?`,
      hi: `मैं आपकी अपॉइंटमेंट बुक करने में मदद कर सकता हूं${entities.department ? ` ${entities.department} के साथ` : ''}। आपको कौन सी तारीख और समय सुविधाजनक है?`,
    },
    APPOINTMENT_QUERY: {
      en: 'Let me check your appointment details. Please share your registered phone number.',
      hi: 'मैं आपकी अपॉइंटमेंट की जानकारी देख रहा हूं। कृपया अपना पंजीकृत फोन नंबर साझा करें।',
    },
    REPORT_REQUEST: {
      en: 'To share your reports securely, I need to verify your identity. An OTP has been sent to your registered number.',
      hi: 'आपकी रिपोर्ट सुरक्षित रूप से साझा करने के लिए, मुझे आपकी पहचान सत्यापित करनी होगी। OTP आपके पंजीकृत नंबर पर भेजा गया है।',
    },
    PRESCRIPTION_REMINDER: {
      en: 'I can send you a reminder for your medicines. Please verify your identity to access prescription details.',
      hi: 'मैं आपकी दवाइयों के लिए रिमाइंडर भेज सकता हूं। नुस्खे की जानकारी के लिए कृपया अपनी पहचान सत्यापित करें।',
    },
    FOLLOWUP_BOOK: {
      en: 'I can schedule a follow-up appointment for you. What date works best?',
      hi: 'मैं आपके लिए फॉलो-अप अपॉइंटमेंट शेड्यूल कर सकता हूं। कौन सी तारीख सबसे अच्छी है?',
    },
    INTAKE_ASSIST: {
      en: 'I can help you register as a new patient. Please visit our check-in portal or I can start the process here.',
      hi: 'मैं आपको नए मरीज के रूप में पंजीकृत करने में मदद कर सकता हूं। हमारे चेक-इन पोर्टल पर जाएं या मैं यहां प्रक्रिया शुरू कर सकता हूं।',
    },
    ESCALATION_NEEDED: {
      en: 'I understand this is urgent. I am connecting you to our reception team immediately. Please hold.',
      hi: 'मैं समझता हूं कि यह जरूरी है। मैं आपको तुरंत हमारी रिसेप्शन टीम से जोड़ रहा हूं। कृपया प्रतीक्षा करें।',
    },
    GENERAL_QUERY: {
      en: 'Thank you for reaching Agentix HIMS. How can I assist you today?',
      hi: 'कैलाश हेल्थकेयर से संपर्क करने के लिए धन्यवाद। आज मैं आपकी कैसे मदद कर सकता हूं?',
    },
  }
  const r = responses[intent] ?? responses.GENERAL_QUERY!
  return lang === 'hi' ? r.hi : r.en
}

function extractEntities(text: string): WhatsAppClassification['extractedEntities'] {
  const lower = text.toLowerCase()
  const entities: WhatsAppClassification['extractedEntities'] = {}

  const dateMatch = lower.match(/\b(today|tomorrow|monday|tuesday|wednesday|thursday|friday|saturday|sunday|आज|कल)\b/)
  if (dateMatch) entities.date = dateMatch[1]

  const deptMatch = lower.match(/\b(cardio|ortho|neuro|derma|ent|gastro|general medicine|paediatric|gynaec)\b/)
  if (deptMatch) {
    const deptMap: Record<string, string> = { cardio: 'Cardiology', ortho: 'Orthopedics', neuro: 'Neurology', derma: 'Dermatology', ent: 'ENT', gastro: 'Gastroenterology' }
    entities.department = deptMap[deptMatch[1]] ?? deptMatch[1]
  }

  return entities
}

export async function classifyWhatsAppMessage(
  message: string,
  _history: WhatsAppMessage[],
): Promise<AiEnvelope<WhatsAppClassification>> {
  await new Promise(r => setTimeout(r, 250))

  const lang = detectLanguage(message)
  const { intent, requiresOTP, escalate } = classifyIntent(message)
  const entities = extractEntities(message)
  const response = buildResponse(intent, lang, entities)

  return wrapAiResponse<WhatsAppClassification>(
    {
      intent,
      detectedLanguage: lang,
      confidence: intent === 'UNKNOWN' || intent === 'GENERAL_QUERY' ? 0.6 : 0.88,
      extractedEntities: entities,
      suggestedResponse: response,
      requiresOTP,
      escalateToHuman: escalate,
    },
    intent === 'GENERAL_QUERY' ? 0.6 : 0.88,
    `Intent: ${intent} | Language: ${lang} | OTP required: ${requiresOTP} | Escalate: ${escalate}`,
  )
}
