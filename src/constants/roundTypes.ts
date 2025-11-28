import { RoundType, RoundTypeConfig } from '../types'

// Re-export RoundType for convenience
export type { RoundType, RoundTypeConfig }

export const DEFAULT_ROUND_TYPES: Record<string, RoundTypeConfig> = {
  M28A1: { name: 'M28A1', enabled: true },
  M26: { name: 'M26', enabled: true },
  M31: { name: 'M31', enabled: true },
  M30: { name: 'M30', enabled: true },
  M57: { name: 'M57', enabled: true },
  M39: { name: 'M39', enabled: true },
}

// Helper function to get enabled round types as options
export function getEnabledRoundTypeOptions(roundTypes: Record<string, RoundTypeConfig>) {
  return Object.values(roundTypes)
    .filter((config) => config.enabled)
    .map((config) => ({
      value: config.name,
      label: config.name,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

// Helper function to get all round types as options (for settings)
export function getAllRoundTypeOptions(roundTypes: Record<string, RoundTypeConfig>) {
  return Object.values(roundTypes)
    .map((config) => ({
      value: config.name,
      label: config.name,
      enabled: config.enabled,
    }))
    .sort((a, b) => a.label.localeCompare(b.label))
}

