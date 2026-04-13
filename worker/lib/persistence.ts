import type { DashboardPayload } from '../../shared/contracts'
import { toWorkspaceSlug } from '../../shared/slug'
import type { AppEnv } from './types'
import type { HistoricalDashboardSnapshot } from './watchtower'

export async function loadRecentDashboards(
  env: AppEnv,
  workspaceName: string,
  limit = 6,
): Promise<HistoricalDashboardSnapshot[]> {
  if (!env.DB) {
    return []
  }

  const result = await env.DB.prepare(
    `
      select created_at, payload_json
      from analysis_snapshots
      where workspace_slug = ?
      order by created_at desc
      limit ?
    `,
  )
    .bind(toWorkspaceSlug(workspaceName), limit)
    .all<{ created_at: string; payload_json: string }>()

  return (result.results ?? [])
    .flatMap((row) => {
      const parsed = JSON.parse(row.payload_json) as unknown
      if (!isCurrentDashboardPayload(parsed)) {
        return []
      }

      return [
        {
          createdAt: row.created_at,
          dashboard: parsed,
        } satisfies HistoricalDashboardSnapshot,
      ]
    })
}

export async function loadLatestDashboard(
  env: AppEnv,
  workspaceName: string,
): Promise<DashboardPayload | null> {
  const [latest] = await loadRecentDashboards(env, workspaceName, 1)
  return latest?.dashboard ?? null
}

export async function saveDashboard(env: AppEnv, dashboard: DashboardPayload): Promise<void> {
  if (!env.DB) {
    return
  }

  const workspaceSlug = toWorkspaceSlug(dashboard.workspaceName)
  const now = new Date().toISOString()

  await env.DB.batch([
    env.DB.prepare(
      `
        insert into workspaces (slug, name, created_at, updated_at)
        values (?, ?, ?, ?)
        on conflict(slug) do update set
          name = excluded.name,
          updated_at = excluded.updated_at
      `,
    ).bind(workspaceSlug, dashboard.workspaceName, now, now),
    env.DB.prepare(
      `
        insert into analysis_snapshots (
          id,
          workspace_slug,
          money_at_risk,
          provider,
          created_at,
          payload_json
        )
        values (?, ?, ?, ?, ?, ?)
      `,
    ).bind(
      crypto.randomUUID(),
      workspaceSlug,
      dashboard.overview.moneyAtRiskTotal,
      dashboard.runtime.strategy,
      now,
      JSON.stringify(dashboard),
    ),
  ])
}

export async function listRecentWorkspaces(
  env: AppEnv,
  limit = 12,
): Promise<Array<{ slug: string; name: string }>> {
  if (!env.DB) {
    return []
  }

  const result = await env.DB.prepare(
    `
      select slug, name
      from workspaces
      order by updated_at desc
      limit ?
    `,
  )
    .bind(limit)
    .all<{ slug: string; name: string }>()

  return result.results ?? []
}

function isCurrentDashboardPayload(payload: unknown): payload is DashboardPayload {
  if (!payload || typeof payload !== 'object') {
    return false
  }

  const candidate = payload as Partial<DashboardPayload>

  return Boolean(
      candidate.overview &&
      typeof candidate.overview.shadowPipelineValue === 'number' &&
      typeof candidate.overview.averageLeadDays === 'number' &&
      candidate.decisionWindow &&
      typeof candidate.decisionWindow.days === 'number' &&
      typeof candidate.decisionWindow.label === 'string' &&
      Array.isArray(candidate.monetizationPaths) &&
      candidate.operatorConsole &&
      typeof candidate.operatorConsole.costOfWaiting === 'number' &&
      Array.isArray(candidate.operatorConsole.scenarios) &&
      Array.isArray(candidate.operatorConsole.moves) &&
      candidate.watchtower &&
      typeof candidate.watchtower.momentumScore === 'number' &&
      Array.isArray(candidate.watchtower.changes) &&
      Array.isArray(candidate.watchtower.pulses) &&
      candidate.executiveBrief &&
      typeof candidate.executiveBrief.headline === 'string' &&
      typeof candidate.executiveBrief.markdown === 'string' &&
      Array.isArray(candidate.pressureTracks) &&
      Array.isArray(candidate.semanticMotifs) &&
      candidate.realityLens &&
      Array.isArray(candidate.realityLens.signedTruth),
  )
}
