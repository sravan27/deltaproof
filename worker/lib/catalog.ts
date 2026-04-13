import { buildDashboard } from '../../shared/engine'
import { LOOP_FIXTURES } from '../../shared/fixtures'
import { toWorkspaceSlug } from '../../shared/slug'
import type { DashboardPayload, WorkspaceSummary } from '../../shared/contracts'
import { listRecentWorkspaces, loadRecentDashboards } from './persistence'
import type { AppEnv } from './types'
import { buildHistoryAwareWatchtower } from './watchtower'

export async function listWorkspaceCatalog(env: AppEnv): Promise<WorkspaceSummary[]> {
  const recentStored = await listRecentWorkspaces(env, 12)
  const storedSummaries = await Promise.all(
    recentStored.map(async (workspace) => {
      const history = await loadRecentDashboards(env, workspace.name, 6)
      const latest = history[0]?.dashboard

      if (!latest) {
        return null
      }

      const hydrated = {
        ...latest,
        watchtower: buildHistoryAwareWatchtower(latest, history),
      }

      return toWorkspaceSummary(hydrated, history[0]?.createdAt ?? new Date().toISOString(), 'd1')
    }),
  )

  const summaryMap = new Map(
    storedSummaries
      .filter((workspace): workspace is WorkspaceSummary => Boolean(workspace))
      .map((workspace) => [workspace.slug, workspace]),
  )

  for (const fixture of LOOP_FIXTURES) {
    const slug = toWorkspaceSlug(fixture.workspaceName)
    if (summaryMap.has(slug)) {
      continue
    }

    summaryMap.set(
      slug,
      toWorkspaceSummary(
        buildDashboard({
          workspaceName: fixture.workspaceName,
          artifacts: fixture.artifacts,
        }),
        latestArtifactDate(fixture.artifacts),
        'seed',
      ),
    )
  }

  return Array.from(summaryMap.values())
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .slice(0, 9)
}

function toWorkspaceSummary(
  dashboard: DashboardPayload,
  updatedAt: string,
  source: WorkspaceSummary['source'],
): WorkspaceSummary {
  const topScenario =
    dashboard.operatorConsole.scenarios.find(
      (scenario) => scenario.id === dashboard.operatorConsole.recommendedScenarioId,
    ) ?? dashboard.operatorConsole.scenarios[0]

  return {
    slug: toWorkspaceSlug(dashboard.workspaceName),
    name: dashboard.workspaceName,
    source,
    updatedAt,
    moneyAtRiskTotal: dashboard.overview.moneyAtRiskTotal,
    shadowPipelineValue: dashboard.overview.shadowPipelineValue,
    costOfWaiting: dashboard.operatorConsole.costOfWaiting,
    riskCount: dashboard.overview.riskCount,
    momentumScore: dashboard.watchtower.momentumScore,
    decisionWindowDays: dashboard.decisionWindow.days,
    watchtowerState: dashboard.watchtower.state,
    topScenario: topScenario?.title ?? 'Operator posture forming',
  }
}

function latestArtifactDate(
  artifacts: Array<{ createdAt?: string }>,
): string {
  return artifacts
    .map((artifact) => artifact.createdAt ?? new Date().toISOString())
    .sort()
    .at(-1) ?? new Date().toISOString()
}
