/**
 * RT-1523 / PKT transport placeholder — same sync semantics as IP when implemented.
 * UI uses bearer === 'radio1523' to show “coming soon” and skip browser push.
 */
export const RADIO_BEARER_ID = 'radio1523' as const

export function isRadioBearer(bearer: string): boolean {
  return bearer === RADIO_BEARER_ID || bearer === '1523'
}
