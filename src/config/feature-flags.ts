export type Tier = 'core' | 'ai_assist' | 'ai_command'

export interface FeatureFlags {
  tier: Tier
  shadowMode: boolean
  copilotEnabled: boolean
  journeyTrackingEnabled: boolean
  qualityCockpitEnabled: boolean
  registryDashboardEnabled: boolean
  patientEducationEnabled: boolean
  whatsappAssistantEnabled: boolean
  familyTrackingEnabled: boolean
  voiceIntakeEnabled: boolean
  documentationEngineEnabled: boolean
  aiPerformanceDashboardEnabled: boolean
}

const TIER_PRESETS: Record<Tier, FeatureFlags> = {
  core: {
    tier: 'core',
    shadowMode: false,
    copilotEnabled: false,
    journeyTrackingEnabled: false,
    qualityCockpitEnabled: false,
    registryDashboardEnabled: false,
    patientEducationEnabled: false,
    whatsappAssistantEnabled: false,
    familyTrackingEnabled: false,
    voiceIntakeEnabled: false,
    documentationEngineEnabled: false,
    aiPerformanceDashboardEnabled: false,
  },
  ai_assist: {
    tier: 'ai_assist',
    shadowMode: false,
    copilotEnabled: true,
    journeyTrackingEnabled: true,
    qualityCockpitEnabled: false,
    registryDashboardEnabled: false,
    patientEducationEnabled: true,
    whatsappAssistantEnabled: true,
    familyTrackingEnabled: true,
    voiceIntakeEnabled: true,
    documentationEngineEnabled: true,
    aiPerformanceDashboardEnabled: false,
  },
  ai_command: {
    tier: 'ai_command',
    shadowMode: false,
    copilotEnabled: true,
    journeyTrackingEnabled: true,
    qualityCockpitEnabled: true,
    registryDashboardEnabled: true,
    patientEducationEnabled: true,
    whatsappAssistantEnabled: true,
    familyTrackingEnabled: true,
    voiceIntakeEnabled: true,
    documentationEngineEnabled: true,
    aiPerformanceDashboardEnabled: true,
  },
}

export const FLAGS: FeatureFlags = TIER_PRESETS['ai_command']
