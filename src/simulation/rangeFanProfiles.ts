import type { SimRangeFanConfig } from '../types'

// Starter defaults; user-tunable later from settings/UI.
export const DEFAULT_SIM_RANGE_FAN_CONFIG: SimRangeFanConfig = {
  enabled: false,
  showLabels: true,
  profiles: [
    { roundType: 'M26', minRangeKm: 10, maxRangeKm: 32, label: 'M26', color: '#f4b400' },
    { roundType: 'M30', minRangeKm: 15, maxRangeKm: 84, label: 'M30 GMLRS', color: '#4e8ef7' },
    { roundType: 'M31', minRangeKm: 15, maxRangeKm: 84, label: 'M31 GMLRS', color: '#2ea043' },
  ],
}
