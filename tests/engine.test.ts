import { describe, expect, it } from 'vitest'
import { buildDashboard } from '../shared/engine'
import { DEMO_ARTIFACTS, LOOP_FIXTURES } from '../shared/fixtures'

describe('DeltaProof analysis engine', () => {
  it('surfaces meaningful revenue risk on the main demo scenario', () => {
    const dashboard = buildDashboard({
      workspaceName: 'Northstar Studio',
      artifacts: DEMO_ARTIFACTS,
    })

    expect(dashboard.overview.moneyAtRiskTotal).toBeGreaterThanOrEqual(12000)
    expect(dashboard.overview.shadowPipelineValue).toBeGreaterThanOrEqual(15000)
    expect(dashboard.overview.averageLeadDays).toBeGreaterThan(0)
    expect(dashboard.findings.some((finding) => finding.category === 'portal_access')).toBe(true)
    expect(dashboard.findings.some((finding) => finding.category === 'data_sync')).toBe(true)
    expect(dashboard.monetizationPaths.some((path) => path.type === 'pilot')).toBe(true)
    expect(dashboard.pressureTracks.some((track) => track.currentStage === 'shipped')).toBe(true)
    expect(dashboard.semanticMotifs.length).toBeGreaterThan(0)
    expect(dashboard.operatorConsole.costOfWaiting).toBeGreaterThan(0)
    expect(dashboard.operatorConsole.scenarios.length).toBeGreaterThanOrEqual(3)
    expect(dashboard.operatorConsole.moves.length).toBeGreaterThan(0)
    expect(dashboard.watchtower.pulses.length).toBeGreaterThan(0)
    expect(dashboard.decisionWindow.days).toBeGreaterThan(0)
    expect(dashboard.executiveBrief.decisionWindowLabel).toContain('day')
    expect(dashboard.executiveBrief.markdown).toContain('## Decision')
    expect(dashboard.executiveBrief.markdown).toContain('## Decision Window')
  })

  it('keeps every seeded loop fixture above its minimum recovered revenue', () => {
    for (const fixture of LOOP_FIXTURES) {
      const dashboard = buildDashboard({
        workspaceName: fixture.workspaceName,
        artifacts: fixture.artifacts,
      })

      expect(dashboard.overview.moneyAtRiskTotal).toBeGreaterThanOrEqual(fixture.minimumRecoveredRevenue)
      expect(dashboard.monetizationPaths.length).toBeGreaterThan(0)
      expect(dashboard.semanticMotifs.length).toBeGreaterThan(0)
      expect(dashboard.operatorConsole.scenarios.length).toBeGreaterThan(0)
    }
  })
})
