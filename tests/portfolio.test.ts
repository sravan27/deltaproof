import { describe, expect, it } from 'vitest'
import { buildDashboard } from '../shared/engine'
import { LOOP_FIXTURES } from '../shared/fixtures'
import { buildPortfolioBrief } from '../shared/portfolio'

describe('DeltaProof portfolio command brief', () => {
  it('turns multiple dashboards into a ranked weekly command memo', () => {
    const dashboards = LOOP_FIXTURES.map((fixture) =>
      buildDashboard({
        workspaceName: fixture.workspaceName,
        artifacts: fixture.artifacts,
      }),
    )

    const brief = buildPortfolioBrief(dashboards)

    expect(brief.workspacesTracked).toBe(dashboards.length)
    expect(brief.priorities.length).toBe(dashboards.length)
    expect(brief.revenueAtRiskTotal).toBeGreaterThan(0)
    expect(brief.shadowPipelineTotal).toBeGreaterThan(0)
    expect(brief.mustDoThisWeek.length).toBeGreaterThan(0)
    expect(brief.markdown).toContain('## Priority Queue')
    expect(brief.priorities[0]!.decisionWindowDays).toBeLessThanOrEqual(
      brief.priorities[brief.priorities.length - 1]!.decisionWindowDays,
    )
  })
})
