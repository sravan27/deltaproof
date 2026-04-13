import type { DashboardPayload, PortfolioBrief, PortfolioPriority } from './contracts'
import { formatCurrency } from './contracts'
import { toWorkspaceSlug } from './slug'

export function buildPortfolioBrief(dashboards: DashboardPayload[]): PortfolioBrief {
  const priorities = dashboards
    .map((dashboard) => toPriority(dashboard))
    .sort((left, right) => {
      if (left.decisionWindowDays !== right.decisionWindowDays) {
        return left.decisionWindowDays - right.decisionWindowDays
      }

      return right.costOfWaiting - left.costOfWaiting
    })

  const revenueAtRiskTotal = dashboards.reduce((sum, dashboard) => sum + dashboard.overview.moneyAtRiskTotal, 0)
  const shadowPipelineTotal = dashboards.reduce((sum, dashboard) => sum + dashboard.overview.shadowPipelineValue, 0)
  const costOfWaitingTotal = dashboards.reduce((sum, dashboard) => sum + dashboard.operatorConsole.costOfWaiting, 0)
  const urgentWorkspaceCount = priorities.filter((priority) => priority.decisionWindowDays <= 7).length
  const blindSpots = Array.from(
    new Set(
      dashboards
        .flatMap((dashboard) => dashboard.operatorConsole.evidenceGaps)
        .filter(Boolean),
    ),
  ).slice(0, 4)
  const mustDoThisWeek = priorities.slice(0, 3).map((priority) => {
    return `${priority.workspaceName}: ${priority.nextMove} within ${priority.decisionWindowDays} day${priority.decisionWindowDays === 1 ? '' : 's'}.`
  })

  const brief: PortfolioBrief = {
    title: 'DeltaProof portfolio command brief',
    headline:
      dashboards.length > 1
        ? `${formatCurrency(revenueAtRiskTotal)} is exposed across the current book, and ${urgentWorkspaceCount} workspace${urgentWorkspaceCount === 1 ? '' : 's'} need commercial action within seven days.`
        : `${formatCurrency(revenueAtRiskTotal)} is exposed in the current workspace, and the commercial window is already active.`,
    summary:
      'This is the weekly founder view: where leverage is expiring, where expansion is already latent, and which conversation should happen before delivery normalizes the extra work.',
    portfolioCallout: [
      `${dashboards.length} tracked workspace${dashboards.length === 1 ? '' : 's'}`,
      `${formatCurrency(revenueAtRiskTotal)} money at risk`,
      `${formatCurrency(shadowPipelineTotal)} shadow pipeline`,
      `${formatCurrency(costOfWaitingTotal)} weekly cost of waiting`,
    ].join(' · '),
    workspacesTracked: dashboards.length,
    urgentWorkspaceCount,
    revenueAtRiskTotal,
    shadowPipelineTotal,
    costOfWaitingTotal,
    mustDoThisWeek,
    blindSpots,
    priorities,
    markdown: '',
  }

  return {
    ...brief,
    markdown: renderPortfolioBriefMarkdown(brief),
  }
}

function toPriority(dashboard: DashboardPayload): PortfolioPriority {
  const recommendedScenario =
    dashboard.operatorConsole.scenarios.find(
      (scenario) => scenario.id === dashboard.operatorConsole.recommendedScenarioId,
    ) ?? dashboard.operatorConsole.scenarios[0]
  const nextMove =
    dashboard.operatorConsole.moves.find((move) => recommendedScenario?.moveIds.includes(move.id)) ??
    dashboard.operatorConsole.moves[0]

  return {
    slug: toWorkspaceSlug(dashboard.workspaceName),
    workspaceName: dashboard.workspaceName,
    headline: `${dashboard.decisionWindow.label} window on ${recommendedScenario?.title.toLowerCase() ?? 'the live posture'}`,
    decisionWindowDays: dashboard.decisionWindow.days,
    moneyAtRiskTotal: dashboard.overview.moneyAtRiskTotal,
    shadowPipelineValue: dashboard.overview.shadowPipelineValue,
    costOfWaiting: dashboard.operatorConsole.costOfWaiting,
    momentumScore: dashboard.watchtower.momentumScore,
    recommendedScenario: recommendedScenario?.title ?? 'Operator posture forming',
    nextMove: nextMove?.title ?? 'Formalize the top revenue move',
    whyThisWeek: dashboard.decisionWindow.consequence,
  }
}

export function renderPortfolioBriefMarkdown(brief: PortfolioBrief): string {
  return [
    `# ${brief.title}`,
    '',
    `## Headline`,
    brief.headline,
    '',
    `## Summary`,
    brief.summary,
    '',
    `## Portfolio Callout`,
    brief.portfolioCallout,
    '',
    `## Must Do This Week`,
    ...brief.mustDoThisWeek.map((item) => `- ${item}`),
    '',
    `## Priority Queue`,
    ...brief.priorities.map(
      (priority) =>
        `- ${priority.workspaceName}: ${priority.headline} | ${formatCurrency(priority.moneyAtRiskTotal)} risk | ${formatCurrency(priority.shadowPipelineValue)} pipeline | ${formatCurrency(priority.costOfWaiting)} cost of waiting`,
    ),
    '',
    `## Blind Spots`,
    ...(brief.blindSpots.length ? brief.blindSpots : ['No material blind spots detected right now.']).map(
      (item) => `- ${item}`,
    ),
    '',
  ].join('\n')
}
