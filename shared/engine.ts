import {
  type ArtifactInput,
  type ArtifactKind,
  type ArtifactRecord,
  type ChangeOrderLineItem,
  type ChangeOrderPacket,
  type CommercialScenario,
  type ContractBaseline,
  type DashboardPayload,
  type DecisionWindow,
  type EvidenceItem,
  type ExecutionMove,
  type Finding,
  type FindingSeverity,
  type MonetizationPath,
  type MoveChannel,
  type MoveOwner,
  type MoveTiming,
  type OperatorConsole,
  type OfferType,
  type PricingCard,
  type PressureTrack,
  type PushbackCard,
  type RealityLens,
  type RiskCategory,
  RISK_CATEGORY_LABELS,
  type SemanticMotif,
  type ScenarioPosture,
  type SignalStage,
  type StageMoment,
  type WatchChange,
  type WatchPulse,
  type Watchtower,
  formatCurrency,
} from './contracts'
import { buildExecutiveBrief } from './brief'
import { DEMO_ARTIFACTS } from './fixtures'

interface CategoryConfig {
  title: string
  keywords: string[]
  baselineKeywords: string[]
  expansionKeywords: string[]
  defaultHours: number
  impact: EvidenceItem['impact']
  recommendation: string
  offerType: OfferType
  wedge: string
  nextStep: string
}

const STAGE_ORDER: SignalStage[] = ['whisper', 'asked', 'committed', 'shipped', 'unbilled']

const STAGE_WEIGHTS: Record<SignalStage, number> = {
  whisper: 1,
  asked: 2,
  committed: 3,
  shipped: 4,
  unbilled: 5,
}

const CATEGORY_CONFIG: Record<RiskCategory, CategoryConfig> = {
  portal_access: {
    title: 'Partner portal landed outside the signed SOW',
    keywords: ['portal', 'login', 'gated', 'member', 'authentication', 'onboarding flow'],
    baselineKeywords: ['portal', 'gated', 'authentication', 'member'],
    expansionKeywords: ['partner', 'reseller', 'onboarding'],
    defaultHours: 42,
    impact: 'scope',
    recommendation:
      'Open a scoped change order for authentication, access control, and partner onboarding before launch work expands further.',
    offerType: 'phase_two',
    wedge: 'This is no longer a website task. It is a revenue operations surface with access control and rollout complexity.',
    nextStep: 'Sell it as a partner experience milestone with authentication, permissions, and launch governance.',
  },
  ai_assistant: {
    title: 'The client is asking for an AI assistant on top of the core site work',
    keywords: ['ai faq', 'assistant', 'chatbot', 'copilot', 'knowledge agent', 'faq assistant'],
    baselineKeywords: ['assistant', 'chatbot', 'copilot', 'faq'],
    expansionKeywords: ['launch docs', 'knowledge', 'faq'],
    defaultHours: 18,
    impact: 'scope',
    recommendation:
      'Package the assistant as a separate pilot with its own setup fee, content constraints, and model budget.',
    offerType: 'pilot',
    wedge: 'The client is already leaning toward an AI product, not a content tweak. That is a pilot sale hiding in plain sight.',
    nextStep: 'Pitch a 3-week AI FAQ pilot with one knowledge base, guardrails, and usage measurement.',
  },
  data_sync: {
    title: 'CRM sync work is happening without commercial protection',
    keywords: ['salesforce', 'crm', 'sync', 'webhook', 'integration', 'bidirectional'],
    baselineKeywords: ['salesforce', 'crm', 'sync', 'webhook', 'integration'],
    expansionKeywords: ['retry', 'ops', 'lead'],
    defaultHours: 14,
    impact: 'budget',
    recommendation:
      'Split integration design, implementation, and QA into a new line item before the team finishes the plumbing for free.',
    offerType: 'phase_two',
    wedge: 'What looks like “just a sync” is really systems architecture, retry logic, and business risk.',
    nextStep: 'Reframe it as a growth systems sprint with sync design, implementation, and QA acceptance.',
  },
  revision_overrun: {
    title: 'Revision creep has moved beyond the included rounds',
    keywords: ['third revision', 'revision v3', 'one more round', 'another narrative direction', 'v3', 'revision pass'],
    baselineKeywords: ['revision'],
    expansionKeywords: ['third', 'another', 'v3', 'pass'],
    defaultHours: 10,
    impact: 'budget',
    recommendation:
      'Reset approval gates now and bill the extra revision cycle as overage work tied to executive feedback.',
    offerType: 'change_order',
    wedge: 'This is the cleanest close because the contract already gives you the commercial right to charge for it.',
    nextStep: 'Send the revision overage immediately while the feedback loop is still active and document board-driven change.',
  },
  analytics_expansion: {
    title: 'The dashboard is expanding beyond the original analytics brief',
    keywords: ['drill-down', 'regional managers', 'mobile', 'country managers', 'dashboard variant'],
    baselineKeywords: ['dashboard', 'analytics', 'attribution'],
    expansionKeywords: ['drill-down', 'mobile', 'regional', 'country'],
    defaultHours: 16,
    impact: 'scope',
    recommendation:
      'Convert the expanded reporting asks into a second analytics milestone rather than absorbing them into the first delivery.',
    offerType: 'phase_two',
    wedge: 'The client has moved from reporting to decision support. That is a broader analytics product than the original dashboard.',
    nextStep: 'Bundle drill-downs, mobile views, and regional reporting into a second analytics milestone.',
  },
  new_deliverable: {
    title: 'A net-new deliverable is being produced off-book',
    keywords: ['new page', 'microsite', 'extra page', 'device onboarding', 'launch kits', 'ipad', 'onboarding'],
    baselineKeywords: ['page', 'template', 'landing'],
    expansionKeywords: ['new', 'extra', 'onboarding', 'kits'],
    defaultHours: 12,
    impact: 'scope',
    recommendation:
      'Turn the new deliverable into a discrete statement of work with its own acceptance criteria and margin target.',
    offerType: 'phase_two',
    wedge: 'A “small extra” usually has its own QA, rollout, and support trail. Treat it as a productized add-on, not a favor.',
    nextStep: 'Name the deliverable, attach acceptance criteria, and convert it into a separate milestone before more execution lands.',
  },
  maintenance_tail: {
    title: 'The engagement is sliding into support-retainer work',
    keywords: ['ongoing', 'after-hours', 'support', 'helpdesk', 'maintenance', 'weekly'],
    baselineKeywords: ['maintenance', 'support', 'helpdesk', 'retainer'],
    expansionKeywords: ['after-hours', 'ongoing', 'weekly'],
    defaultHours: 8,
    impact: 'timeline',
    recommendation:
      'Box the recurring support into a retainer immediately before it normalizes into expected unpaid coverage.',
    offerType: 'retainer',
    wedge: 'Recurring support is not scope creep anymore. It is a subscription product the client is already training itself to expect.',
    nextStep: 'Offer a named monthly coverage retainer with after-hours rules, SLA windows, and onboarding capacity.',
  },
}

const DEFAULT_PRICING: PricingCard = {
  plan: 'Launch partner',
  price: '$499/mo + 3% on recovered scope',
  promise: 'Recover one missed change order and DeltaProof pays for itself for the year.',
  buyerFit: 'Best for one live workspace that already has real delivery drift.',
  paybackWindow: 'Usually pays back on the first recovered change order.',
  projectedReturn: 'Turn visible scope leakage into a paid client decision before it hardens into expectation.',
  urgencyLabel: 'Revenue window live',
  ctaLabel: 'Activate revenue watchtower',
}

export function buildDemoDashboard(checkoutUrl?: string): DashboardPayload {
  return buildDashboard({
    workspaceName: 'Northstar Studio',
    artifacts: DEMO_ARTIFACTS,
    checkoutUrl,
  })
}

export function buildDashboard(params: {
  workspaceName: string
  artifacts: ArtifactInput[]
  checkoutUrl?: string
}): DashboardPayload {
  const artifacts = params.artifacts.map(normalizeArtifact)
  const contract = artifacts.find((artifact) => artifact.kind === 'contract')
  const baseline = extractBaseline(contract)
  const evidence = artifacts.flatMap((artifact) => extractEvidence(artifact, baseline))
  const findings = buildFindings(evidence, baseline)
  const pressureTracks = buildPressureTracks(evidence, findings)
  const monetizationPaths = buildMonetizationPaths(findings, pressureTracks, baseline)
  const operatorConsole = buildOperatorConsole({
    artifacts,
    baseline,
    findings,
    pressureTracks,
    monetizationPaths,
  })
  const watchtower = buildSeedWatchtower({
    artifacts,
    findings,
    pressureTracks,
    operatorConsole,
    monetizationPaths,
  })
  const decisionWindow = buildDecisionWindow({
    findings,
    pressureTracks,
    operatorConsole,
  })
  const executiveBrief = buildExecutiveBrief({
    workspaceName: params.workspaceName,
    baseline,
    findings,
    monetizationPaths,
    operatorConsole,
    watchtower,
    decisionWindow,
  })
  const realityLens = buildRealityLens(baseline, evidence)
  const semanticMotifs = buildSemanticMotifs(evidence, findings)
  const packet = buildPacket(findings, baseline, params.workspaceName)
  const moneyAtRiskTotal = findings.reduce((total, finding) => total + finding.moneyAtRisk, 0)
  const shadowPipelineValue = monetizationPaths.reduce((total, path) => total + path.expectedValue, 0)
  const pricing = buildPricingCard({
    overview: {
      moneyAtRiskTotal,
      shadowPipelineValue,
    },
    decisionWindow,
    topOpportunity: monetizationPaths[0],
    checkoutUrl: params.checkoutUrl,
  })

  return {
    workspaceName: params.workspaceName,
    headline: 'The best agency upsell is usually already happening, just not on paper yet.',
    thesis:
      'DeltaProof does more than catch leakage. It spots weak expansion signals, tracks when they harden into real work, and turns that drift into the highest-probability commercial package before margin disappears.',
    baseline,
    overview: {
      moneyAtRiskTotal,
      shadowPipelineValue,
      exposureScore: Math.min(
        99,
        34 + findings.length * 11 + Math.round(moneyAtRiskTotal / 1800) + Math.round(shadowPipelineValue / 5000),
      ),
      riskCount: findings.length,
      contractedDeliverables: baseline.deliverables.length,
      evidenceMoments: evidence.length,
      averageLeadDays: computeAverageLeadDays(pressureTracks),
    },
    decisionWindow,
    artifacts,
    evidence,
    findings,
    pressureTracks,
    monetizationPaths,
    operatorConsole,
    watchtower,
    executiveBrief,
    realityLens,
    semanticMotifs,
    packet,
    techPillars: [
      {
        label: 'Signal staging, not just keyword matching',
        detail:
          'Every scope signal is staged from whisper to unbilled work, which lets DeltaProof show when a harmless ask becomes a monetizable obligation.',
      },
      {
        label: 'Shadow pipeline generation',
        detail:
          'The engine reframes drift into specific offers such as pilots, retainers, and phase-two milestones ranked by expected value and close probability.',
      },
      {
        label: 'Operator-grade sequencing',
        detail:
          'DeltaProof ranks the best commercial posture, drafts the first move, anticipates pushback, and shows the evidence still missing before you go ask for money.',
      },
      {
        label: 'Continuous commercial memory',
        detail:
          'The watchtower layer turns one analysis into an ongoing system by showing what escalated, what stabilized, and how much leverage hardened since the last run.',
      },
      {
        label: 'Decision-window math',
        detail:
          'DeltaProof estimates how many days of commercial leverage are left before extra work hardens into expectation, so leaders know which conversation cannot slip.',
      },
      {
        label: 'Local reasoning by default',
        detail:
          'Gemma 4 can upgrade narratives and packaging language locally or through an Ollama endpoint without changing the product shape.',
      },
      {
        label: 'Evidence graph over a real SQLite core',
        detail:
          'Every finding and every commercial path is anchored to artifacts, stored as replayable JSON, and ready for D1-backed workspaces.',
      },
    ],
    loopCards: [
      {
        title: 'Adversarial fixture pack',
        focus: 'Contracts, inbox asks, shipped work, and invoice misses replay continuously so false confidence does not survive.',
        metric: '2 seeded leak scenarios',
      },
      {
        title: 'Pressure-stage regression gate',
        focus: 'If an engine change weakens early warning lead time or loses a category transition, it fails the loop.',
        metric: `${computeAverageLeadDays(pressureTracks)}-day average warning lead`,
      },
      {
        title: 'Commercial packaging loop',
        focus: 'Every finding must produce a credible sellable shape, not just a red flag. The product gets judged on money, not novelty theater.',
        metric: `${formatCurrency(shadowPipelineValue)} shadow pipeline value`,
      },
      {
        title: 'Operator posture simulator',
        focus:
          'The engine compares recover-now, bundle-and-close, and pilot-first scenarios so the team can maximize revenue without blowing up the relationship.',
        metric: `${operatorConsole.scenarios.length} ranked recovery postures`,
      },
      {
        title: 'Watchtower memory',
        focus:
          'Every workspace can become continuously analyzable, so the product reports what changed since the last run instead of forcing the operator to rediscover the same margin leak twice.',
        metric: `${watchtower.momentumScore}/99 momentum`,
      },
      {
        title: 'Decision window engine',
        focus:
          'The product estimates when pricing power expires, so operators know which client conversation has to happen this week instead of living as a vague priority.',
        metric: `${decisionWindow.days} day ${decisionWindow.label.toLowerCase()} window`,
      },
    ],
    pricing,
    runtime: {
      strategy: 'heuristic',
      model: 'gemma4:e4b -> gemma4:31b when available',
      persistence: 'demo',
    },
  }
}

function buildPricingCard(params: {
  overview: Pick<DashboardPayload['overview'], 'moneyAtRiskTotal' | 'shadowPipelineValue'>
  decisionWindow: DecisionWindow
  topOpportunity?: MonetizationPath
  checkoutUrl?: string
}): PricingCard {
  const urgencyLabel =
    params.decisionWindow.days <= 3
      ? 'Immediate recovery window'
      : params.decisionWindow.days <= 7
        ? 'This-week pricing window'
        : 'Live expansion window'
  const projectedReturn = [
    `${formatCurrency(params.overview.moneyAtRiskTotal)} recoverable now`,
    `${formatCurrency(params.overview.shadowPipelineValue)} expansion later`,
  ].join(' · ')

  if (params.overview.moneyAtRiskTotal >= 30000 || params.decisionWindow.days <= 3) {
    return {
      plan: 'Recovery command',
      price: '$1,500 setup + $749/mo',
      promise: 'Install DeltaProof as the commercial control layer before one more client cycle turns leakage into entitlement.',
      buyerFit: 'Best for teams with one urgent account already carrying five-figure leakage or a live client expansion bundle.',
      paybackWindow:
        params.decisionWindow.days <= 3
          ? 'At the current leakage rate, this pays back inside the current decision window.'
          : 'Usually pays back on the first recovered scope reset.',
      projectedReturn,
      urgencyLabel,
      ctaLabel: params.checkoutUrl ? 'Start recovery command' : 'Claim a recovery slot',
      checkoutUrl: params.checkoutUrl,
    }
  }

  if (params.overview.moneyAtRiskTotal >= 10000 || params.overview.shadowPipelineValue >= 25000) {
    return {
      plan: 'Revenue watchtower',
      price: '$749/mo + 2% on recovered scope',
      promise: 'Keep one workspace commercially visible until the team stops shipping unpaid upgrades by accident.',
      buyerFit: 'Best for agencies and consultancies with a few active fixed-fee accounts and recurring revision or support drift.',
      paybackWindow: 'Designed to pay back within one recovery cycle, not months of seat adoption.',
      projectedReturn,
      urgencyLabel,
      ctaLabel: params.checkoutUrl ? 'Activate watchtower' : 'Reserve watchtower access',
      checkoutUrl: params.checkoutUrl,
    }
  }

  return {
    ...DEFAULT_PRICING,
    projectedReturn,
    urgencyLabel,
    ctaLabel: params.checkoutUrl ? 'Activate revenue watchtower' : 'Claim pilot access',
    checkoutUrl: params.checkoutUrl,
  }
}

export function inferArtifactKind(title: string, content: string): ArtifactKind {
  const text = `${title}\n${content}`.toLowerCase()

  if (matchesAny(text, ['msa', 'statement of work', 'master services agreement', 'scope of work'])) {
    return 'contract'
  }
  if (matchesAny(text, ['invoice', 'bill', 'line item', 'invoice total'])) {
    return 'invoice'
  }
  if (matchesAny(text, ['kickoff', 'meeting', 'notes', 'recap'])) {
    return 'meeting_note'
  }
  if (matchesAny(text, ['slack', 'email', 'thread', 'message', 'client asked'])) {
    return 'client_message'
  }
  if (matchesAny(text, ['task', 'board', 'linear', 'jira', 'todo', 'export'])) {
    return 'task_export'
  }
  if (matchesAny(text, ['delivery', 'debrief', 'shipped', 'released'])) {
    return 'delivery_note'
  }

  return 'other'
}

function normalizeArtifact(input: ArtifactInput): ArtifactRecord {
  const kind = input.kind ?? inferArtifactKind(input.title, input.content)
  const createdAt = input.createdAt ?? new Date().toISOString()
  const trimmed = input.content.trim().replaceAll(/\s+/g, ' ')

  return {
    id: input.id ?? makeId(`${input.title}-${createdAt}`),
    title: input.title,
    kind,
    source: input.source,
    content: input.content.trim(),
    createdAt,
    excerpt: trimmed.slice(0, 180),
    tokensApprox: Math.max(32, Math.round(trimmed.length / 4)),
  }
}

function extractBaseline(contract?: ArtifactRecord): ContractBaseline {
  if (!contract) {
    return {
      clientName: 'Unknown client',
      projectName: 'Untitled engagement',
      baseFee: 12000,
      overageRate: 150,
      revisionRoundsIncluded: 2,
      deliverables: ['Core project deliverables not provided'],
      exclusions: ['No exclusions provided'],
      paymentTerms: ['Commercial terms unavailable'],
    }
  }

  const lines = contract.content
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const clientName = lines.find((line) => line.toLowerCase().startsWith('client:'))?.split(':')[1]?.trim() ?? 'Unknown client'
  const projectName = lines.find((line) => line.toLowerCase().startsWith('project:'))?.split(':')[1]?.trim() ?? contract.title
  const baseFee = findCurrencyNear(contract.content, ['fixed project fee', 'fixed fee', 'project fee']) ?? 12000
  const overageRate = findCurrencyNear(contract.content, ['per hour', 'hour']) ?? 150
  const revisionRoundsIncluded = findNumericNear(contract.content, ['revision']) ?? 2

  return {
    clientName,
    projectName,
    baseFee,
    overageRate,
    revisionRoundsIncluded,
    deliverables: extractBulletsForSection(contract.content, ['scope of work', 'deliverables']).slice(0, 6),
    exclusions: extractBulletsForSection(contract.content, ['out of scope', 'exclusions', 'not included']).slice(0, 6),
    paymentTerms: extractBulletsForSection(contract.content, ['commercials', 'pricing', 'payment']).slice(0, 5),
  }
}

function extractEvidence(artifact: ArtifactRecord, baseline: ContractBaseline): EvidenceItem[] {
  if (artifact.kind === 'contract') {
    return []
  }

  return artifact.content
    .split('\n')
    .map((line) => line.trim())
    .filter((line) => line.length > 12)
    .flatMap((line) => {
      const lower = line.toLowerCase()
      const stage = inferSignalStage(artifact.kind, lower)

      return (Object.entries(CATEGORY_CONFIG) as Array<[RiskCategory, CategoryConfig]>)
        .filter(([, config]) => matchesAny(lower, config.keywords))
        .map(([category, config]) => {
          const hours = estimateHours(category, lower, baseline.overageRate, config.defaultHours)

          return {
            id: makeId(`${artifact.id}-${category}-${line}`),
            artifactId: artifact.id,
            title: config.title,
            category,
            excerpt: line.replace(/^[-*]\s*/, ''),
            impact: config.impact,
            stage,
            estimatedHours: hours,
            urgency: inferUrgency(lower, stage),
            occurredAt: artifact.createdAt,
          } satisfies EvidenceItem
        })
    })
}

function buildFindings(evidence: EvidenceItem[], baseline: ContractBaseline): Finding[] {
  const grouped = new Map<RiskCategory, EvidenceItem[]>()

  for (const item of evidence) {
    const items = grouped.get(item.category) ?? []
    items.push(item)
    grouped.set(item.category, items)
  }

  return Array.from(grouped.entries())
    .map(([category, items]) => buildFinding(category, items, baseline))
    .filter((finding): finding is Finding => Boolean(finding))
    .sort((left, right) => right.moneyAtRisk - left.moneyAtRisk)
}

function buildFinding(
  category: RiskCategory,
  items: EvidenceItem[],
  baseline: ContractBaseline,
): Finding | null {
  const config = CATEGORY_CONFIG[category]
  const baselineText = `${baseline.deliverables.join(' ')} ${baseline.exclusions.join(' ')}`.toLowerCase()
  const hasExplicitExclusion = matchesAny(baseline.exclusions.join(' ').toLowerCase(), config.baselineKeywords)
  const alreadyCovered = matchesAny(baseline.deliverables.join(' ').toLowerCase(), config.baselineKeywords)
  const hasExpansionLanguage = items.some((item) => matchesAny(item.excerpt.toLowerCase(), config.expansionKeywords))

  if (alreadyCovered && !hasExpansionLanguage && category !== 'revision_overrun') {
    return null
  }

  const stageMultiplier = 1 + (Math.max(...items.map((item) => STAGE_WEIGHTS[item.stage])) - 1) * 0.08
  const hours = Math.round(items.reduce((total, item) => total + item.estimatedHours, 0) * (items.length > 1 ? 0.85 : 1) * stageMultiplier)
  const moneyAtRisk = roundToNearestFifty(Math.max(hours * baseline.overageRate, baseline.baseFee * 0.08))
  const confidence = clamp(
    0.56 +
      items.length * 0.09 +
      (hasExplicitExclusion ? 0.12 : 0) +
      (hasExpansionLanguage ? 0.06 : 0) +
      (matchesAny(baselineText, ['change order', 'additional work']) ? 0.04 : 0),
    0.56,
    0.95,
  )
  const severity = getSeverity(moneyAtRisk)
  const topProof = items
    .slice()
    .sort((left, right) => right.urgency - left.urgency)
    .slice(0, 2)
    .map((item) => item.excerpt)

  return {
    id: makeId(`${category}-${items[0]?.artifactId ?? 'finding'}`),
    category,
    title: config.title,
    summary: [
      `${baseline.clientName} is already acting as though this work belongs inside the engagement.`,
      `DeltaProof estimates ${formatCurrency(moneyAtRisk)} in recoverable value if the team packages it before it hardens into expected free labor.`,
    ].join(' '),
    whyNow: topProof.join(' '),
    recommendation: config.recommendation,
    moneyAtRisk,
    confidence,
    severity,
    status: severity === 'medium' ? 'ready-to-send' : 'action-required',
    proofIds: items.map((item) => item.id),
  }
}

function buildPressureTracks(evidence: EvidenceItem[], findings: Finding[]): PressureTrack[] {
  const findingMap = new Map(findings.map((finding) => [finding.category, finding]))
  const grouped = new Map<RiskCategory, EvidenceItem[]>()

  for (const item of evidence) {
    const items = grouped.get(item.category) ?? []
    items.push(item)
    grouped.set(item.category, items)
  }

  return Array.from(grouped.entries())
    .map(([category, items]) => {
      const orderedItems = items.slice().sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))
      const stageMoments = buildStageMoments(orderedItems)
      const firstStage = stageMoments[0]?.stage ?? 'asked'
      const currentStage = stageMoments[stageMoments.length - 1]?.stage ?? 'asked'
      const finding = findingMap.get(category)
      const heat = Math.min(
        99,
        orderedItems.reduce((total, item) => total + item.urgency * 7, 0) +
          STAGE_WEIGHTS[currentStage] * 12 +
          (finding ? Math.round(finding.confidence * 20) : 0),
      )

      return {
        category,
        label: CATEGORY_CONFIG[category].title,
        currentStage,
        firstStage,
        heat,
        hiddenRevenue: finding?.moneyAtRisk ?? roundToNearestFifty(orderedItems.reduce((sum, item) => sum + item.estimatedHours, 0) * 120),
        narrative: buildPressureNarrative(category, firstStage, currentStage, orderedItems),
        stageMoments,
        proofIds: orderedItems.map((item) => item.id),
      } satisfies PressureTrack
    })
    .sort((left, right) => right.hiddenRevenue - left.hiddenRevenue)
}

function buildStageMoments(items: EvidenceItem[]): StageMoment[] {
  const grouped = new Map<SignalStage, EvidenceItem[]>()

  for (const item of items) {
    const list = grouped.get(item.stage) ?? []
    list.push(item)
    grouped.set(item.stage, list)
  }

  return STAGE_ORDER.filter((stage) => grouped.has(stage)).map((stage) => {
    const stageItems = grouped.get(stage) ?? []
    const sorted = stageItems.slice().sort((left, right) => left.occurredAt.localeCompare(right.occurredAt))

    return {
      stage,
      count: stageItems.length,
      firstSeenAt: sorted[0]?.occurredAt ?? new Date().toISOString(),
      lastSeenAt: sorted[sorted.length - 1]?.occurredAt ?? new Date().toISOString(),
    }
  })
}

function buildMonetizationPaths(
  findings: Finding[],
  pressureTracks: PressureTrack[],
  baseline: ContractBaseline,
): MonetizationPath[] {
  const trackMap = new Map(pressureTracks.map((track) => [track.category, track]))

  const directPaths = findings.map((finding) => {
    const config = CATEGORY_CONFIG[finding.category]
    const track = trackMap.get(finding.category)
    const currentStage = track?.currentStage ?? 'asked'
    const amount = computeOfferAmount(config.offerType, finding.moneyAtRisk, baseline.overageRate, currentStage, finding.category)
    const closeProbability = computeCloseProbability(config.offerType, currentStage, finding)

    return {
      id: makeId(`path-${finding.id}`),
      type: config.offerType,
      title: buildOfferTitle(finding.category, config.offerType),
      wedge: config.wedge,
      rationale: finding.summary,
      nextStep: config.nextStep,
      urgency: stageToUrgency(currentStage),
      amount,
      closeProbability,
      expectedValue: roundToNearestFifty(amount * closeProbability),
      relatedFindingIds: [finding.id],
    } satisfies MonetizationPath
  })

  const expansionCandidates = directPaths.filter((path) =>
    ['phase_two', 'pilot'].includes(path.type),
  )
  const bundlePath =
    expansionCandidates.length >= 2
      ? buildExpansionBundle(expansionCandidates.slice(0, 3))
      : null

  return [...directPaths, ...(bundlePath ? [bundlePath] : [])].sort(
    (left, right) => right.expectedValue - left.expectedValue,
  )
}

function buildOperatorConsole(params: {
  artifacts: ArtifactRecord[]
  baseline: ContractBaseline
  findings: Finding[]
  pressureTracks: PressureTrack[]
  monetizationPaths: MonetizationPath[]
}): OperatorConsole {
  const evidenceGaps = buildEvidenceGaps(params.artifacts, params.pressureTracks)
  const moves = buildExecutionMoves(
    params.monetizationPaths,
    params.findings,
    params.pressureTracks,
    params.baseline,
    evidenceGaps,
  )
  const scenarios = buildCommercialScenarios(moves, params.monetizationPaths, evidenceGaps)
  const recommendedScenario = scenarios[0]
  const recommendedMoves = moves.filter((move) => recommendedScenario?.moveIds.includes(move.id))

  return {
    thesis: buildOperatorThesis(recommendedScenario, recommendedMoves, params.baseline),
    costOfWaiting: computeCostOfWaiting(params.pressureTracks),
    recommendedScenarioId: recommendedScenario?.id ?? '',
    scenarios,
    moves,
    pushbackCards: buildPushbackCards(params.findings, params.pressureTracks, params.baseline),
    evidenceGaps,
  }
}

function buildSeedWatchtower(params: {
  artifacts: ArtifactRecord[]
  findings: Finding[]
  pressureTracks: PressureTrack[]
  operatorConsole: OperatorConsole
  monetizationPaths: MonetizationPath[]
}): Watchtower {
  const latestArtifactAt =
    params.artifacts
      .map((artifact) => artifact.createdAt)
      .sort()
      .at(-1) ?? new Date().toISOString()
  const topTrack = params.pressureTracks[0]
  const topScenario =
    params.operatorConsole.scenarios.find(
      (scenario) => scenario.id === params.operatorConsole.recommendedScenarioId,
    ) ?? params.operatorConsole.scenarios[0]
  const topPath = params.monetizationPaths[0]
  const costOfWaiting = params.operatorConsole.costOfWaiting
  const changes: WatchChange[] = [
    topTrack
      ? {
          id: makeId(`watch-stage-${topTrack.category}`),
          kind: 'stage_advance',
          title: `${RISK_CATEGORY_LABELS[topTrack.category]} is already hot`,
          summary: `The top pressure track is currently at ${topTrack.currentStage}. Continuous watch cycles make that stage movement visible instead of rediscovered.`,
          direction: 'new',
          magnitude: topTrack.heat,
          severity: topTrack.currentStage === 'shipped' || topTrack.currentStage === 'unbilled' ? 'critical' : 'high',
        }
      : null,
    {
      id: 'watch-cost-of-waiting',
      kind: 'cost_of_waiting',
      title: 'Weekly leverage is already decaying',
      summary: `Even on the first run, DeltaProof estimates ${formatCurrency(costOfWaiting)} in weekly leverage loss if nobody formalizes the work.`,
      direction: 'new',
      magnitude: costOfWaiting,
      severity: costOfWaiting >= 5000 ? 'critical' : costOfWaiting >= 2000 ? 'high' : 'medium',
    },
    topPath && topScenario
      ? {
          id: makeId(`watch-scenario-${topScenario.id}`),
          kind: 'scenario_shift',
          title: `${topScenario.title} is the current best posture`,
          summary: `${topPath.title} is the highest-leverage move right now. As history accumulates, the watchtower will flag when this posture changes.`,
          direction: 'new',
          magnitude: topScenario.winScore,
          severity: topScenario.winScore >= 80 ? 'high' : 'medium',
        }
      : null,
  ].filter((change): change is WatchChange => Boolean(change))

  const pulse: WatchPulse = {
    label: 'Now',
    createdAt: latestArtifactAt,
    moneyAtRiskTotal: params.findings.reduce((sum, finding) => sum + finding.moneyAtRisk, 0),
    shadowPipelineValue: params.monetizationPaths.reduce((sum, path) => sum + path.expectedValue, 0),
    costOfWaiting,
    exposureScore: Math.min(
      99,
      Math.round(
        (params.pressureTracks.reduce((sum, track) => sum + track.heat, 0) /
          Math.max(params.pressureTracks.length, 1)) *
          0.75,
      ),
    ),
    scenarioTitle: topScenario?.title ?? 'Operator posture forming',
  }

  return {
    state: 'first_run',
    narrative:
      'The watchtower is primed. As soon as DeltaProof sees this workspace again, it will start reporting what escalated, what stabilized, and which posture just became more winnable.',
    momentumScore: Math.min(
      99,
      28 +
        Math.round(costOfWaiting / 450) +
        Math.round((params.pressureTracks[0]?.heat ?? 0) * 0.2),
    ),
    cadence: 'Re-run after a new client ask, delivery update, or invoice cycle.',
    changes,
    pulses: [pulse],
  }
}

function buildDecisionWindow(params: {
  findings: Finding[]
  pressureTracks: PressureTrack[]
  operatorConsole: OperatorConsole
}): DecisionWindow {
  const topTrack = params.pressureTracks[0]
  const topScenario =
    params.operatorConsole.scenarios.find(
      (scenario) => scenario.id === params.operatorConsole.recommendedScenarioId,
    ) ?? params.operatorConsole.scenarios[0]
  const stageBudget: Record<SignalStage, number> = {
    whisper: 21,
    asked: 14,
    committed: 10,
    shipped: 6,
    unbilled: 3,
  }
  const baseDays = stageBudget[topTrack?.currentStage ?? 'asked']
  const costPenalty =
    params.operatorConsole.costOfWaiting >= 6000
      ? 3
      : params.operatorConsole.costOfWaiting >= 3000
        ? 2
        : params.operatorConsole.costOfWaiting >= 1500
          ? 1
          : 0
  const spreadPenalty = params.findings.length >= 5 ? 2 : params.findings.length >= 3 ? 1 : 0
  const days = clamp(baseDays - costPenalty - spreadPenalty, 1, 21)
  const label: DecisionWindow['label'] = days <= 3 ? 'Immediate' : days <= 7 ? 'This week' : 'This cycle'
  const stageLabel = topTrack?.currentStage ?? 'asked'
  const scenarioTitle = topScenario?.title ?? 'the current posture'

  return {
    days,
    label,
    rationale: topTrack
      ? `${topTrack.label} is already at ${stageLabel}, and the current best posture is ${scenarioTitle.toLowerCase()}.`
      : `The workspace already has enough commercial movement to justify acting on ${scenarioTitle.toLowerCase()}.`,
    consequence:
      days <= 3
        ? 'If this slips again, the work starts reading like expected delivery instead of added scope.'
        : days <= 7
          ? 'One more client cycle likely makes the added work feel emotionally pre-approved.'
          : 'There is still time to package this cleanly, but only if leadership treats it as a deliberate commercial decision now.',
  }
}

function buildExecutionMoves(
  monetizationPaths: MonetizationPath[],
  findings: Finding[],
  pressureTracks: PressureTrack[],
  baseline: ContractBaseline,
  evidenceGaps: string[],
): ExecutionMove[] {
  const findingMap = new Map(findings.map((finding) => [finding.id, finding]))
  const trackMap = new Map(pressureTracks.map((track) => [track.category, track]))

  return monetizationPaths
    .slice(0, 5)
    .map((path) => {
      const relatedFindings = path.relatedFindingIds
        .map((id) => findingMap.get(id))
        .filter((finding): finding is Finding => Boolean(finding))
      const relatedTrack = relatedFindings
        .map((finding) => trackMap.get(finding.category))
        .find((track): track is PressureTrack => Boolean(track))
      const currentStage = relatedTrack?.currentStage ?? 'asked'
      const confidence =
        relatedFindings.length > 0
          ? clamp(
              relatedFindings.reduce((sum, finding) => sum + finding.confidence, 0) / relatedFindings.length,
              0.42,
              0.96,
            )
          : path.closeProbability

      return {
        id: makeId(`move-${path.id}`),
        title: path.title,
        intent: inferMoveIntent(path.type),
        owner: inferMoveOwner(path),
        channel: inferMoveChannel(path.type),
        timing: urgencyToMoveTiming(path.urgency),
        revenue: path.expectedValue,
        confidence,
        relationshipRisk: computeRelationshipRisk(path, relatedFindings, currentStage, evidenceGaps.length),
        whyThisWins: buildMoveRationale(path, relatedTrack),
        script: buildMoveScript(path, baseline, currentStage),
        relatedFindingIds: path.relatedFindingIds,
        relatedPathIds: [path.id],
      } satisfies ExecutionMove
    })
    .sort((left, right) => {
      const leftScore = left.revenue * left.confidence - left.relationshipRisk * 90
      const rightScore = right.revenue * right.confidence - right.relationshipRisk * 90
      return rightScore - leftScore
    })
}

function buildCommercialScenarios(
  moves: ExecutionMove[],
  monetizationPaths: MonetizationPath[],
  evidenceGaps: string[],
): CommercialScenario[] {
  const pathMap = new Map(monetizationPaths.map((path) => [path.id, path]))
  const aggressiveMoves = uniqueMoves(
    moves
      .filter((move) => move.timing === 'today' || move.intent === 'recover')
      .slice(0, 2),
  )
  const bundleMoves = uniqueMoves([
    moves.find((move) => moveHasOfferType(move, 'expansion_bundle', pathMap)),
    moves.find((move) => moveHasOfferType(move, 'phase_two', pathMap)),
  ])
  const pilotMoves = uniqueMoves([
    moves.find((move) => moveHasOfferType(move, 'pilot', pathMap) || moveHasOfferType(move, 'retainer', pathMap)),
    moves
      .filter((move) => move.relationshipRisk <= 34)
      .sort((left, right) => right.revenue - left.revenue)[0],
  ])

  const scenarios = [
    createCommercialScenario(
      'recover_now',
      aggressiveMoves.length ? aggressiveMoves : moves.slice(0, 2),
      monetizationPaths,
      evidenceGaps,
    ),
    createCommercialScenario(
      'bundle_then_close',
      bundleMoves.length ? bundleMoves : moves.slice(0, 2),
      monetizationPaths,
      evidenceGaps,
    ),
    createCommercialScenario(
      'pilot_then_expand',
      pilotMoves.length ? pilotMoves : moves.slice(1, 3),
      monetizationPaths,
      evidenceGaps,
    ),
  ]
    .filter((scenario): scenario is CommercialScenario => Boolean(scenario))
    .filter((scenario, index, all) => all.findIndex((candidate) => candidate.id === scenario.id) === index)
    .sort((left, right) => right.winScore - left.winScore)

  return scenarios
}

function createCommercialScenario(
  posture: ScenarioPosture,
  inputMoves: ExecutionMove[],
  monetizationPaths: MonetizationPath[],
  evidenceGaps: string[],
): CommercialScenario | null {
  const moves = uniqueMoves(inputMoves)
  if (!moves.length) {
    return null
  }

  const coveredPathIds = new Set(moves.flatMap((move) => move.relatedPathIds))
  const revenueNow = roundToNearestFifty(moves.reduce((sum, move) => sum + move.revenue, 0))
  const remainingRevenue = monetizationPaths
    .filter((path) => !coveredPathIds.has(path.id))
    .reduce((sum, path) => sum + path.expectedValue, 0)
  const remainingMultiplier: Record<ScenarioPosture, number> = {
    recover_now: 0.38,
    bundle_then_close: 0.52,
    pilot_then_expand: 0.6,
  }
  const trustBoost: Record<ScenarioPosture, number> = {
    recover_now: -6,
    bundle_then_close: 6,
    pilot_then_expand: 12,
  }
  const difficultyBoost: Record<ScenarioPosture, number> = {
    recover_now: 10,
    bundle_then_close: 6,
    pilot_then_expand: 2,
  }
  const averageRisk = moves.reduce((sum, move) => sum + move.relationshipRisk, 0) / moves.length
  const averageConfidence = moves.reduce((sum, move) => sum + move.confidence, 0) / moves.length
  const pipelineLater = roundToNearestFifty(remainingRevenue * remainingMultiplier[posture])
  const trustPreservation = clamp(
    Math.round(72 - averageRisk * 0.55 + trustBoost[posture] + averageConfidence * 16 - evidenceGaps.length * 3),
    24,
    96,
  )
  const executionDifficulty = clamp(
    Math.round(28 + moves.length * 11 + averageRisk * 0.24 + evidenceGaps.length * 6 + difficultyBoost[posture]),
    18,
    90,
  )
  const winScore = clamp(
    Math.round(
      Math.min(45, revenueNow / 750) +
        Math.min(22, pipelineLater / 1500) +
        trustPreservation * 0.36 -
        executionDifficulty * 0.23,
    ),
    1,
    99,
  )
  const primaryMove = moves[0]

  return {
    id: makeId(`scenario-${posture}-${moves.map((move) => move.id).join('-')}`),
    posture,
    title: buildScenarioTitle(posture, primaryMove),
    thesis: buildScenarioNarrative(posture, primaryMove, revenueNow, pipelineLater),
    revenueNow,
    pipelineLater,
    trustPreservation,
    executionDifficulty,
    winScore,
    downside: buildScenarioDownside(posture, primaryMove),
    moveIds: moves.map((move) => move.id),
  }
}

function buildEvidenceGaps(artifacts: ArtifactRecord[], pressureTracks: PressureTrack[]): string[] {
  const kinds = new Set(artifacts.map((artifact) => artifact.kind))
  const gaps: string[] = []

  if (!kinds.has('contract')) {
    gaps.push('Upload the signed scope section so every pushback answer can point to exact exclusion language.')
  }

  if (!kinds.has('invoice')) {
    gaps.push('Upload the latest invoice so shipped work can be separated cleanly from what has already been billed.')
  }

  if (!kinds.has('client_message') && !kinds.has('meeting_note')) {
    gaps.push('Add one client ask or meeting recap so the first signal is anchored to demand, not just internal delivery work.')
  }

  if (
    !kinds.has('delivery_note') &&
    pressureTracks.some((track) => track.currentStage === 'shipped' || track.currentStage === 'unbilled')
  ) {
    gaps.push('Add one delivery recap proving the extra work already shipped, which lowers relationship risk on the recovery ask.')
  }

  if (
    pressureTracks.some(
      (track) =>
        (track.currentStage === 'committed' || track.currentStage === 'shipped' || track.currentStage === 'unbilled') &&
        !track.stageMoments.some((moment) => moment.stage === 'whisper' || moment.stage === 'asked'),
    )
  ) {
    gaps.push('Capture the earliest client-side signal for the in-flight work so the commercial story starts before execution, not after it.')
  }

  return uniqueTop(gaps, 3)
}

function buildPushbackCards(
  findings: Finding[],
  pressureTracks: PressureTrack[],
  baseline: ContractBaseline,
): PushbackCard[] {
  const trackMap = new Map(pressureTracks.map((track) => [track.category, track]))

  return findings.slice(0, 3).map((finding, index) => {
    const track = trackMap.get(finding.category)
    const exclusion = baseline.exclusions.find((item) =>
      matchesAny(item.toLowerCase(), CATEGORY_CONFIG[finding.category].baselineKeywords),
    )
    const objection =
      finding.category === 'revision_overrun'
        ? 'We assumed revisions were still included.'
        : index === 0
          ? 'We thought this was part of the original scope.'
          : index === 1
            ? 'Why are we only formalizing this now?'
            : 'Can we defer this until after launch?'
    const response =
      finding.category === 'revision_overrun'
        ? `The signed SOW includes ${baseline.revisionRoundsIncluded} revision rounds, and the work trail now shows a third pass. Billing the overage keeps the approval loop clean instead of hiding executive change inside the base fee.`
        : [
            exclusion ? `The signed scope explicitly excludes ${exclusion.toLowerCase()}.` : 'The written scope does not cover this work as currently framed.',
            track
              ? `The signal has already progressed from ${track.firstStage.replaceAll('_', ' ')} to ${track.currentStage.replaceAll('_', ' ')} in the delivery trail.`
              : 'The delivery trail shows this is no longer a hypothetical ask.',
            `The clean move is to package ${finding.title.toLowerCase()} as a separate commercial decision while momentum is still on our side.`,
          ].join(' ')

    return {
      objection,
      response,
      proofIds: track?.proofIds.slice(0, 3) ?? finding.proofIds.slice(0, 3),
    } satisfies PushbackCard
  })
}

function buildOperatorThesis(
  scenario: CommercialScenario | undefined,
  moves: ExecutionMove[],
  baseline: ContractBaseline,
): string {
  const primaryMove = moves[0]

  if (!scenario || !primaryMove) {
    return `DeltaProof is ready to rank the safest recovery posture as soon as the first monetizable path appears in ${baseline.projectName}.`
  }

  return [
    `${scenario.title} is the best move right now.`,
    `Lead with ${primaryMove.title.toLowerCase()} because it carries ${formatCurrency(primaryMove.revenue)} in expected value at ${Math.round(primaryMove.confidence * 100)}% confidence.`,
    `That keeps the team commercial without turning the client conversation into a surprise invoice fight.`,
  ].join(' ')
}

function computeCostOfWaiting(pressureTracks: PressureTrack[]): number {
  const weeklySlip = pressureTracks.reduce((sum, track) => {
    const multipliers: Record<SignalStage, number> = {
      whisper: 0.02,
      asked: 0.04,
      committed: 0.07,
      shipped: 0.11,
      unbilled: 0.13,
    }

    return sum + track.hiddenRevenue * multipliers[track.currentStage]
  }, 0)

  return roundToNearestFifty(weeklySlip)
}

function buildRealityLens(baseline: ContractBaseline, evidence: EvidenceItem[]): RealityLens {
  const clientBelief = uniqueTop(
    evidence
      .filter((item) => ['whisper', 'asked'].includes(item.stage))
      .map((item) => item.excerpt),
    4,
  )
  const deliveryReality = uniqueTop(
    evidence
      .filter((item) => ['committed', 'shipped', 'unbilled'].includes(item.stage))
      .map((item) => item.excerpt),
    4,
  )
  const signedTruth = uniqueTop(
    [
      ...baseline.deliverables.slice(0, 3),
      ...baseline.exclusions.slice(0, 2).map((item) => `Not included: ${item}`),
    ],
    4,
  )

  return {
    signedTruth,
    clientBelief,
    deliveryReality,
    narrative:
      clientBelief.length && deliveryReality.length
        ? `The contract sells ${baseline.projectName}, but the relationship is drifting toward ${deliveryReality[0].toLowerCase()}. DeltaProof exposes that reality before the client mistakes it for included work.`
        : `DeltaProof compares the written commercial truth with what the client has started believing and what the team is already shipping.`,
  }
}

function buildSemanticMotifs(evidence: EvidenceItem[], findings: Finding[]): SemanticMotif[] {
  const motifs: Array<{
    title: string
    match: (item: EvidenceItem) => boolean
    commercialAngle: string
  }> = [
    {
      title: 'Partner operating surface',
      match: (item) => ['portal_access', 'data_sync', 'analytics_expansion'].includes(item.category),
      commercialAngle:
        'Bundle access, systems, and reporting into one operational milestone instead of defending three isolated overages.',
    },
    {
      title: 'AI knowledge layer',
      match: (item) => item.category === 'ai_assistant',
      commercialAngle:
        'Package the ask as an AI pilot with clear content boundaries, analytics, and a model budget rather than a “small chatbot add-on.”',
    },
    {
      title: 'Support gravity',
      match: (item) => ['maintenance_tail', 'new_deliverable'].includes(item.category),
      commercialAngle:
        'Recurring delivery gravity is a retainer or add-on lane waiting to be named and priced.',
    },
    {
      title: 'Approval breakdown',
      match: (item) => item.category === 'revision_overrun',
      commercialAngle:
        'When approval discipline breaks, revision overages become the fastest path to cleanly recovered revenue.',
    },
  ]

  const motifResults: Array<SemanticMotif | null> = motifs.map((motif) => {
      const items = evidence.filter(motif.match)
      if (!items.length) {
        return null
      }

      const categories = uniqueCategories(items)
      const intensity = Math.min(99, items.reduce((sum, item) => sum + item.urgency * 9, 0) + categories.length * 11)
      const noveltyScore = Math.min(
        99,
        42 + new Set(items.map((item) => item.stage)).size * 12 + categories.length * 8,
      )
      const sampleExcerpts = uniqueTop(items.map((item) => item.excerpt), 3)
      const evidenceIds = items.map((item) => item.id)
      const relatedRevenue = findings
        .filter((finding) => categories.includes(finding.category))
        .reduce((sum, finding) => sum + finding.moneyAtRisk, 0)

      return {
        id: makeId(`motif-${motif.title}`),
        title: motif.title,
        summary:
          relatedRevenue > 0
            ? `${motif.title} is emerging across ${items.length} signals and currently touches ${formatCurrency(relatedRevenue)} in recoverable or expandable value.`
            : `${motif.title} is emerging across ${items.length} signals and deserves packaging before it gets normalized.`,
        evidenceIds,
        categories,
        intensity,
        noveltyScore,
        commercialAngle: motif.commercialAngle,
        sampleExcerpts,
        source: 'heuristic',
      } satisfies SemanticMotif
    })

  return motifResults
    .filter((motif): motif is SemanticMotif => motif !== null)
    .sort((left, right) => right.intensity - left.intensity)
}

function buildPacket(
  findings: Finding[],
  baseline: ContractBaseline,
  workspaceName: string,
): ChangeOrderPacket {
  const lineItems = findings.slice(0, 4).map((finding) => findingToLineItem(finding, baseline.overageRate))
  const total = lineItems.reduce((sum, item) => sum + item.amount, 0)

  return {
    title: `${workspaceName} change-order packet`,
    summary: `${formatCurrency(total)} in recoverable work is already evidenced across delivery artifacts, client asks, and billing gaps.`,
    bulletPoints: findings
      .slice(0, 4)
      .map((finding) => `${finding.title} -> ${formatCurrency(finding.moneyAtRisk)}`),
    lineItems,
    emailDraft: [
      `Subject: Change order package for ${baseline.projectName}`,
      '',
      `Hi ${baseline.clientName},`,
      '',
      `As the engagement has progressed, a few requests have moved beyond the original scope and revision limits in the signed SOW.`,
      `We reviewed the live delivery trail and prepared a change-order package totaling ${formatCurrency(total)} to cover the additional work already underway.`,
      '',
      ...lineItems.map((item) => `- ${item.label}: ${formatCurrency(item.amount)} (${item.hours} hours)`),
      '',
      'If approved, we can keep momentum without forcing the team to absorb the added scope into the original fixed fee.',
      '',
      'Best,',
      'DeltaProof',
    ].join('\n'),
  }
}

function findingToLineItem(finding: Finding, overageRate: number): ChangeOrderLineItem {
  const hours = Math.max(4, Math.round(finding.moneyAtRisk / Math.max(overageRate, 1)))

  return {
    label: finding.title,
    hours,
    amount: finding.moneyAtRisk,
    rationale: finding.recommendation,
  }
}

function extractBulletsForSection(content: string, headings: string[]): string[] {
  const lower = content.toLowerCase()
  const heading = headings.find((candidate) => lower.includes(candidate))

  if (!heading) {
    return []
  }

  const sectionStart = lower.indexOf(heading)
  const sectionText = content.slice(sectionStart)
  const lines = sectionText
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  const bullets = lines
    .filter((line) => line.startsWith('-'))
    .map((line) => line.replace(/^[-*]\s*/, ''))

  return bullets.length ? bullets : lines.slice(1, 5)
}

function findCurrencyNear(text: string, anchors: string[]): number | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (!matchesAny(lower, anchors)) {
      continue
    }

    const match = line.match(/\$([\d,]+)/)
    if (match) {
      return Number.parseInt(match[1].replaceAll(',', ''), 10)
    }
  }

  return null
}

function findNumericNear(text: string, anchors: string[]): number | null {
  const lines = text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)

  for (const line of lines) {
    const lower = line.toLowerCase()
    if (!matchesAny(lower, anchors)) {
      continue
    }

    const digitMatch = line.match(/(\d+)/)
    if (digitMatch) {
      return Number.parseInt(digitMatch[1], 10)
    }

    if (lower.includes('two')) {
      return 2
    }
    if (lower.includes('three')) {
      return 3
    }
  }

  return null
}

function matchesAny(text: string, candidates: string[]): boolean {
  return candidates.some((candidate) => text.includes(candidate))
}

function inferSignalStage(kind: ArtifactKind, line: string): SignalStage {
  if (kind === 'invoice') {
    return 'unbilled'
  }

  if (kind === 'delivery_note') {
    return 'shipped'
  }

  if (kind === 'task_export') {
    return 'committed'
  }

  if (kind === 'meeting_note') {
    return line.includes('maybe') || line.includes('explore') ? 'whisper' : 'asked'
  }

  if (kind === 'client_message') {
    return 'asked'
  }

  return 'asked'
}

function inferUrgency(line: string, stage: SignalStage): number {
  if (line.includes('before launch')) {
    return 5
  }

  if (stage === 'shipped' || stage === 'unbilled') {
    return 5
  }

  if (stage === 'committed') {
    return 4
  }

  return line.includes('also') ? 3 : 2
}

function estimateHours(
  category: RiskCategory,
  line: string,
  overageRate: number,
  fallback: number,
): number {
  if (category === 'revision_overrun') {
    return line.includes('third') || line.includes('v3') ? 14 : 10
  }

  if (category === 'portal_access') {
    return line.includes('partner') ? 44 : 36
  }

  if (category === 'data_sync') {
    return line.includes('salesforce') ? 18 : 12
  }

  if (category === 'maintenance_tail') {
    return line.includes('after-hours') ? 18 : 8
  }

  if (category === 'new_deliverable') {
    return line.includes('ipad') || line.includes('device onboarding') ? 20 : 12
  }

  const budgetSignal = line.match(/\$([\d,]+)/)
  if (budgetSignal) {
    return Math.round(Number.parseInt(budgetSignal[1].replaceAll(',', ''), 10) / Math.max(overageRate, 1))
  }

  return fallback
}

function computeOfferAmount(
  offerType: OfferType,
  moneyAtRisk: number,
  overageRate: number,
  currentStage: SignalStage,
  category: RiskCategory,
): number {
  if (offerType === 'change_order') {
    return roundToNearestFifty(moneyAtRisk)
  }

  if (offerType === 'pilot') {
    return roundToNearestFifty(Math.max(4500, moneyAtRisk * 0.78))
  }

  if (offerType === 'retainer') {
    return roundToNearestFifty(Math.max(3000, overageRate * 20, moneyAtRisk * 0.58))
  }

  if (offerType === 'phase_two') {
    const floor = category === 'portal_access' ? 7000 : 5500
    const stageLift = currentStage === 'shipped' || currentStage === 'unbilled' ? 1.06 : 0.94
    return roundToNearestFifty(Math.max(floor, moneyAtRisk * stageLift))
  }

  return roundToNearestFifty(moneyAtRisk)
}

function computeCloseProbability(
  offerType: OfferType,
  currentStage: SignalStage,
  finding: Finding,
): number {
  const stageBase: Record<SignalStage, number> = {
    whisper: 0.52,
    asked: 0.63,
    committed: 0.74,
    shipped: 0.83,
    unbilled: 0.88,
  }
  const offerAdjustment: Record<OfferType, number> = {
    change_order: 0.05,
    phase_two: 0,
    pilot: -0.04,
    retainer: -0.02,
    expansion_bundle: -0.06,
  }
  const severityAdjustment: Record<FindingSeverity, number> = {
    critical: 0.02,
    high: 0.01,
    medium: -0.02,
  }

  return clamp(
    stageBase[currentStage] +
      offerAdjustment[offerType] +
      severityAdjustment[finding.severity] +
      (finding.confidence - 0.7) * 0.2,
    0.42,
    0.93,
  )
}

function buildOfferTitle(category: RiskCategory, offerType: OfferType): string {
  if (offerType === 'change_order') {
    return `${CATEGORY_CONFIG[category].title} change order`
  }
  if (offerType === 'pilot') {
    return 'AI knowledge pilot'
  }
  if (offerType === 'retainer') {
    return 'Coverage and support retainer'
  }
  if (category === 'portal_access') {
    return 'Partner experience phase-two'
  }
  if (category === 'analytics_expansion') {
    return 'Regional analytics expansion sprint'
  }
  if (category === 'data_sync') {
    return 'Growth systems integration sprint'
  }

  return 'Expansion milestone'
}

function buildExpansionBundle(paths: MonetizationPath[]): MonetizationPath {
  const amount = roundToNearestFifty(paths.reduce((sum, path) => sum + path.amount, 0) * 0.92)
  const closeProbability = clamp(
    paths.reduce((sum, path) => sum + path.closeProbability, 0) / paths.length - 0.05,
    0.42,
    0.89,
  )

  return {
    id: makeId(`bundle-${paths.map((path) => path.id).join('-')}`),
    type: 'expansion_bundle',
    title: 'Shadow pipeline bundle',
    wedge:
      'Instead of defending scattered overages one by one, package the asks the client already believes belong together into the obvious next phase.',
    rationale:
      'This bundle groups the strongest adjacent asks into one cleaner decision so the client buys an outcome, not a pile of exceptions.',
    nextStep:
      'Present it as the next logical milestone with one price, one outcome, and one approval path while the demand is already emotionally validated.',
    urgency: paths.some((path) => path.urgency === 'now') ? 'now' : 'this-week',
    amount,
    closeProbability,
    expectedValue: roundToNearestFifty(amount * closeProbability),
    relatedFindingIds: paths.flatMap((path) => path.relatedFindingIds),
  }
}

function buildPressureNarrative(
  category: RiskCategory,
  firstStage: SignalStage,
  currentStage: SignalStage,
  items: EvidenceItem[],
): string {
  const firstLine = items[0]?.excerpt ?? CATEGORY_CONFIG[category].title
  const lastLine = items[items.length - 1]?.excerpt ?? firstLine

  return `Started as a ${firstStage} signal and is now at ${currentStage}. It began with "${firstLine}" and has progressed to "${lastLine}".`
}

function inferMoveIntent(offerType: OfferType): ExecutionMove['intent'] {
  if (offerType === 'retainer') {
    return 'stabilize'
  }

  if (offerType === 'change_order') {
    return 'recover'
  }

  return 'expand'
}

function inferMoveOwner(path: MonetizationPath): MoveOwner {
  if (path.type === 'expansion_bundle' || path.expectedValue >= 15000) {
    return 'founder'
  }

  if (path.type === 'change_order' && path.urgency === 'now') {
    return 'delivery_lead'
  }

  return 'account_lead'
}

function inferMoveChannel(offerType: OfferType): MoveChannel {
  if (offerType === 'change_order') {
    return 'email'
  }

  if (offerType === 'pilot' || offerType === 'retainer') {
    return 'proposal'
  }

  return 'call'
}

function urgencyToMoveTiming(urgency: MonetizationPath['urgency']): MoveTiming {
  if (urgency === 'now') {
    return 'today'
  }

  if (urgency === 'this-week') {
    return '48h'
  }

  return 'this_week'
}

function computeRelationshipRisk(
  path: MonetizationPath,
  relatedFindings: Finding[],
  currentStage: SignalStage,
  evidenceGapCount: number,
): number {
  const offerBase: Record<OfferType, number> = {
    change_order: 46,
    phase_two: 32,
    pilot: 26,
    retainer: 18,
    expansion_bundle: 28,
  }
  const stageAdjustment: Record<SignalStage, number> = {
    whisper: 14,
    asked: 8,
    committed: -2,
    shipped: -8,
    unbilled: -10,
  }
  const severityAdjustment =
    relatedFindings.some((finding) => finding.severity === 'critical')
      ? -6
      : relatedFindings.some((finding) => finding.severity === 'high')
        ? -2
        : 4

  return clamp(
    Math.round(
      offerBase[path.type] +
        stageAdjustment[currentStage] +
        severityAdjustment +
        evidenceGapCount * 4 -
        path.closeProbability * 18,
    ),
    8,
    88,
  )
}

function buildMoveRationale(path: MonetizationPath, track?: PressureTrack): string {
  if (!track) {
    return `${path.title} is already commercially credible. ${path.wedge}`
  }

  return `${path.title} has already moved from ${track.firstStage.replaceAll('_', ' ')} to ${track.currentStage.replaceAll(
    '_',
    ' ',
  )}, which makes this the cleanest moment to formalize the work before it hardens into expectation.`
}

function buildMoveScript(
  path: MonetizationPath,
  baseline: ContractBaseline,
  currentStage: SignalStage,
): string {
  const posture =
    path.type === 'change_order'
      ? 'a scoped overage approval'
      : path.type === 'pilot'
        ? 'a constrained pilot with a defined budget'
        : path.type === 'retainer'
          ? 'a named monthly coverage lane'
          : 'the next commercial milestone'

  return [
    `The signed engagement for ${baseline.projectName} did not price this work as part of the base fee, but the trail shows it is now at the ${currentStage.replaceAll('_', ' ')} stage.`,
    `Let’s package ${path.title.toLowerCase()} as ${posture} at ${formatCurrency(path.amount)} so we keep momentum without absorbing the delta into the original scope.`,
  ].join(' ')
}

function moveHasOfferType(
  move: ExecutionMove | undefined,
  offerType: OfferType,
  pathMap: Map<string, MonetizationPath>,
): boolean {
  if (!move) {
    return false
  }

  return move.relatedPathIds.some((pathId) => pathMap.get(pathId)?.type === offerType)
}

function uniqueMoves(input: Array<ExecutionMove | undefined>): ExecutionMove[] {
  const seen = new Set<string>()

  return input.filter((move): move is ExecutionMove => {
    if (!move || seen.has(move.id)) {
      return false
    }

    seen.add(move.id)
    return true
  })
}

function buildScenarioTitle(posture: ScenarioPosture, primaryMove: ExecutionMove): string {
  if (posture === 'recover_now') {
    return 'Recover the already-validated delta'
  }

  if (posture === 'bundle_then_close') {
    return primaryMove.title.toLowerCase().includes('bundle')
      ? 'Sell one clean next phase'
      : 'Bundle the adjacent asks into one yes'
  }

  return 'Land the smallest safe yes, then expand'
}

function buildScenarioNarrative(
  posture: ScenarioPosture,
  primaryMove: ExecutionMove,
  revenueNow: number,
  pipelineLater: number,
): string {
  if (posture === 'recover_now') {
    return `${primaryMove.title} gives the fastest clean recovery path, with ${formatCurrency(revenueNow)} ready to formalize while the work is already emotionally validated.`
  }

  if (posture === 'bundle_then_close') {
    return `Collapse scattered asks into one outcome-led proposal, recover ${formatCurrency(revenueNow)} now, and keep another ${formatCurrency(pipelineLater)} alive for follow-on expansion.`
  }

  return `Start with the easiest constrained buy, protect the relationship, and use it to open ${formatCurrency(pipelineLater)} in broader expansion after the first yes lands.`
}

function buildScenarioDownside(posture: ScenarioPosture, primaryMove: ExecutionMove): string {
  if (posture === 'recover_now') {
    return 'If the team has not aligned internally on evidence, this can feel like a surprise invoice instead of a justified scope correction.'
  }

  if (posture === 'bundle_then_close') {
    return 'Bundling increases deal clarity, but it can delay cash recovery if the client wants to pick apart individual asks.'
  }

  return `${primaryMove.title} is the softest entry point, but it may leave near-term recovery money on the table if the client is already ready for a bigger approval.`
}

function stageToUrgency(stage: SignalStage): MonetizationPath['urgency'] {
  if (stage === 'shipped' || stage === 'unbilled') {
    return 'now'
  }
  if (stage === 'committed') {
    return 'this-week'
  }
  return 'this-month'
}

function computeAverageLeadDays(tracks: PressureTrack[]): number {
  const leadDays = tracks
    .map((track) => {
      const early = track.stageMoments.find((moment) => moment.stage === 'whisper' || moment.stage === 'asked')
      const late = track.stageMoments.find((moment) =>
        moment.stage === 'committed' || moment.stage === 'shipped' || moment.stage === 'unbilled',
      )

      if (!early || !late) {
        return null
      }

      const delta = new Date(late.firstSeenAt).getTime() - new Date(early.firstSeenAt).getTime()
      return Math.max(0, Math.round(delta / 86_400_000))
    })
    .filter((value): value is number => value !== null)

  if (!leadDays.length) {
    return 0
  }

  return Math.round(leadDays.reduce((sum, value) => sum + value, 0) / leadDays.length)
}

function uniqueTop(items: string[], limit: number): string[] {
  const seen = new Set<string>()

  return items.filter((item) => {
    if (seen.has(item)) {
      return false
    }
    seen.add(item)
    return true
  }).slice(0, limit)
}

function uniqueCategories(items: EvidenceItem[]): RiskCategory[] {
  return Array.from(new Set(items.map((item) => item.category)))
}

function getSeverity(moneyAtRisk: number): FindingSeverity {
  if (moneyAtRisk >= 4500) {
    return 'critical'
  }
  if (moneyAtRisk >= 2200) {
    return 'high'
  }
  return 'medium'
}

function clamp(value: number, min: number, max: number): number {
  return Math.min(max, Math.max(min, value))
}

function roundToNearestFifty(amount: number): number {
  return Math.round(amount / 50) * 50
}

function makeId(input: string): string {
  return input
    .toLowerCase()
    .replaceAll(/[^a-z0-9]+/g, '-')
    .replaceAll(/(^-|-$)/g, '')
    .slice(0, 48)
}
