import { Hono } from 'hono'
import { z } from 'zod'
import { buildDashboard } from '../shared/engine'
import { DEMO_ARTIFACTS, getFixtureByWorkspaceSlug } from '../shared/fixtures'
import { buildPortfolioBrief } from '../shared/portfolio'
import type { AnalyzeRequest, DashboardPayload, PortfolioBrief, WorkspaceSummary } from '../shared/contracts'
import { listWorkspaceCatalog } from './lib/catalog'
import { enrichDashboardWithOllama } from './lib/ollama'
import { listRecentWorkspaces, loadRecentDashboards, saveDashboard } from './lib/persistence'
import { enrichDashboardWithSemanticMotifs } from './lib/semantic'
import type { AppEnv } from './lib/types'
import { buildHistoryAwareWatchtower, shouldPersistDashboard, type HistoricalDashboardSnapshot } from './lib/watchtower'

const analyzeRequestSchema = z.object({
  workspaceName: z.string().min(2).max(80),
  artifacts: z
    .array(
      z.object({
        id: z.string().optional(),
        title: z.string().min(2),
        kind: z
          .enum([
            'contract',
            'meeting_note',
            'client_message',
            'task_export',
            'invoice',
            'delivery_note',
            'other',
          ])
          .optional(),
        source: z.string().min(2),
        content: z.string().min(20),
        createdAt: z.string().optional(),
      }),
    )
    .min(1),
}) satisfies z.ZodType<AnalyzeRequest>

const app = new Hono<{ Bindings: AppEnv }>()

app.onError((error, c) =>
  c.json(
    {
      error: error.message || 'Unexpected worker error',
    },
    500,
  ),
)

app.get('/api/health', (c) =>
  c.json({
    status: 'ok',
    timestamp: new Date().toISOString(),
  }),
)

app.get('/api/workspaces', async (c) => {
  const catalog = await listWorkspaceCatalog(c.env)
  return c.json(catalog satisfies WorkspaceSummary[])
})

app.get('/api/portfolio', async (c) => {
  const brief = await materializePortfolioBrief(c.env)
  return c.json(brief satisfies PortfolioBrief)
})

app.get('/api/portfolio/brief.md', async (c) => {
  const brief = await materializePortfolioBrief(c.env)
  return new Response(brief.markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
    },
  })
})

app.get('/api/demo', async (c) => {
  const history = await loadRecentDashboards(c.env, 'Northstar Studio', 6)
  const artifacts = history[0]?.dashboard.artifacts ?? DEMO_ARTIFACTS
  const dashboard = await materializeDashboard({
    env: c.env,
    workspaceName: 'Northstar Studio',
    artifacts,
    history,
  })

  return c.json(dashboard)
})

app.get('/api/demo/brief.md', async (c) => {
  const history = await loadRecentDashboards(c.env, 'Northstar Studio', 6)
  const artifacts = history[0]?.dashboard.artifacts ?? DEMO_ARTIFACTS
  const dashboard = await materializeDashboard({
    env: c.env,
    workspaceName: 'Northstar Studio',
    artifacts,
    history,
  })

  return new Response(dashboard.executiveBrief.markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
    },
  })
})

app.get('/api/workspaces/:slug', async (c) => {
  const dashboard = await loadWorkspaceDashboard(c.env, c.req.param('slug'))
  if (!dashboard) {
    return c.json(
      {
        error: 'Workspace not found',
      },
      404,
    )
  }

  return c.json(dashboard)
})

app.get('/api/workspaces/:slug/brief.md', async (c) => {
  const dashboard = await loadWorkspaceDashboard(c.env, c.req.param('slug'))
  if (!dashboard) {
    return c.json(
      {
        error: 'Workspace not found',
      },
      404,
    )
  }

  return new Response(dashboard.executiveBrief.markdown, {
    headers: {
      'content-type': 'text/markdown; charset=utf-8',
    },
  })
})

app.post('/api/analyze', async (c) => {
  const parsed = analyzeRequestSchema.safeParse(await c.req.json())

  if (!parsed.success) {
    return c.json(
      {
        error: parsed.error.flatten(),
      },
      400,
    )
  }

  const history = await loadRecentDashboards(c.env, parsed.data.workspaceName, 6)
  const dashboard = await materializeDashboard({
    env: c.env,
    workspaceName: parsed.data.workspaceName,
    artifacts: parsed.data.artifacts,
    history,
  })

  return c.json(dashboard)
})

app.notFound(() => new Response(null, { status: 404 }))

async function materializeDashboard(params: {
  env: AppEnv
  workspaceName: string
  artifacts: AnalyzeRequest['artifacts']
  history: HistoricalDashboardSnapshot[]
}): Promise<DashboardPayload> {
  const base = buildDashboard({
    workspaceName: params.workspaceName,
    artifacts: params.artifacts,
    checkoutUrl: params.env.POLAR_CHECKOUT_URL,
  })
  const persistence: DashboardPayload['runtime']['persistence'] = params.env.DB ? 'd1' : 'demo'
  const runtimeReady = {
    ...base,
    runtime: {
      ...base.runtime,
      persistence,
    },
  }
  const withMotifs = await enrichDashboardWithSemanticMotifs(runtimeReady, params.env)
  const enriched = await enrichDashboardWithOllama(withMotifs, params.env)
  const watchtowerReady = {
    ...enriched,
    watchtower: buildHistoryAwareWatchtower(enriched, params.history),
  }

  if (shouldPersistDashboard({ current: watchtowerReady, latest: params.history[0] })) {
    await saveDashboard(params.env, watchtowerReady)
  }

  return watchtowerReady
}

async function loadWorkspaceDashboard(
  env: AppEnv,
  slug: string,
): Promise<DashboardPayload | null> {
  const fixture = getFixtureByWorkspaceSlug(slug)
  const workspaceName = fixture?.workspaceName ?? slug
  const history = await loadRecentDashboards(env, workspaceName, 6)
  const artifacts = history[0]?.dashboard.artifacts ?? fixture?.artifacts

  if (!artifacts?.length) {
    return null
  }

  return materializeDashboard({
    env,
    workspaceName: history[0]?.dashboard.workspaceName ?? fixture?.workspaceName ?? slug,
    artifacts,
    history,
  })
}

async function materializePortfolioBrief(env: AppEnv): Promise<PortfolioBrief> {
  const catalog = await listWorkspaceCatalog(env)
  const dashboards = (
    await Promise.all(catalog.map((workspace) => loadWorkspaceDashboard(env, workspace.slug)))
  ).filter((dashboard): dashboard is DashboardPayload => Boolean(dashboard))

  return buildPortfolioBrief(dashboards)
}

async function runWatchtowerSweep(env: AppEnv): Promise<void> {
  const workspaces = await listRecentWorkspaces(env, 16)
  let persisted = 0
  let failed = 0

  for (const workspace of workspaces) {
    try {
      const history = await loadRecentDashboards(env, workspace.name, 6)
      const latest = history[0]

      if (!latest) {
        continue
      }

      const dashboard = await materializeDashboard({
        env,
        workspaceName: workspace.name,
        artifacts: latest.dashboard.artifacts,
        history,
      })

      if (shouldPersistDashboard({ current: dashboard, latest })) {
        persisted += 1
      }
    } catch (error) {
      failed += 1
      console.log(
        JSON.stringify({
          event: 'watchtower_workspace_failed',
          workspace: workspace.slug,
          error: error instanceof Error ? error.message : 'unknown',
        }),
      )
    }
  }

  console.log(
    JSON.stringify({
      event: 'watchtower_sweep_completed',
      scannedWorkspaces: workspaces.length,
      persisted,
      failed,
      timestamp: new Date().toISOString(),
    }),
  )
}

export default {
  fetch: app.fetch,
  scheduled(_controller: ScheduledController, env: AppEnv, ctx: ExecutionContext) {
    ctx.waitUntil(runWatchtowerSweep(env))
  },
}
