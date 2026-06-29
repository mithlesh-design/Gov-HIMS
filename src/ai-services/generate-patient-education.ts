import { wrapAiResponse } from '@/lib/ai-helpers'
import type { AiEnvelope } from '@/types/ai'

export type EducationFormat = 'discharge_instructions' | 'diet_guide' | 'medication_guide' | 'red_flags'
export type LiteracyLevel = 'basic' | 'standard' | 'advanced'

export interface PatientEducationParams {
  condition: string
  language: 'en' | 'hi'
  literacyLevel: LiteracyLevel
  format: EducationFormat
}

export interface PatientEducationContent {
  title: string
  format: EducationFormat
  language: 'en' | 'hi'
  sections: Array<{ heading: string; points: string[] }>
  keyMessage: string
}

const CONTENT_LIBRARY: Record<string, Partial<Record<EducationFormat, PatientEducationContent>>> = {
  'diabetes': {
    discharge_instructions: {
      title: 'Diabetes — Discharge Instructions',
      format: 'discharge_instructions',
      language: 'en',
      keyMessage: 'Monitor your blood sugar daily and take your medications as prescribed.',
      sections: [
        {
          heading: 'Medicines',
          points: ['Take your tablets/insulin at the same time every day.', 'Do not skip doses even if you feel well.', 'Carry your medicines when travelling.'],
        },
        {
          heading: 'Diet',
          points: ['Avoid sugar, white rice, and maida.', 'Eat small meals every 3–4 hours.', 'Include green vegetables, whole grains, and protein in every meal.'],
        },
        {
          heading: 'Monitoring',
          points: ['Check blood sugar before breakfast daily.', 'Record readings in your diary.', 'Target fasting: 80–130 mg/dL.'],
        },
      ],
    },
    red_flags: {
      title: 'Diabetes — Warning Signs',
      format: 'red_flags',
      language: 'en',
      keyMessage: 'Seek emergency care immediately if you experience any of these symptoms.',
      sections: [
        {
          heading: 'Go to Emergency NOW if you have:',
          points: ['Blood sugar > 300 mg/dL or < 60 mg/dL', 'Confusion or difficulty speaking', 'Chest pain or shortness of breath', 'Vomiting that does not stop', 'Deep, rapid breathing with fruity breath smell'],
        },
      ],
    },
  },
  'hypertension': {
    discharge_instructions: {
      title: 'Hypertension — Discharge Instructions',
      format: 'discharge_instructions',
      language: 'en',
      keyMessage: 'Take your BP medicines every day — even when you feel fine.',
      sections: [
        { heading: 'Medicines', points: ['Take your BP tablets at the same time daily.', 'Never stop suddenly — consult doctor first.'] },
        { heading: 'Lifestyle', points: ['Reduce salt in food.', '30 minutes walking daily.', 'Quit smoking and limit alcohol.'] },
        { heading: 'Monitoring', points: ['Check BP twice weekly.', 'Target: < 130/80 mmHg.', 'Keep a BP diary.'] },
      ],
    },
    red_flags: {
      title: 'Hypertension — Warning Signs',
      format: 'red_flags',
      language: 'en',
      keyMessage: 'Call emergency if BP is very high with symptoms.',
      sections: [
        { heading: 'Seek Emergency Care For:', points: ['BP > 180/120 mmHg', 'Severe headache or visual changes', 'Chest pain or shortness of breath', 'Weakness or numbness on one side'] },
      ],
    },
  },
}

const HINDI_MAP: Partial<Record<EducationFormat, (condition: string) => PatientEducationContent>> = {
  discharge_instructions: (condition) => ({
    title: `${condition} — छुट्टी के निर्देश`,
    format: 'discharge_instructions',
    language: 'hi',
    keyMessage: 'अपनी दवाइयाँ नियमित रूप से लें और डॉक्टर के निर्देशों का पालन करें।',
    sections: [
      { heading: 'दवाइयाँ', points: ['रोज़ एक ही समय पर दवाई लें।', 'दवाई कभी बंद न करें बिना डॉक्टर से पूछे।'] },
      { heading: 'आहार', points: ['नमक, चीनी और तला हुआ खाना कम करें।', 'हरी सब्जियाँ और दालें खाएं।'] },
      { heading: 'फॉलो-अप', points: ['2 हफ्ते बाद डॉक्टर से मिलें।', 'कोई भी नई परेशानी हो तो तुरंत अस्पताल आएं।'] },
    ],
  }),
}

function buildFallback(params: PatientEducationParams): PatientEducationContent {
  if (params.language === 'hi' && HINDI_MAP[params.format]) {
    return HINDI_MAP[params.format]!(params.condition)
  }
  return {
    title: `${params.condition} — ${params.format.replace(/_/g, ' ')}`,
    format: params.format,
    language: params.language,
    keyMessage: `Follow your care plan for ${params.condition} as advised by your doctor.`,
    sections: [
      {
        heading: 'Key Instructions',
        points: ['Take all medicines as prescribed.', 'Attend all follow-up appointments.', 'Contact us if symptoms worsen.'],
      },
    ],
  }
}

export async function generatePatientEducation(
  params: PatientEducationParams,
): Promise<AiEnvelope<PatientEducationContent>> {
  await new Promise(r => setTimeout(r, 400))

  const conditionKey = params.condition.toLowerCase().replace(/\s+/g, '_').replace(/type_\d/, '')
    .replace('diabetes', 'diabetes').replace('hypertension', 'hypertension')

  const content =
    CONTENT_LIBRARY[conditionKey]?.[params.format]
    ?? buildFallback(params)

  const langContent = params.language === 'hi' && content.language !== 'hi'
    ? buildFallback(params)
    : content

  return wrapAiResponse<PatientEducationContent>(
    langContent,
    0.87,
    `Patient education generated for "${params.condition}" (${params.format}, ${params.language}, ${params.literacyLevel} literacy).`,
  )
}
