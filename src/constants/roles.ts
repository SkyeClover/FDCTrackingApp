import type { CurrentUserRole } from '../types'

/** Highest → lowest echelon for view semantics */
export const ECHELON_ORDER = ['brigade', 'battalion', 'boc', 'poc'] as const

const LABELS: Record<CurrentUserRole['type'], string> = {
  brigade: 'Brigade',
  battalion: 'Battalion',
  boc: 'BOC',
  poc: 'POC',
}

export function formatRoleDisplay(role: CurrentUserRole): string {
  return `${LABELS[role.type]}: ${role.name}`
}
