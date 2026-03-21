import type { Battalion, BOC, Brigade, POC } from '../../types'

/** Stored in roster `echelonRole`; matches CurrentUserRole echelon types. */
export type EchelonRoleType = 'brigade' | 'battalion' | 'boc' | 'poc'

/** @deprecated use EchelonRoleType + echelonRoleValue — kept for imports */
export const POC_ROLE_PREFIX = 'poc:' as const

export interface OrgUnitsSlice {
  brigades: Brigade[]
  battalions: Battalion[]
  bocs: BOC[]
  pocs: POC[]
}

export function echelonRoleValue(type: EchelonRoleType, id: string): string {
  return `${type}:${id}`
}

export function parseEchelonRole(s: string): { type: EchelonRoleType; id: string } | null {
  const m = /^(brigade|battalion|boc|poc):(.+)$/.exec(s.trim())
  if (!m) return null
  const id = m[2]
  if (!id) return null
  return { type: m[1] as EchelonRoleType, id }
}

/** Back-compat for older code that only used `pocRoleValue`. */
export function pocRoleValue(pocId: string): string {
  return echelonRoleValue('poc', pocId)
}

export function formatEchelonRoleForDisplay(echelonRole: string, org: OrgUnitsSlice): string {
  const parsed = parseEchelonRole(echelonRole)
  if (parsed) {
    if (parsed.type === 'brigade') {
      const b = org.brigades.find((x) => x.id === parsed.id)
      return b ? b.name : echelonRole
    }
    if (parsed.type === 'battalion') {
      const b = org.battalions.find((x) => x.id === parsed.id)
      return b ? b.name : echelonRole
    }
    if (parsed.type === 'boc') {
      const b = org.bocs.find((x) => x.id === parsed.id)
      return b ? b.name : echelonRole
    }
    const p = org.pocs.find((x) => x.id === parsed.id)
    return p ? p.name : echelonRole
  }
  return echelonRole || '—'
}

export interface EchelonSelectGroup {
  label: string
  options: { value: string; label: string }[]
}

export function groupPocsForSelect(pocs: POC[], bocs: BOC[]): { label: string; pocs: POC[] }[] {
  const bocName = (id: string | undefined) => bocs.find((b) => b.id === id)?.name ?? 'Battery'
  const withBoc = pocs.filter((p) => p.bocId)
  const without = pocs.filter((p) => !p.bocId)
  const byBoc = new Map<string, POC[]>()
  for (const p of withBoc) {
    const bid = p.bocId ?? ''
    if (!byBoc.has(bid)) byBoc.set(bid, [])
    byBoc.get(bid)!.push(p)
  }
  const groups: { label: string; pocs: POC[] }[] = []
  for (const [bid, list] of byBoc) {
    list.sort((a, b) => a.name.localeCompare(b.name))
    groups.push({ label: bocName(bid), pocs: list })
  }
  groups.sort((a, b) => a.label.localeCompare(b.label))
  if (without.length) {
    without.sort((a, b) => a.name.localeCompare(b.name))
    groups.push({ label: 'Not linked to battery', pocs: without })
  }
  return groups
}

export function buildEchelonSelectGroups(org: OrgUnitsSlice): EchelonSelectGroup[] {
  const groups: EchelonSelectGroup[] = []
  const brigades = [...org.brigades].sort((a, b) => a.name.localeCompare(b.name))
  if (brigades.length) {
    groups.push({
      label: 'Brigades',
      options: brigades.map((b) => ({ value: echelonRoleValue('brigade', b.id), label: b.name })),
    })
  }
  const battalions = [...org.battalions].sort((a, b) => a.name.localeCompare(b.name))
  if (battalions.length) {
    groups.push({
      label: 'Battalions',
      options: battalions.map((b) => ({ value: echelonRoleValue('battalion', b.id), label: b.name })),
    })
  }
  const bocs = [...org.bocs].sort((a, b) => a.name.localeCompare(b.name))
  if (bocs.length) {
    groups.push({
      label: 'Batteries (BOC)',
      options: bocs.map((b) => ({ value: echelonRoleValue('boc', b.id), label: b.name })),
    })
  }
  const pocGroups = groupPocsForSelect(org.pocs, org.bocs)
  for (const g of pocGroups) {
    groups.push({
      label: `PLT FDC — ${g.label}`,
      options: g.pocs.map((p) => ({ value: echelonRoleValue('poc', p.id), label: p.name })),
    })
  }
  return groups
}

export function firstEchelonRoleValue(org: OrgUnitsSlice): string {
  const groups = buildEchelonSelectGroups(org)
  for (const g of groups) {
    if (g.options.length) return g.options[0].value
  }
  return ''
}

/** Immediate parent unit id in Management hierarchy (for Parent ID column). */
export function getParentUnitIdForEchelonRole(echelonRole: string, org: OrgUnitsSlice): string | null {
  const parsed = parseEchelonRole(echelonRole)
  if (!parsed) return null
  switch (parsed.type) {
    case 'brigade':
      return null
    case 'battalion': {
      const bn = org.battalions.find((b) => b.id === parsed.id)
      return bn?.brigadeId ?? null
    }
    case 'boc': {
      const boc = org.bocs.find((b) => b.id === parsed.id)
      return boc?.battalionId ?? null
    }
    case 'poc': {
      const poc = org.pocs.find((p) => p.id === parsed.id)
      return poc?.bocId ?? null
    }
    default:
      return null
  }
}
