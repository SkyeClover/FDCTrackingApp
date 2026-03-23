import { describe, expect, it } from 'vitest'
import { suggestReassignmentTarget } from './reassignmentRules'

describe('suggestReassignmentTarget', () => {
  it('prefers POC candidate', () => {
    const r = suggestReassignmentTarget({
      survivorGroup: { id: 'sg1', sourceUnitIds: ['poc:a'] },
      candidates: [
        { unitId: 'bn1', kind: 'battalion' },
        { unitId: 'p2', kind: 'poc' },
      ],
    })
    expect(r?.targetUnitId).toBe('p2')
  })

  it('returns null when no candidates', () => {
    expect(
      suggestReassignmentTarget({
        survivorGroup: { id: 'sg1', sourceUnitIds: [] },
        candidates: [],
      })
    ).toBeNull()
  })
})
