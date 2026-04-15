export type ArtifactKind =
  | 'contract'
  | 'meeting_note'
  | 'client_message'
  | 'task_export'
  | 'invoice'
  | 'delivery_note'
  | 'other'

export type RiskCategory =
  | 'portal_access'
  | 'ai_assistant'
  | 'data_sync'
  | 'revision_overrun'
  | 'analytics_expansion'
  | 'new_deliverable'
  | 'maintenance_tail'

export type FindingSeverity = 'critical' | 'high' | 'medium'

export type RuntimeStrategy = 'heuristic' | 'ollama'

export type SignalStage = 'whisper' | 'asked' | 'committed' | 'shipped' | 'unbilled'

export type OfferType =
  | 'change_order'
  | 'phase_two'
  | 'pilot'
  | 'retainer'
  | 'expansion_bundle'

export type ScenarioPosture = 'recover_now' | 'bundle_then_close' | 'pilot_then_expand'

export type MoveOwner = 'founder' | 'account_lead' | 'delivery_lead'

export type MoveChannel = 'email' | 'call' | 'proposal'

export type MoveTiming = 'today' | '48h' | 'this_week'

export type WatchtowerState = 'first_run' | 'warming' | 'tracking'

export type WatchChangeKind =
  | 'money_at_risk'
  | 'shadow_pipeline'
  | 'cost_of_waiting'
  | 'scenario_shift'
  | 'new_finding'
  | 'stage_advance'
  | 'stable'

export type WatchChangeDirection = 'up' | 'down' | 'flat' | 'new'

export interface ArtifactInput {
  id?: string
  title: string
  kind?: ArtifactKind
  source: string
  content: string
  createdAt?: string
}

export interface ArtifactRecord {
  id: string
  title: string
  kind: ArtifactKind
  source: string
  content: string
  createdAt: string
  excerpt: string
  tokensApprox: number
}

export interface ContractBaseline {
  clientName: string
  projectName: string
  baseFee: number
  overageRate: number
  revisionRoundsIncluded: number
  deliverables: string[]
  exclusions: string[]
  paymentTerms: string[]
}

export interface EvidenceItem {
  id: string
  artifactId: string
  title: string
  category: RiskCategory
  excerpt: string
  impact: 'scope' | 'budget' | 'timeline'
  stage: SignalStage
  estimatedHours: number
  urgency: number
  occurredAt: string
}

export interface Finding {
  id: string
  category: RiskCategory
  title: string
  summary: string
  whyNow: string
  recommendation: string
  moneyAtRisk: number
  confidence: number
  severity: FindingSeverity
  status: 'action-required' | 'ready-to-send'
  proofIds: string[]
}

export interface ChangeOrderLineItem {
  label: string
  hours: number
  amount: number
  rationale: string
}

export interface ChangeOrderPacket {
  title: string
  summary: string
  bulletPoints: string[]
  lineItems: ChangeOrderLineItem[]
  emailDraft: string
}

export interface OverviewMetrics {
  moneyAtRiskTotal: number
  shadowPipelineValue: number
  exposureScore: number
  riskCount: number
  contractedDeliverables: number
  evidenceMoments: number
  averageLeadDays: number
}

export interface TechPillar {
  label: string
  detail: string
}

export interface LoopCard {
  title: string
  focus: string
  metric: string
}

export interface PricingCard {
  plan: string
  price: string
  promise: string
  buyerFit: string
  paybackWindow: string
  projectedReturn: string
  urgencyLabel: string
  ctaLabel: string
  checkoutUrl?: string
}

export interface BuyerIntentRequest {
  name: string
  email: string
  company: string
  notes?: string
  workspaceName: string
  workspaceSlug: string
  plan: string
  moneyAtRiskTotal: number
  shadowPipelineValue: number
  decisionWindowDays: number
  source: 'pricing_panel'
}

export interface BuyerIntentReceipt {
  ok: true
  leadId: string
  queuedAt: string
}

export interface RuntimeInfo {
  strategy: RuntimeStrategy
  model: string
  persistence: 'demo' | 'd1'
}

export interface ExecutionMove {
  id: string
  title: string
  intent: 'recover' | 'expand' | 'stabilize'
  owner: MoveOwner
  channel: MoveChannel
  timing: MoveTiming
  revenue: number
  confidence: number
  relationshipRisk: number
  whyThisWins: string
  script: string
  relatedFindingIds: string[]
  relatedPathIds: string[]
}

export interface CommercialScenario {
  id: string
  posture: ScenarioPosture
  title: string
  thesis: string
  revenueNow: number
  pipelineLater: number
  trustPreservation: number
  executionDifficulty: number
  winScore: number
  downside: string
  moveIds: string[]
}

export interface PushbackCard {
  objection: string
  response: string
  proofIds: string[]
}

export interface OperatorConsole {
  thesis: string
  costOfWaiting: number
  recommendedScenarioId: string
  scenarios: CommercialScenario[]
  moves: ExecutionMove[]
  pushbackCards: PushbackCard[]
  evidenceGaps: string[]
}

export interface WatchChange {
  id: string
  kind: WatchChangeKind
  title: string
  summary: string
  direction: WatchChangeDirection
  magnitude: number
  severity: FindingSeverity
}

export interface WatchPulse {
  label: string
  createdAt: string
  moneyAtRiskTotal: number
  shadowPipelineValue: number
  costOfWaiting: number
  exposureScore: number
  scenarioTitle: string
}

export interface Watchtower {
  state: WatchtowerState
  narrative: string
  momentumScore: number
  cadence: string
  changes: WatchChange[]
  pulses: WatchPulse[]
}

export interface WorkspaceSummary {
  slug: string
  name: string
  source: 'seed' | 'd1'
  updatedAt: string
  moneyAtRiskTotal: number
  shadowPipelineValue: number
  costOfWaiting: number
  riskCount: number
  momentumScore: number
  decisionWindowDays: number
  watchtowerState: WatchtowerState
  topScenario: string
}

export interface ExecutiveBrief {
  title: string
  headline: string
  decision: string
  whyNow: string
  decisionWindowLabel: string
  internalNarrative: string
  clientNarrative: string
  financialCallout: string
  proofBullets: string[]
  operatorMoves: string[]
  boardQuestions: string[]
  markdown: string
}

export interface DecisionWindow {
  days: number
  label: 'Immediate' | 'This week' | 'This cycle'
  rationale: string
  consequence: string
}

export interface PortfolioPriority {
  slug: string
  workspaceName: string
  headline: string
  decisionWindowDays: number
  moneyAtRiskTotal: number
  shadowPipelineValue: number
  costOfWaiting: number
  momentumScore: number
  recommendedScenario: string
  nextMove: string
  whyThisWeek: string
}

export interface PortfolioBrief {
  title: string
  headline: string
  summary: string
  portfolioCallout: string
  workspacesTracked: number
  urgentWorkspaceCount: number
  revenueAtRiskTotal: number
  shadowPipelineTotal: number
  costOfWaitingTotal: number
  mustDoThisWeek: string[]
  blindSpots: string[]
  priorities: PortfolioPriority[]
  markdown: string
}

export interface StageMoment {
  stage: SignalStage
  count: number
  firstSeenAt: string
  lastSeenAt: string
}

export interface PressureTrack {
  category: RiskCategory
  label: string
  currentStage: SignalStage
  firstStage: SignalStage
  heat: number
  hiddenRevenue: number
  narrative: string
  stageMoments: StageMoment[]
  proofIds: string[]
}

export interface MonetizationPath {
  id: string
  type: OfferType
  title: string
  wedge: string
  rationale: string
  nextStep: string
  urgency: 'now' | 'this-week' | 'this-month'
  amount: number
  closeProbability: number
  expectedValue: number
  relatedFindingIds: string[]
}

export interface RealityLens {
  signedTruth: string[]
  clientBelief: string[]
  deliveryReality: string[]
  narrative: string
}

export interface SemanticMotif {
  id: string
  title: string
  summary: string
  evidenceIds: string[]
  categories: RiskCategory[]
  intensity: number
  noveltyScore: number
  commercialAngle: string
  sampleExcerpts: string[]
  source: 'heuristic' | 'embedding'
}

export interface DashboardPayload {
  workspaceName: string
  headline: string
  thesis: string
  baseline: ContractBaseline
  overview: OverviewMetrics
  decisionWindow: DecisionWindow
  artifacts: ArtifactRecord[]
  evidence: EvidenceItem[]
  findings: Finding[]
  pressureTracks: PressureTrack[]
  monetizationPaths: MonetizationPath[]
  operatorConsole: OperatorConsole
  watchtower: Watchtower
  executiveBrief: ExecutiveBrief
  realityLens: RealityLens
  semanticMotifs: SemanticMotif[]
  packet: ChangeOrderPacket
  techPillars: TechPillar[]
  loopCards: LoopCard[]
  pricing: PricingCard
  runtime: RuntimeInfo
}

export interface AnalyzeRequest {
  workspaceName: string
  artifacts: ArtifactInput[]
}

export interface LoopFixture {
  name: string
  workspaceName: string
  artifacts: ArtifactInput[]
  expectedCategories: RiskCategory[]
  minimumRecoveredRevenue: number
}

export const ARTIFACT_KIND_LABELS: Record<ArtifactKind, string> = {
  contract: 'Contract',
  meeting_note: 'Meeting note',
  client_message: 'Client message',
  task_export: 'Task export',
  invoice: 'Invoice',
  delivery_note: 'Delivery note',
  other: 'Other artifact',
}

export const RISK_CATEGORY_LABELS: Record<RiskCategory, string> = {
  portal_access: 'Portal access',
  ai_assistant: 'AI assistant',
  data_sync: 'Data sync',
  revision_overrun: 'Revision overrun',
  analytics_expansion: 'Analytics expansion',
  new_deliverable: 'New deliverable',
  maintenance_tail: 'Maintenance tail',
}

export const SEVERITY_LABELS: Record<FindingSeverity, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
}

export const SIGNAL_STAGE_LABELS: Record<SignalStage, string> = {
  whisper: 'Whisper',
  asked: 'Asked',
  committed: 'Committed',
  shipped: 'Shipped',
  unbilled: 'Unbilled',
}

export const OFFER_TYPE_LABELS: Record<OfferType, string> = {
  change_order: 'Change order',
  phase_two: 'Phase two',
  pilot: 'Pilot',
  retainer: 'Retainer',
  expansion_bundle: 'Expansion bundle',
}

export const SCENARIO_POSTURE_LABELS: Record<ScenarioPosture, string> = {
  recover_now: 'Recover now',
  bundle_then_close: 'Bundle and close',
  pilot_then_expand: 'Pilot then expand',
}

export const MOVE_TIMING_LABELS: Record<MoveTiming, string> = {
  today: 'Today',
  '48h': '48h',
  this_week: 'This week',
}

export const WATCHTOWER_STATE_LABELS: Record<WatchtowerState, string> = {
  first_run: 'Primed',
  warming: 'Warming',
  tracking: 'Tracking',
}

export function formatCurrency(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(amount)
}

export function formatPercent(value: number): string {
  return `${Math.round(value * 100)}%`
}
