export const ROUND_TYPES = {
  M28A1: 'M28A1',
  M26: 'M26',
  M31: 'M31',
  M30: 'M30',
} as const

export type RoundType = typeof ROUND_TYPES[keyof typeof ROUND_TYPES]

export const ROUND_TYPE_OPTIONS = [
  { value: ROUND_TYPES.M28A1, label: 'M28A1' },
  { value: ROUND_TYPES.M26, label: 'M26' },
  { value: ROUND_TYPES.M31, label: 'M31' },
  { value: ROUND_TYPES.M30, label: 'M30' },
]

