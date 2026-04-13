import {
  RISK_CATEGORY_LABELS,
  type DashboardPayload,
  type FindingSeverity,
  type PressureTrack,
  type SignalStage,
  type WatchChange,
  type WatchPulse,
  type Watchtower,
} from '../../shared/contracts'

export interface HistoricalDashboardSnapshot {
  createdAt: string
  dashboard: DashboardPayload
}

const STAGE_ORDER: SignalStage[] = ['whisper', 'asked', 'committed', 'shipped', 'unbilled']

export function buildHistoryAwareWatchtower(
  current: DashboardPayload,
  history: HistoricalDashboardSnapshot[],
  nowIso = new Date().toISOString(),
): Watchtower {
  const ordered = history.slice().sort((left, right) => right.createdAt.localeCompare(left.createdAt))
  const latestPersisted = ordered[0]
  const previous = latestPersisted?.dashboard
  const signatureMatchesLatest = previous ? createDashboardSignature(previous) === createDashboardSignature(current) : false
  const state = ordered.length === 0 ? 'first_run' : ordered.length < 2 ? 'warming' : 'tracking'
  const changes =
    previous && !signatureMatchesLatest ? buildWatchChanges(current, previous) : buildStableChanges(current, previous)
  const pulses = buildWatchPulses(current, ordered, nowIso, signatureMatchesLatest)
  const momentumScore = computeMomentumScore(current, changes)

  return {
    state,
    narrative: buildWatchNarrative(current, previous, changes, state),
    momentumScore,
    cadence:
      state === 'tracking'
        ? 'Recurring sweeps are comparing each run against the last commercial truth.'
        : 'Repeat the run after a new client signal, delivery update, or invoice cycle to start the trend line.',
    changes,
    pulses,
  }
}

export function createDashboardSignature(dashboard: DashboardPayload): string {
  return JSON.stringify({
    overview: dashboard.overview,
    recommendedScenarioId: dashboard.operatorConsole.recommendedScenarioId,
    findings: dashboard.findings.map((finding) => ({
      category: finding.category,
      moneyAtRisk: finding.moneyAtRisk,
      severity: finding.severity,
    })),
    tracks: dashboard.pressureTracks.map((track) => ({
      category: track.category,
      currentStage: track.currentStage,
      heat: track.heat,
    })),
  })
}

export function shouldPersistDashboard(params: {
  current: DashboardPayload
  latest?: HistoricalDashboardSnapshot
  nowIso?: string
}): boolean {
  if (!params.latest) {
    return true
  }

  const nowIso = params.nowIso ?? new Date().toISOString()
  const ageMs = new Date(nowIso).getTime() - new Date(params.latest.createdAt).getTime()
  const heartbeatMs = 1000 * 60 * 60 * 18

  if (ageMs >= heartbeatMs) {
    return true
  }

  return createDashboardSignature(params.current) !== createDashboardSignature(params.latest.dashboard)
}

function buildWatchChanges(current: DashboardPayload, previous: DashboardPayload): WatchChange[] {
  const changes: WatchChange[] = []
  const metricChanges = [
    buildMetricChange(
      'money_at_risk',
      'Money at risk moved',
      current.overview.moneyAtRiskTotal,
      previous.overview.moneyAtRiskTotal,
      500,
    ),
    buildMetricChange(
      'shadow_pipeline',
      'Shadow pipeline shifted',
      current.overview.shadowPipelineValue,
      previous.overview.shadowPipelineValue,
      1000,
    ),
    buildMetricChange(
      'cost_of_waiting',
      'Cost of waiting changed',
      current.operatorConsole.costOfWaiting,
      previous.operatorConsole.costOfWaiting,
      250,
    ),
  ].filter((change): change is WatchChange => Boolean(change))

  changes.push(...metricChanges)

  if (current.operatorConsole.recommendedScenarioId !== previous.operatorConsole.recommendedScenarioId) {
    const currentScenario =
      current.operatorConsole.scenarios.find(
        (scenario) => scenario.id === current.operatorConsole.recommendedScenarioId,
      ) ?? current.operatorConsole.scenarios[0]
    const previousScenario =
      previous.operatorConsole.scenarios.find(
        (scenario) => scenario.id === previous.operatorConsole.recommendedScenarioId,
      ) ?? previous.operatorConsole.scenarios[0]

    if (currentScenario && previousScenario) {
      changes.push({
        id: `watch-scenario-${currentScenario.id}`,
        kind: 'scenario_shift',
        title: 'Recommended posture changed',
        summary: `DeltaProof moved from "${previousScenario.title}" to "${currentScenario.title}", which means the safest commercial move materially changed.`,
        direction: 'new',
        magnitude: Math.abs(currentScenario.winScore - previousScenario.winScore),
        severity: currentScenario.winScore >= previousScenario.winScore ? 'high' : 'medium',
      })
    }
  }

  const previousCategories = new Set(previous.findings.map((finding) => finding.category))
  const newFindings = current.findings.filter((finding) => !previousCategories.has(finding.category))
  changes.push(
    ...newFindings.slice(0, 2).map((finding) => ({
      id: `watch-finding-${finding.id}`,
      kind: 'new_finding',
      title: `${RISK_CATEGORY_LABELS[finding.category]} is new`,
      summary: `A net-new monetizable delta appeared since the last run, adding ${currencyDelta(finding.moneyAtRisk)} in recoverable value.`,
      direction: 'new',
      magnitude: finding.moneyAtRisk,
      severity: finding.severity,
    }) satisfies WatchChange),
  )

  changes.push(...buildStageAdvanceChanges(current.pressureTracks, previous.pressureTracks))

  const ranked = changes
    .sort((left, right) => compareSeverity(right.severity, left.severity) || right.magnitude - left.magnitude)
    .slice(0, 4)

  return ranked.length ? ranked : buildStableChanges(current, previous)
}

function buildMetricChange(
  kind: WatchChange['kind'],
  title: string,
  current: number,
  previous: number,
  threshold: number,
): WatchChange | null {
  const delta = current - previous
  if (Math.abs(delta) < threshold) {
    return null
  }

  const direction = delta > 0 ? 'up' : 'down'

  return {
    id: `watch-${kind}-${Math.abs(delta)}`,
    kind,
    title,
    summary: `${title} ${direction === 'up' ? 'up' : 'down'} by ${currencyDelta(Math.abs(delta))} since the last run.`,
    direction,
    magnitude: Math.abs(delta),
    severity: severityFromMagnitude(kind, Math.abs(delta), direction),
  }
}

function buildStageAdvanceChanges(
  currentTracks: PressureTrack[],
  previousTracks: PressureTrack[],
): WatchChange[] {
  const previousTrackMap = new Map(previousTracks.map((track) => [track.category, track]))

  return currentTracks
    .flatMap((track) => {
      const previous = previousTrackMap.get(track.category)
      if (!previous) {
        return []
      }

      const stageDelta = stageIndex(track.currentStage) - stageIndex(previous.currentStage)
      if (stageDelta <= 0) {
        return []
      }

      return [
        {
          id: `watch-stage-${track.category}-${track.currentStage}`,
          kind: 'stage_advance',
          title: `${RISK_CATEGORY_LABELS[track.category]} advanced`,
          summary: `This pressure track moved from ${previous.currentStage} to ${track.currentStage}, making the recovery conversation more time-sensitive.`,
          direction: 'up',
          magnitude: stageDelta,
          severity: track.currentStage === 'shipped' || track.currentStage === 'unbilled' ? 'critical' : 'high',
        } satisfies WatchChange,
      ]
    })
    .slice(0, 2)
}

function buildStableChanges(current: DashboardPayload, previous?: DashboardPayload): WatchChange[] {
  return [
    {
      id: 'watch-stable',
      kind: 'stable',
      title: previous ? 'Commercial posture held steady' : 'Watchtower is primed',
      summary: previous
        ? `No material shift cleared the alert threshold. The best posture is still "${getScenarioTitle(current)}".`
        : 'This is the first stored run for the workspace. DeltaProof will start diffing once another snapshot lands.',
      direction: 'flat',
      magnitude: current.operatorConsole.costOfWaiting,
      severity: current.operatorConsole.costOfWaiting >= 4000 ? 'high' : 'medium',
    },
  ]
}

function buildWatchPulses(
  current: DashboardPayload,
  history: HistoricalDashboardSnapshot[],
  nowIso: string,
  signatureMatchesLatest: boolean,
): WatchPulse[] {
  const historicalPulses = history
    .slice(0, signatureMatchesLatest ? 6 : 5)
    .reverse()
    .map((snapshot) => toPulse(snapshot.dashboard, snapshot.createdAt))
  const currentPulse = toPulse(current, nowIso, 'Now')

  if (signatureMatchesLatest) {
    return historicalPulses
  }

  return [...historicalPulses, currentPulse].slice(-6)
}

function toPulse(
  dashboard: DashboardPayload,
  createdAt: string,
  label = formatPulseLabel(createdAt),
): WatchPulse {
  return {
    label,
    createdAt,
    moneyAtRiskTotal: dashboard.overview.moneyAtRiskTotal,
    shadowPipelineValue: dashboard.overview.shadowPipelineValue,
    costOfWaiting: dashboard.operatorConsole.costOfWaiting,
    exposureScore: dashboard.overview.exposureScore,
    scenarioTitle: getScenarioTitle(dashboard),
  }
}

function buildWatchNarrative(
  current: DashboardPayload,
  previous: DashboardPayload | undefined,
  changes: WatchChange[],
  state: Watchtower['state'],
): string {
  const lead = changes[0]

  if (!previous || state === 'first_run') {
    return 'DeltaProof has commercial memory turned on. The next sweep will tell you what truly escalated instead of making you rediscover the same leak from scratch.'
  }

  if (!lead) {
    return `The workspace is tracking cleanly. The current best posture is still "${getScenarioTitle(current)}".`
  }

  return `${lead.title}: ${lead.summary} The current best posture is "${getScenarioTitle(current)}".`
}

function computeMomentumScore(current: DashboardPayload, changes: WatchChange[]): number {
  const changeWeight = changes.reduce((sum, change) => sum + severityScore(change.severity) * 8, 0)
  return Math.min(
    99,
    24 +
      Math.round(current.operatorConsole.costOfWaiting / 450) +
      Math.round(current.overview.averageLeadDays * 1.7) +
      changeWeight,
  )
}

function severityFromMagnitude(
  kind: WatchChange['kind'],
  magnitude: number,
  direction: WatchChange['direction'],
): FindingSeverity {
  if (kind === 'stage_advance') {
    return magnitude >= 2 ? 'critical' : 'high'
  }

  if (direction === 'down') {
    return 'medium'
  }

  if (magnitude >= 5000) {
    return 'critical'
  }

  if (magnitude >= 1500) {
    return 'high'
  }

  return 'medium'
}

function compareSeverity(left: FindingSeverity, right: FindingSeverity): number {
  return severityScore(left) - severityScore(right)
}

function severityScore(severity: FindingSeverity): number {
  if (severity === 'critical') {
    return 3
  }

  if (severity === 'high') {
    return 2
  }

  return 1
}

function stageIndex(stage: SignalStage): number {
  return STAGE_ORDER.indexOf(stage)
}

function getScenarioTitle(dashboard: DashboardPayload): string {
  return (
    dashboard.operatorConsole.scenarios.find(
      (scenario) => scenario.id === dashboard.operatorConsole.recommendedScenarioId,
    ) ?? dashboard.operatorConsole.scenarios[0]
  )?.title ?? 'Operator posture forming'
}

function formatPulseLabel(createdAt: string): string {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
  }).format(new Date(createdAt))
}

function currencyDelta(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}
