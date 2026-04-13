import { describe, expect, it } from 'vitest'
import { buildDashboard } from '../shared/engine'
import { DEMO_ARTIFACTS } from '../shared/fixtures'
import { buildHistoryAwareWatchtower, shouldPersistDashboard } from '../worker/lib/watchtower'

describe('DeltaProof watchtower', () => {
  it('flags material movement between runs', () => {
    const previous = buildDashboard({
      workspaceName: 'Northstar Studio',
      artifacts: DEMO_ARTIFACTS.filter((artifact) => artifact.kind !== 'delivery_note'),
    })
    const current = buildDashboard({
      workspaceName: 'Northstar Studio',
      artifacts: DEMO_ARTIFACTS,
    })

    const watchtower = buildHistoryAwareWatchtower(current, [
      {
        createdAt: '2026-03-20T10:00:00.000Z',
        dashboard: previous,
      },
    ])

    expect(watchtower.state).toBe('warming')
    expect(watchtower.pulses.length).toBe(2)
    expect(watchtower.changes.some((change) => change.kind === 'stage_advance')).toBe(true)
  })

  it('skips duplicate persistence inside the heartbeat window', () => {
    const current = buildDashboard({
      workspaceName: 'Northstar Studio',
      artifacts: DEMO_ARTIFACTS,
    })

    expect(
      shouldPersistDashboard({
        current,
        latest: {
          createdAt: '2026-04-12T10:00:00.000Z',
          dashboard: current,
        },
        nowIso: '2026-04-12T18:00:00.000Z',
      }),
    ).toBe(false)
  })
})
