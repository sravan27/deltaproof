import {
  useDeferredValue,
  useEffect,
  useEffectEvent,
  useMemo,
  useState,
  startTransition,
  type FormEvent,
  type ReactNode,
} from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  Activity,
  ArrowRight,
  BadgeDollarSign,
  BrainCircuit,
  CalendarClock,
  CheckCircle2,
  FileStack,
  Search,
  Sparkles,
  TrendingUp,
  Upload,
  Waypoints,
} from 'lucide-react'
import './App.css'
import { buildDemoDashboard } from '../shared/engine'
import {
  ARTIFACT_KIND_LABELS,
  MOVE_TIMING_LABELS,
  OFFER_TYPE_LABELS,
  RISK_CATEGORY_LABELS,
  SCENARIO_POSTURE_LABELS,
  SEVERITY_LABELS,
  SIGNAL_STAGE_LABELS,
  WATCHTOWER_STATE_LABELS,
  formatCurrency,
  formatPercent,
  type ArtifactInput,
  type BuyerIntentRequest,
  type CommercialScenario,
  type DashboardPayload,
  type EvidenceItem,
  type ExecutionMove,
  type Finding,
  type MonetizationPath,
  type PortfolioBrief,
  type PortfolioPriority,
  type PressureTrack,
  type PushbackCard,
  type SemanticMotif,
  type SignalStage,
  type WatchChange,
  type WatchPulse,
  type WorkspaceSummary,
} from '../shared/contracts'
import { buildPortfolioBrief } from '../shared/portfolio'
import { toWorkspaceSlug } from '../shared/slug'
import {
  extractArtifactsFromFiles,
  requestAnalysis,
  requestPortfolioBrief,
  requestPortfolioBriefMarkdown,
  submitBuyerIntent,
  requestWorkspaceBriefMarkdown,
  requestWorkspaceCatalog,
  requestWorkspaceDashboard,
} from './lib/intake'

const initialDashboard = buildDemoDashboard()
const SIGNAL_STAGE_ORDER: SignalStage[] = ['whisper', 'asked', 'committed', 'shipped', 'unbilled']

function App() {
  const [dashboard, setDashboard] = useState<DashboardPayload>(initialDashboard)
  const [portfolioBrief, setPortfolioBrief] = useState<PortfolioBrief>(buildPortfolioBrief([initialDashboard]))
  const [workspaceCatalog, setWorkspaceCatalog] = useState<WorkspaceSummary[]>([])
  const [activeWorkspaceSlug, setActiveWorkspaceSlug] = useState(toWorkspaceSlug(initialDashboard.workspaceName))
  const [analysisWorkspaceName, setAnalysisWorkspaceName] = useState(initialDashboard.workspaceName)
  const [queuedArtifacts, setQueuedArtifacts] = useState<ArtifactInput[]>([])
  const [selectedFindingId, setSelectedFindingId] = useState<string>(initialDashboard.findings[0]?.id ?? '')
  const [query, setQuery] = useState('')
  const [dragActive, setDragActive] = useState(false)
  const [briefStatus, setBriefStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const [portfolioBriefStatus, setPortfolioBriefStatus] = useState<'idle' | 'copying' | 'copied' | 'error'>('idle')
  const [buyerIntent, setBuyerIntent] = useState({
    name: '',
    email: '',
    company: '',
    notes: '',
  })
  const [buyerIntentStatus, setBuyerIntentStatus] = useState<'idle' | 'submitting' | 'submitted' | 'error'>('idle')
  const [buyerIntentMessage, setBuyerIntentMessage] = useState('')
  const [status, setStatus] = useState<'loading' | 'ready' | 'analyzing'>('loading')
  const [error, setError] = useState<string | null>(null)
  const deferredQuery = useDeferredValue(query)

  async function refreshCatalog(preferredSlug?: string) {
    try {
      const catalog = await requestWorkspaceCatalog()
      startTransition(() => {
        setWorkspaceCatalog(catalog)
        if (preferredSlug && catalog.some((workspace) => workspace.slug === preferredSlug)) {
          setActiveWorkspaceSlug(preferredSlug)
        }
      })
    } catch {
      startTransition(() => {
        setWorkspaceCatalog([])
      })
    }
  }

  async function loadWorkspace(slug: string) {
    setStatus('loading')
    setError(null)

    try {
      const payload = await requestWorkspaceDashboard(slug)
      startTransition(() => {
        setDashboard(payload)
        setActiveWorkspaceSlug(slug)
        setAnalysisWorkspaceName(payload.workspaceName)
        setSelectedFindingId(payload.findings[0]?.id ?? '')
        setStatus('ready')
      })
      void hydratePortfolioBrief(payload)
    } catch {
      setStatus('ready')
      setError('DeltaProof could not load that workspace.')
    }
  }

  async function copyExecutiveBrief() {
    setBriefStatus('copying')

    try {
      const markdown = await requestWorkspaceBriefMarkdown(activeWorkspaceSlug)
      await navigator.clipboard.writeText(markdown)
      setBriefStatus('copied')
      window.setTimeout(() => setBriefStatus('idle'), 1800)
    } catch {
      setBriefStatus('error')
      window.setTimeout(() => setBriefStatus('idle'), 1800)
    }
  }

  async function hydratePortfolioBrief(fallback: DashboardPayload) {
    try {
      const brief = await requestPortfolioBrief()
      startTransition(() => {
        setPortfolioBrief(brief)
      })
    } catch {
      startTransition(() => {
        setPortfolioBrief(buildPortfolioBrief([fallback]))
      })
    }
  }

  async function copyPortfolioCommandBrief() {
    setPortfolioBriefStatus('copying')

    try {
      const markdown = await requestPortfolioBriefMarkdown()
      await navigator.clipboard.writeText(markdown)
      setPortfolioBriefStatus('copied')
      window.setTimeout(() => setPortfolioBriefStatus('idle'), 1800)
    } catch {
      setPortfolioBriefStatus('error')
      window.setTimeout(() => setPortfolioBriefStatus('idle'), 1800)
    }
  }

  async function handleBuyerIntentSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()

    if (!buyerIntent.name.trim() || !buyerIntent.email.trim() || !buyerIntent.company.trim()) {
      setBuyerIntentStatus('error')
      setBuyerIntentMessage('Name, work email, and company are required.')
      return
    }

    setBuyerIntentStatus('submitting')
    setBuyerIntentMessage('')

    try {
      const payload: BuyerIntentRequest = {
        name: buyerIntent.name.trim(),
        email: buyerIntent.email.trim(),
        company: buyerIntent.company.trim(),
        notes: buyerIntent.notes.trim() || undefined,
        workspaceName: dashboard.workspaceName,
        workspaceSlug: activeWorkspaceSlug,
        plan: dashboard.pricing.plan,
        moneyAtRiskTotal: dashboard.overview.moneyAtRiskTotal,
        shadowPipelineValue: dashboard.overview.shadowPipelineValue,
        decisionWindowDays: dashboard.decisionWindow.days,
        source: 'pricing_panel',
      }
      const receipt = await submitBuyerIntent(payload)
      const checkoutUrl = buildPolarCheckoutUrl(dashboard.pricing.checkoutUrl, payload, receipt.leadId)

      setBuyerIntentStatus('submitted')
      setBuyerIntentMessage(
        checkoutUrl
          ? 'Buyer intent captured. Opening checkout with your details prefilled.'
          : 'Buyer intent captured. DeltaProof stored your recovery request.',
      )

      if (checkoutUrl) {
        window.open(checkoutUrl, '_blank', 'noopener,noreferrer')
      }
    } catch {
      setBuyerIntentStatus('error')
      setBuyerIntentMessage('DeltaProof could not secure the recovery request just yet.')
    }
  }

  const refreshDemo = useEffectEvent(async () => {
    try {
      const [payload, catalog, portfolio] = await Promise.all([
        fetch('/api/demo').then(async (response) => {
          if (!response.ok) {
            throw new Error('Demo unavailable')
          }
          return (await response.json()) as DashboardPayload
        }),
        requestWorkspaceCatalog().catch(() => [] as WorkspaceSummary[]),
        requestPortfolioBrief().catch(() => buildPortfolioBrief([initialDashboard])),
      ])
      startTransition(() => {
        setDashboard(payload)
        setPortfolioBrief(portfolio)
        setWorkspaceCatalog(catalog)
        setActiveWorkspaceSlug(toWorkspaceSlug(payload.workspaceName))
        setAnalysisWorkspaceName(payload.workspaceName)
        setSelectedFindingId(payload.findings[0]?.id ?? '')
        setStatus('ready')
      })
    } catch {
      startTransition(() => {
        setDashboard(initialDashboard)
        setPortfolioBrief(buildPortfolioBrief([initialDashboard]))
        setWorkspaceCatalog([])
        setActiveWorkspaceSlug(toWorkspaceSlug(initialDashboard.workspaceName))
        setAnalysisWorkspaceName(initialDashboard.workspaceName)
        setSelectedFindingId(initialDashboard.findings[0]?.id ?? '')
        setStatus('ready')
      })
    }
  })

  useEffect(() => {
    void refreshDemo()
  }, [])

  const selectedFinding =
    dashboard.findings.find((finding) => finding.id === selectedFindingId) ?? dashboard.findings[0]
  const topOpportunity = dashboard.monetizationPaths[0]
  const recommendedScenario =
    dashboard.operatorConsole.scenarios.find(
      (scenario) => scenario.id === dashboard.operatorConsole.recommendedScenarioId,
    ) ?? dashboard.operatorConsole.scenarios[0]
  const watchtowerLead = dashboard.watchtower.changes[0]
  const recommendedMoves = dashboard.operatorConsole.moves.filter((move) =>
    recommendedScenario?.moveIds.includes(move.id),
  )
  const shortestDecisionWindow = portfolioBrief.priorities[0]?.decisionWindowDays ?? dashboard.decisionWindow.days

  const filteredEvidence = useMemo(() => {
    const normalizedQuery = deferredQuery.trim().toLowerCase()

    if (!normalizedQuery) {
      return dashboard.evidence
    }

    return dashboard.evidence.filter((item) => {
      const finding = dashboard.findings.find((candidate) => candidate.proofIds.includes(item.id))
      const haystack = `${item.excerpt} ${item.title} ${finding?.title ?? ''}`.toLowerCase()
      return haystack.includes(normalizedQuery)
    })
  }, [dashboard.evidence, dashboard.findings, deferredQuery])

  async function handleFiles(files: File[]) {
    setError(null)

    try {
      const extracted = await extractArtifactsFromFiles(files)
      startTransition(() => {
        setQueuedArtifacts((current) => dedupeArtifacts([...current, ...extracted]))
      })
    } catch {
      setError('One or more files could not be parsed. Try PDF, TXT, MD, CSV, or JSON.')
    }
  }

  async function runAnalysis() {
    if (!queuedArtifacts.length) {
      return
    }

    setError(null)
    setStatus('analyzing')

    try {
      const next = await requestAnalysis({
        workspaceName: analysisWorkspaceName.trim() || 'Uploaded workspace',
        artifacts: queuedArtifacts,
      })

      startTransition(() => {
        setDashboard(next)
        setActiveWorkspaceSlug(toWorkspaceSlug(next.workspaceName))
        setAnalysisWorkspaceName(next.workspaceName)
        setSelectedFindingId(next.findings[0]?.id ?? '')
        setQueuedArtifacts([])
        setStatus('ready')
      })
      void refreshCatalog(toWorkspaceSlug(next.workspaceName))
      void hydratePortfolioBrief(next)
    } catch {
      setError('DeltaProof could not turn these artifacts into a commercial packet yet.')
      setStatus('ready')
    }
  }

  return (
    <div className='app-shell'>
      <div className='ambient ambient-one' />
      <div className='ambient ambient-two' />

      <header className='topbar'>
        <div className='brand-lockup'>
          <div className='brand-mark'>D</div>
          <div>
            <p className='eyebrow'>DeltaProof</p>
            <h1>Revenue assurance for fixed-fee teams</h1>
          </div>
        </div>

        <nav className='nav-links'>
          <a href='#portfolio'>Portfolio</a>
          <a href='#brief'>Brief</a>
          <a href='#watchtower'>Watchtower</a>
          <a href='#shadow'>Shadow pipeline</a>
          <a href='#operator'>Operator</a>
          <a href='#product'>Product</a>
          <a href='#evidence'>Evidence</a>
          <a href='#loop'>Loop</a>
          <a href='#pricing'>Pricing</a>
        </nav>
      </header>

      <main className='page'>
        <section className='hero panel'>
          <div className='hero-copy'>
            <p className='eyebrow'>Local Gemma. Cloudflare edge. SQLite truth.</p>
            <h2>The best upsell signal is usually already happening off-book.</h2>
            <p className='lede'>{dashboard.thesis}</p>

            <div className='hero-actions'>
              <button
                className='primary-button'
                onClick={() => document.getElementById('shadow')?.scrollIntoView({ behavior: 'smooth' })}
              >
                Open the shadow pipeline
                <ArrowRight size={16} />
              </button>
              <div className='runtime-chip'>
                <BrainCircuit size={16} />
                {dashboard.runtime.strategy === 'ollama' ? 'Local Gemma engaged' : 'Heuristic engine live'}
              </div>
            </div>
          </div>

          <div className='hero-metrics'>
            <MetricCard
              icon={<BadgeDollarSign size={20} />}
              label='Money at risk'
              value={formatCurrency(dashboard.overview.moneyAtRiskTotal)}
              detail='Recoverable from current evidence'
            />
            <MetricCard
              icon={<TrendingUp size={20} />}
              label='Shadow pipeline'
              value={formatCurrency(dashboard.overview.shadowPipelineValue)}
              detail='Expected value of the sellable expansion paths'
            />
            <MetricCard
              icon={<Waypoints size={20} />}
              label='Warning lead'
              value={`${dashboard.overview.averageLeadDays} days`}
              detail='Average time between first signal and hard execution'
            />
            <MetricCard
              icon={<Activity size={20} />}
              label='Cost of waiting'
              value={formatCurrency(dashboard.operatorConsole.costOfWaiting)}
              detail='Leverage that hardens if this sits for one more week'
            />
            <MetricCard
              icon={<CalendarClock size={20} />}
              label='Decision window'
              value={`${dashboard.decisionWindow.days} days`}
              detail={dashboard.decisionWindow.consequence}
            />
          </div>
        </section>

        <section className='stats-grid'>
          <InfoPanel
            title='What changes here'
            body='DeltaProof no longer stops at “you missed revenue.” It turns weak signals into ranked offers the team can sell before drift becomes entitlement.'
          />
          <InfoPanel
            title='Why this feels new'
            body='The product models the progression from whisper to unbilled work, then converts that progression into a shadow pipeline with expected value and close probability.'
          />
          <InfoPanel
            title='Why someone buys fast'
            body='It gives leaders three things existing tools do not combine: early warning, deal packaging, and evidence-backed pricing in one workflow.'
          />
        </section>

        <section className='workspace-grid'>
          <div className='panel workspace-overview-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Workspace network</p>
                <h3>Run DeltaProof like a control room, not a one-off audit</h3>
              </div>
              <span className='panel-kicker'>
                {workspaceCatalog.length ? `${workspaceCatalog.length} active workspaces` : 'Catalog warming'}
              </span>
            </div>

            <div className='workspace-overview-copy'>
              <div>
                <span className='offer-pill'>Active workspace</span>
                <h4>{dashboard.workspaceName}</h4>
                <p>
                  The command center keeps multiple service lines visible at once, so the strongest revenue move
                  doesn’t disappear the moment a different client gets noisy.
                </p>
              </div>

              <div className='workspace-overview-metrics'>
                <OperatorMetric
                  label='Active momentum'
                  value={`${dashboard.watchtower.momentumScore}/99`}
                  detail='Current workspace movement'
                />
                <OperatorMetric
                  label='Network pipeline'
                  value={formatCurrency(
                    workspaceCatalog.reduce((sum, workspace) => sum + workspace.shadowPipelineValue, 0),
                  )}
                  detail='Across the visible workspace stack'
                />
                <OperatorMetric
                  label='Network risk'
                  value={`${workspaceCatalog.reduce((sum, workspace) => sum + workspace.riskCount, 0)}`}
                  detail='Total monetizable deltas visible now'
                />
              </div>
            </div>
          </div>

          <div className='panel workspace-list-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Workspace catalog</p>
                <h3>Switch across revenue surfaces instantly</h3>
              </div>
              <span className='panel-kicker'>{activeWorkspaceSlug}</span>
            </div>

            <div className='workspace-list'>
              {workspaceCatalog.map((workspace) => (
                <WorkspaceCard
                  key={workspace.slug}
                  workspace={workspace}
                  active={workspace.slug === activeWorkspaceSlug}
                  onOpen={() => void loadWorkspace(workspace.slug)}
                />
              ))}
            </div>
          </div>
        </section>

        <section id='portfolio' className='portfolio-grid'>
          <div className='panel portfolio-overview-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Portfolio Command Brief</p>
                <h3>The weekly operating memo leaders actually need</h3>
              </div>
              <div className='brief-actions'>
                <button className='secondary-button' onClick={() => void copyPortfolioCommandBrief()}>
                  {portfolioBriefStatus === 'copied'
                    ? 'Copied command brief'
                    : portfolioBriefStatus === 'error'
                      ? 'Copy failed'
                      : 'Copy markdown'}
                  <CheckCircle2 size={16} />
                </button>
                <a className='primary-button as-link' href='/api/portfolio/brief.md' target='_blank' rel='noreferrer'>
                  Open markdown
                  <ArrowRight size={16} />
                </a>
              </div>
            </div>

            <div className='portfolio-hero'>
              <div className='portfolio-copy'>
                <span className='offer-pill'>Founder command layer</span>
                <h4>{portfolioBrief.headline}</h4>
                <p>{portfolioBrief.summary}</p>
                <div className='brief-callout'>{portfolioBrief.portfolioCallout}</div>
              </div>

              <div className='portfolio-metrics'>
                <OperatorMetric
                  label='Urgent workspaces'
                  value={`${portfolioBrief.urgentWorkspaceCount}/${portfolioBrief.workspacesTracked}`}
                  detail='Need action inside seven days'
                />
                <OperatorMetric
                  label='Shortest window'
                  value={`${shortestDecisionWindow} days`}
                  detail='Tightest remaining pricing leverage in the book'
                />
              </div>
            </div>

            <div className='portfolio-columns'>
              <div className='brief-block'>
                <strong>Must do this week</strong>
                <ul>
                  {portfolioBrief.mustDoThisWeek.map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>

              <div className='brief-block'>
                <strong>Blind spots</strong>
                <ul>
                  {(portfolioBrief.blindSpots.length
                    ? portfolioBrief.blindSpots
                    : ['The evidence base is strong. The risk now is execution drift, not missing proof.']
                  ).map((item) => (
                    <li key={item}>{item}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>

          <div className='panel portfolio-priority-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Priority Queue</p>
                <h3>Which client conversation cannot wait</h3>
              </div>
              <span className='panel-kicker'>{portfolioBrief.priorities.length} ranked moves</span>
            </div>

            <div className='portfolio-priority-list'>
              {portfolioBrief.priorities.map((priority) => (
                <PortfolioPriorityCard
                  key={priority.slug}
                  priority={priority}
                  active={priority.slug === activeWorkspaceSlug}
                  onOpen={() => void loadWorkspace(priority.slug)}
                />
              ))}
            </div>
          </div>
        </section>

        <section id='brief' className='panel brief-panel'>
          <div className='panel-header'>
            <div>
              <p className='eyebrow'>Decision Brief</p>
              <h3>Output that survives outside the product</h3>
            </div>
            <div className='brief-actions'>
              <button className='secondary-button' onClick={() => void copyExecutiveBrief()}>
                {briefStatus === 'copied' ? 'Copied brief' : briefStatus === 'error' ? 'Copy failed' : 'Copy markdown'}
                <CheckCircle2 size={16} />
              </button>
              <a className='primary-button as-link' href={`/api/workspaces/${activeWorkspaceSlug}/brief.md`} target='_blank' rel='noreferrer'>
                Open markdown
                <ArrowRight size={16} />
              </a>
            </div>
          </div>

          <div className='brief-grid'>
            <div className='brief-summary'>
              <span className='offer-pill'>Executive artifact</span>
              <h4>{dashboard.executiveBrief.headline}</h4>
              <p>{dashboard.executiveBrief.decision}</p>

              <div className='brief-callout'>{dashboard.executiveBrief.financialCallout}</div>

              <div className='brief-narratives'>
                <div className='brief-block'>
                  <strong>Why now</strong>
                  <p>{dashboard.executiveBrief.whyNow}</p>
                </div>
                <div className='brief-block'>
                  <strong>Decision window</strong>
                  <p>{dashboard.executiveBrief.decisionWindowLabel}</p>
                </div>
                <div className='brief-block'>
                  <strong>Internal narrative</strong>
                  <p>{dashboard.executiveBrief.internalNarrative}</p>
                </div>
                <div className='brief-block'>
                  <strong>Client-safe narrative</strong>
                  <p>{dashboard.executiveBrief.clientNarrative}</p>
                </div>
              </div>
            </div>

            <div className='brief-stack'>
              <div className='brief-block'>
                <strong>Proof stack</strong>
                <ul>
                  {dashboard.executiveBrief.proofBullets.map((bullet) => (
                    <li key={bullet}>{bullet}</li>
                  ))}
                </ul>
              </div>

              <div className='brief-block'>
                <strong>Operator moves</strong>
                <ul>
                  {dashboard.executiveBrief.operatorMoves.map((move) => (
                    <li key={move}>{move}</li>
                  ))}
                </ul>
              </div>

              <div className='brief-block'>
                <strong>Board questions</strong>
                <ul>
                  {dashboard.executiveBrief.boardQuestions.map((question) => (
                    <li key={question}>{question}</li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </section>

        <section id='watchtower' className='watchtower-grid'>
          <div className='panel watchtower-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Watchtower</p>
                <h3>Continuous commercial memory for every workspace</h3>
              </div>
              <span className='panel-kicker'>
                {WATCHTOWER_STATE_LABELS[dashboard.watchtower.state]} · {dashboard.watchtower.momentumScore}/99
              </span>
            </div>

            <div className='watchtower-hero'>
              <div className='watchtower-copy'>
                <span className='offer-pill'>{WATCHTOWER_STATE_LABELS[dashboard.watchtower.state]}</span>
                <h4>{watchtowerLead?.title ?? 'Movement log ready'}</h4>
                <p>{dashboard.watchtower.narrative}</p>
              </div>

              <div className='watchtower-meta'>
                <OperatorMetric
                  label='Momentum'
                  value={`${dashboard.watchtower.momentumScore}/99`}
                  detail='How fast the commercial picture is moving'
                />
                <OperatorMetric
                  label='Cadence'
                  value={dashboard.watchtower.cadence}
                  detail='How DeltaProof wants to be run'
                />
              </div>
            </div>

            <div className='watch-change-grid'>
              {dashboard.watchtower.changes.map((change) => (
                <WatchChangeCard key={change.id} change={change} />
              ))}
            </div>
          </div>

          <div className='panel pulse-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Pulse timeline</p>
                <h3>How the workspace is moving over time</h3>
              </div>
              <span className='panel-kicker'>{dashboard.watchtower.pulses.length} stored pulses</span>
            </div>

            <div className='pulse-list'>
              {dashboard.watchtower.pulses.map((pulse) => (
                <WatchPulseCard key={`${pulse.createdAt}-${pulse.label}`} pulse={pulse} />
              ))}
            </div>
          </div>
        </section>

        <section id='shadow' className='intelligence-grid'>
          <div className='panel reality-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Counterfactual twin</p>
                <h3>What was sold vs what is now believed vs what is already real</h3>
              </div>
              <span className='panel-kicker'>The commercial gap in one glance</span>
            </div>

            <div className='reality-grid'>
              <RealityColumn title='Signed truth' items={dashboard.realityLens.signedTruth} />
              <RealityColumn title='Client belief' items={dashboard.realityLens.clientBelief} />
              <RealityColumn title='Delivery reality' items={dashboard.realityLens.deliveryReality} />
            </div>

            <div className='narrative-card'>
              <Waypoints size={18} />
              <p>{dashboard.realityLens.narrative}</p>
            </div>
          </div>

          <div className='panel pressure-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Pressure tracks</p>
                <h3>Every ask has a pressure curve</h3>
              </div>
              <span className='panel-kicker'>From weak signal to unpaid work</span>
            </div>

            <div className='pressure-list'>
              {dashboard.pressureTracks.map((track) => (
                <PressureTrackCard key={track.category} track={track} />
              ))}
            </div>
          </div>

          <div className='panel opportunity-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Shadow pipeline</p>
                <h3>Most likely expansion paths</h3>
              </div>
              <span className='panel-kicker'>
                {topOpportunity ? `${formatCurrency(topOpportunity.expectedValue)} top expected value` : 'No paths yet'}
              </span>
            </div>

            <div className='opportunity-list'>
              {dashboard.monetizationPaths.map((path) => (
                <OpportunityCard key={path.id} path={path} />
              ))}
            </div>
          </div>
        </section>

        <section id='operator' className='operator-grid'>
          <div className='panel operator-overview-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Operator console</p>
                <h3>The best move is not always the biggest invoice</h3>
              </div>
              <span className='panel-kicker'>
                {recommendedScenario ? `${recommendedScenario.winScore}/99 win score` : 'Commercial posture loading'}
              </span>
            </div>

            {recommendedScenario ? (
              <div className='operator-hero'>
                <div className='operator-copy'>
                  <span className='offer-pill'>{SCENARIO_POSTURE_LABELS[recommendedScenario.posture]}</span>
                  <h4>{recommendedScenario.title}</h4>
                  <p>{dashboard.operatorConsole.thesis}</p>
                </div>

                <div className='operator-metric-grid'>
                  <OperatorMetric
                    label='Recover now'
                    value={formatCurrency(recommendedScenario.revenueNow)}
                    detail='Revenue tied to the chosen posture'
                  />
                  <OperatorMetric
                    label='Later pipeline'
                    value={formatCurrency(recommendedScenario.pipelineLater)}
                    detail='Value preserved for the next move'
                  />
                  <OperatorMetric
                    label='Trust preservation'
                    value={`${recommendedScenario.trustPreservation}/99`}
                    detail='How relationship-safe this posture is'
                  />
                  <OperatorMetric
                    label='Execution drag'
                    value={`${recommendedScenario.executionDifficulty}/99`}
                    detail='Internal friction and complexity'
                  />
                </div>
              </div>
            ) : null}

            <div className='operator-gaps'>
              <div className='operator-subhead'>
                <strong>Evidence gaps to close</strong>
                <span>Lower risk before the ask</span>
              </div>

              {dashboard.operatorConsole.evidenceGaps.length ? (
                <div className='gap-list'>
                  {dashboard.operatorConsole.evidenceGaps.map((gap) => (
                    <div key={gap} className='gap-card'>
                      {gap}
                    </div>
                  ))}
                </div>
              ) : (
                <div className='gap-card'>
                  The evidence base is already strong enough to move now. The job is sequencing, not proof hunting.
                </div>
              )}
            </div>
          </div>

          <div className='panel scenario-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Scenario stack</p>
                <h3>Three ways to monetize without losing the room</h3>
              </div>
              <span className='panel-kicker'>{dashboard.operatorConsole.scenarios.length} ranked postures</span>
            </div>

            <div className='scenario-list'>
              {dashboard.operatorConsole.scenarios.map((scenario) => (
                <ScenarioCard
                  key={scenario.id}
                  scenario={scenario}
                  active={scenario.id === dashboard.operatorConsole.recommendedScenarioId}
                />
              ))}
            </div>
          </div>

          <div className='panel moves-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Next moves</p>
                <h3>What to do in order</h3>
              </div>
              <span className='panel-kicker'>{recommendedMoves.length} move sequence</span>
            </div>

            <div className='move-list'>
              {recommendedMoves.map((move) => (
                <MoveCard key={move.id} move={move} />
              ))}
            </div>
          </div>

          <div className='panel pushback-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Pushback map</p>
                <h3>Say the hard thing without sounding defensive</h3>
              </div>
              <span className='panel-kicker'>{dashboard.operatorConsole.pushbackCards.length} likely objections</span>
            </div>

            <div className='pushback-list'>
              {dashboard.operatorConsole.pushbackCards.map((card) => (
                <PushbackCardView key={card.objection} card={card} />
              ))}
            </div>
          </div>
        </section>

        <section className='panel motif-panel'>
          <div className='panel-header'>
            <div>
              <p className='eyebrow'>Latent motifs</p>
              <h3>What EmbeddingGemma can see before your heuristic categories do</h3>
            </div>
            <span className='panel-kicker'>{dashboard.semanticMotifs.length} discovered motif lanes</span>
          </div>

          <div className='motif-grid'>
            {dashboard.semanticMotifs.map((motif) => (
              <SemanticMotifCard key={motif.id} motif={motif} />
            ))}
          </div>
        </section>

        <section id='product' className='workbench'>
          <div className='panel intake-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Command deck</p>
                <h3>Drop contracts, notes, invoices, and exports</h3>
              </div>
              <span className='panel-kicker'>Client-side parsing for PDFs and text artifacts</span>
            </div>

            <label className='workspace-name-field'>
              <span>Workspace name</span>
              <input
                type='text'
                value={analysisWorkspaceName}
                placeholder='Northstar Studio'
                onChange={(event) => setAnalysisWorkspaceName(event.target.value)}
              />
            </label>

            <label
              className={`dropzone ${dragActive ? 'drag-active' : ''}`}
              onDragOver={(event) => {
                event.preventDefault()
                setDragActive(true)
              }}
              onDragLeave={() => setDragActive(false)}
              onDrop={(event) => {
                event.preventDefault()
                setDragActive(false)
                void handleFiles(Array.from(event.dataTransfer.files))
              }}
            >
              <input
                type='file'
                multiple
                accept='.pdf,.txt,.md,.csv,.json'
                onChange={(event) => {
                  const files = Array.from(event.target.files ?? [])
                  if (files.length) {
                    void handleFiles(files)
                  }
                }}
              />
              <Upload size={24} />
              <div>
                <strong>Upload work artifacts</strong>
                <p>
                  PDF, TXT, MD, CSV, or JSON. DeltaProof extracts the text locally, stages the signals, and turns them
                  into sellable commercial paths.
                </p>
              </div>
            </label>

            <div className='queue-list'>
              {queuedArtifacts.length ? (
                queuedArtifacts.map((artifact) => (
                  <div key={`${artifact.title}-${artifact.source}`} className='queue-item'>
                    <div>
                      <strong>{artifact.title}</strong>
                      <p>{artifact.source}</p>
                    </div>
                    <span>{Math.round(artifact.content.length / 4)} tokens</span>
                  </div>
                ))
              ) : (
                <div className='empty-state'>
                  <FileStack size={20} />
                  Demo data is already loaded below. Add your own artifacts to replace it with a live workspace.
                </div>
              )}
            </div>

            <div className='queue-actions'>
              <button
                className='primary-button'
                onClick={() => void runAnalysis()}
                disabled={!queuedArtifacts.length || status === 'analyzing'}
              >
                {status === 'analyzing' ? 'Running DeltaProof…' : 'Generate commercial packet'}
                <Sparkles size={16} />
              </button>
              <button
                className='secondary-button'
                onClick={() => {
                  setQueuedArtifacts([])
                  setError(null)
                }}
                disabled={!queuedArtifacts.length}
              >
                Clear queue
              </button>
            </div>

            {error ? <p className='error-copy'>{error}</p> : null}
          </div>

          <div className='panel findings-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Findings</p>
                <h3>{dashboard.workspaceName}</h3>
              </div>
              <span className='panel-kicker'>{dashboard.findings.length} monetizable deltas</span>
            </div>

            <div className='finding-stack'>
              {dashboard.findings.map((finding) => (
                <button
                  key={finding.id}
                  className={`finding-card ${finding.id === selectedFinding?.id ? 'active' : ''}`}
                  onClick={() => setSelectedFindingId(finding.id)}
                >
                  <div className='finding-topline'>
                    <span className={`severity-pill severity-${finding.severity}`}>
                      {SEVERITY_LABELS[finding.severity]}
                    </span>
                    <span>{formatPercent(finding.confidence)}</span>
                  </div>

                  <h4>{finding.title}</h4>
                  <p>{finding.summary}</p>

                  <div className='finding-footer'>
                    <span>{RISK_CATEGORY_LABELS[finding.category]}</span>
                    <strong>{formatCurrency(finding.moneyAtRisk)}</strong>
                  </div>
                </button>
              ))}
            </div>
          </div>

          <div className='panel packet-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Change-order packet</p>
                <h3>{dashboard.packet.title}</h3>
              </div>
              <span className='panel-kicker'>{dashboard.packet.lineItems.length} billable line items</span>
            </div>

            <AnimatePresence mode='wait'>
              <motion.div
                key={selectedFinding?.id}
                className='packet-content'
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {selectedFinding ? (
                  <>
                    <div className='highlight-card'>
                      <span className={`severity-pill severity-${selectedFinding.severity}`}>
                        {SEVERITY_LABELS[selectedFinding.severity]}
                      </span>
                      <h4>{selectedFinding.title}</h4>
                      <p>{selectedFinding.whyNow}</p>
                    </div>

                    <div className='summary-card'>
                      <p className='summary-amount'>{formatCurrency(selectedFinding.moneyAtRisk)}</p>
                      <p>{selectedFinding.recommendation}</p>
                    </div>
                  </>
                ) : null}

                <div className='line-item-list'>
                  {dashboard.packet.lineItems.map((item) => (
                    <div key={item.label} className='line-item'>
                      <div>
                        <strong>{item.label}</strong>
                        <p>{item.rationale}</p>
                      </div>
                      <span>{formatCurrency(item.amount)}</span>
                    </div>
                  ))}
                </div>

                <div className='email-card'>
                  <div className='email-header'>
                    <CheckCircle2 size={16} />
                    Ready-to-send draft
                  </div>
                  <pre>{dashboard.packet.emailDraft}</pre>
                </div>
              </motion.div>
            </AnimatePresence>
          </div>
        </section>

        <section id='evidence' className='panel evidence-panel'>
          <div className='panel-header'>
            <div>
              <p className='eyebrow'>Proof moments</p>
              <h3>Search every signal before you escalate</h3>
            </div>
            <label className='search-field'>
              <Search size={16} />
              <input
                type='search'
                value={query}
                placeholder='Search scope leaks, CRM syncs, revisions, portals…'
                onChange={(event) => setQuery(event.target.value)}
              />
            </label>
          </div>

          <div className='evidence-grid'>
            {filteredEvidence.map((item) => (
              <EvidenceCard
                key={item.id}
                item={item}
                finding={dashboard.findings.find((finding) => finding.proofIds.includes(item.id))}
                artifact={dashboard.artifacts.find((artifact) => artifact.id === item.artifactId)}
              />
            ))}
          </div>
        </section>

        <section id='loop' className='closing-grid'>
          <div className='panel loop-panel'>
            <div className='panel-header'>
              <div>
                <p className='eyebrow'>Karpathy loop</p>
                <h3>Every heuristic lives under replay pressure</h3>
              </div>
              <span className='panel-kicker'>Autoresearch for commercial accuracy</span>
            </div>

            <div className='loop-cards'>
              {dashboard.loopCards.map((card) => (
                <div key={card.title} className='loop-card'>
                  <strong>{card.title}</strong>
                  <p>{card.focus}</p>
                  <span>{card.metric}</span>
                </div>
              ))}
            </div>

            <div className='pillar-grid'>
              {dashboard.techPillars.map((pillar) => (
                <div key={pillar.label} className='pillar-card'>
                  <h4>{pillar.label}</h4>
                  <p>{pillar.detail}</p>
                </div>
              ))}
            </div>
          </div>

          <div id='pricing' className='panel pricing-panel'>
            <p className='eyebrow'>Monetization</p>
            <span className='offer-pill'>{dashboard.pricing.urgencyLabel}</span>
            <h3>{dashboard.pricing.plan}</h3>
            <p className='price'>{dashboard.pricing.price}</p>
            <p className='pricing-copy'>{dashboard.pricing.promise}</p>

            {topOpportunity ? (
              <div className='pricing-highlight'>
                <strong>{dashboard.pricing.paybackWindow}</strong>
                <p>{dashboard.pricing.projectedReturn}</p>
                <span>{topOpportunity.title} is still the highest-leverage first move</span>
              </div>
            ) : null}

            <div className='commercial-proof-grid'>
              <div className='baseline-card'>
                <h4>Best fit</h4>
                <p>{dashboard.pricing.buyerFit}</p>
              </div>
              <div className='baseline-card'>
                <h4>Why buy now</h4>
                <p>{dashboard.decisionWindow.consequence}</p>
              </div>
            </div>

            <div className='baseline-card'>
              <h4>Current signed baseline</h4>
              <ul>
                {dashboard.baseline.deliverables.map((item) => (
                  <li key={item}>{item}</li>
                ))}
              </ul>
            </div>

            <form className='buyer-intent-form' onSubmit={(event) => void handleBuyerIntentSubmit(event)}>
              <div className='buyer-intent-grid'>
                <label>
                  <span>Name</span>
                  <input
                    value={buyerIntent.name}
                    onChange={(event) => setBuyerIntent((current) => ({ ...current, name: event.target.value }))}
                    placeholder='Your name'
                    autoComplete='name'
                  />
                </label>
                <label>
                  <span>Work email</span>
                  <input
                    type='email'
                    value={buyerIntent.email}
                    onChange={(event) => setBuyerIntent((current) => ({ ...current, email: event.target.value }))}
                    placeholder='you@company.com'
                    autoComplete='email'
                  />
                </label>
                <label>
                  <span>Company</span>
                  <input
                    value={buyerIntent.company}
                    onChange={(event) => setBuyerIntent((current) => ({ ...current, company: event.target.value }))}
                    placeholder='Company name'
                    autoComplete='organization'
                  />
                </label>
              </div>

              <label>
                <span>What is hurting most?</span>
                <textarea
                  value={buyerIntent.notes}
                  onChange={(event) => setBuyerIntent((current) => ({ ...current, notes: event.target.value }))}
                  placeholder='Scope creep, support drift, revision overrun, or expansion work that keeps shipping unpaid.'
                  rows={3}
                />
              </label>

              <div className='buyer-intent-actions'>
                <button className='primary-button' type='submit' disabled={buyerIntentStatus === 'submitting'}>
                  {buyerIntentStatus === 'submitting' ? 'Securing slot' : dashboard.pricing.ctaLabel}
                  <ArrowRight size={16} />
                </button>

                {!dashboard.pricing.checkoutUrl ? (
                  <div className='checkout-note'>
                    Add `POLAR_CHECKOUT_URL`, `POLAR_CHECKOUT_URL_WATCHTOWER`, or `POLAR_CHECKOUT_URL_COMMAND` and the CTA will open a live checkout after the lead is captured.
                  </div>
                ) : null}
              </div>
            </form>

            {buyerIntentMessage ? <p className={`buyer-intent-message ${buyerIntentStatus}`}>{buyerIntentMessage}</p> : null}
          </div>
        </section>
      </main>
    </div>
  )
}

function MetricCard(props: {
  icon: ReactNode
  label: string
  value: string
  detail: string
}) {
  return (
    <div className='metric-card'>
      <div className='metric-icon'>{props.icon}</div>
      <div>
        <p>{props.label}</p>
        <strong>{props.value}</strong>
        <span>{props.detail}</span>
      </div>
    </div>
  )
}

function InfoPanel(props: { title: string; body: string }) {
  return (
    <div className='panel info-panel'>
      <h3>{props.title}</h3>
      <p>{props.body}</p>
    </div>
  )
}

function OperatorMetric(props: { label: string; value: string; detail: string }) {
  return (
    <div className='operator-metric'>
      <span>{props.label}</span>
      <strong>{props.value}</strong>
      <p>{props.detail}</p>
    </div>
  )
}

function WorkspaceCard(props: {
  workspace: WorkspaceSummary
  active: boolean
  onOpen: () => void
}) {
  return (
    <button className={`workspace-card ${props.active ? 'active' : ''}`} onClick={props.onOpen}>
      <div className='workspace-card-topline'>
        <span className='offer-pill'>{props.workspace.source === 'd1' ? 'Tracked' : 'Seeded'}</span>
        <span>{WATCHTOWER_STATE_LABELS[props.workspace.watchtowerState]}</span>
      </div>

      <h4>{props.workspace.name}</h4>
      <p>{props.workspace.topScenario}</p>
      <span className='workspace-window'>
        Decision window: {props.workspace.decisionWindowDays} day{props.workspace.decisionWindowDays === 1 ? '' : 's'}
      </span>

      <div className='workspace-card-metrics'>
        <div>
          <span>Risk</span>
          <strong>{formatCurrency(props.workspace.moneyAtRiskTotal)}</strong>
        </div>
        <div>
          <span>Pipeline</span>
          <strong>{formatCurrency(props.workspace.shadowPipelineValue)}</strong>
        </div>
        <div>
          <span>Momentum</span>
          <strong>{props.workspace.momentumScore}/99</strong>
        </div>
      </div>
    </button>
  )
}

function PortfolioPriorityCard(props: {
  priority: PortfolioPriority
  active: boolean
  onOpen: () => void
}) {
  return (
    <button className={`portfolio-priority-card ${props.active ? 'active' : ''}`} onClick={props.onOpen}>
      <div className='workspace-card-topline'>
        <span className='offer-pill'>
          {props.priority.decisionWindowDays <= 3
            ? 'Immediate'
            : props.priority.decisionWindowDays <= 7
              ? 'This week'
              : 'This cycle'}
        </span>
        <span>{props.priority.momentumScore}/99 momentum</span>
      </div>

      <h4>{props.priority.workspaceName}</h4>
      <p>{props.priority.headline}</p>

      <div className='portfolio-priority-metrics'>
        <div>
          <span>Window</span>
          <strong>{props.priority.decisionWindowDays} days</strong>
        </div>
        <div>
          <span>Risk</span>
          <strong>{formatCurrency(props.priority.moneyAtRiskTotal)}</strong>
        </div>
        <div>
          <span>Pipeline</span>
          <strong>{formatCurrency(props.priority.shadowPipelineValue)}</strong>
        </div>
      </div>

      <div className='portfolio-priority-copy'>
        <strong>{props.priority.nextMove}</strong>
        <p>{props.priority.whyThisWeek}</p>
      </div>
    </button>
  )
}

function WatchChangeCard(props: { change: WatchChange }) {
  return (
    <article className='watch-change-card'>
      <div className='watch-change-topline'>
        <span className={`severity-pill severity-${props.change.severity}`}>{SEVERITY_LABELS[props.change.severity]}</span>
        <span>{props.change.direction}</span>
      </div>

      <h4>{props.change.title}</h4>
      <p>{props.change.summary}</p>
    </article>
  )
}

function WatchPulseCard(props: { pulse: WatchPulse }) {
  return (
    <article className='pulse-card'>
      <div className='pulse-topline'>
        <span className='offer-pill'>{props.pulse.label}</span>
        <span>{props.pulse.exposureScore}/99 exposure</span>
      </div>

      <h4>{props.pulse.scenarioTitle}</h4>

      <div className='pulse-metrics'>
        <div>
          <span>Money at risk</span>
          <strong>{formatCurrency(props.pulse.moneyAtRiskTotal)}</strong>
        </div>
        <div>
          <span>Pipeline</span>
          <strong>{formatCurrency(props.pulse.shadowPipelineValue)}</strong>
        </div>
        <div>
          <span>Cost of waiting</span>
          <strong>{formatCurrency(props.pulse.costOfWaiting)}</strong>
        </div>
      </div>
    </article>
  )
}

function RealityColumn(props: { title: string; items: string[] }) {
  return (
    <div className='reality-column'>
      <h4>{props.title}</h4>
      <ul>
        {props.items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function PressureTrackCard(props: { track: PressureTrack }) {
  const currentStageIndex = SIGNAL_STAGE_ORDER.indexOf(props.track.currentStage)

  return (
    <article className='pressure-card'>
      <div className='pressure-header'>
        <div>
          <h4>{RISK_CATEGORY_LABELS[props.track.category]}</h4>
          <p>{props.track.narrative}</p>
        </div>
        <div className='pressure-meta'>
          <span className='heat-pill'>{props.track.heat}/99 heat</span>
          <strong>{formatCurrency(props.track.hiddenRevenue)}</strong>
        </div>
      </div>

      <div className='stage-rail'>
        {SIGNAL_STAGE_ORDER.map((stage, index) => {
          const moment = props.track.stageMoments.find((candidate) => candidate.stage === stage)
          const isActive = index <= currentStageIndex

          return (
            <div key={stage} className={`stage-node ${isActive ? 'active' : ''} ${moment ? 'hit' : ''}`}>
              <span>{SIGNAL_STAGE_LABELS[stage]}</span>
              <strong>{moment?.count ?? 0}</strong>
            </div>
          )
        })}
      </div>
    </article>
  )
}

function OpportunityCard(props: { path: MonetizationPath }) {
  return (
    <article className='opportunity-card'>
      <div className='opportunity-topline'>
        <span className='offer-pill'>{OFFER_TYPE_LABELS[props.path.type]}</span>
        <span className={`urgency-pill urgency-${props.path.urgency}`}>{props.path.urgency}</span>
      </div>

      <h4>{props.path.title}</h4>
      <p>{props.path.wedge}</p>

      <div className='opportunity-metrics'>
        <div>
          <span>Offer size</span>
          <strong>{formatCurrency(props.path.amount)}</strong>
        </div>
        <div>
          <span>Expected value</span>
          <strong>{formatCurrency(props.path.expectedValue)}</strong>
        </div>
        <div>
          <span>Close probability</span>
          <strong>{formatPercent(props.path.closeProbability)}</strong>
        </div>
      </div>

      <div className='opportunity-notes'>
        <p>{props.path.rationale}</p>
        <strong>{props.path.nextStep}</strong>
      </div>
    </article>
  )
}

function ScenarioCard(props: { scenario: CommercialScenario; active: boolean }) {
  return (
    <article className={`scenario-card ${props.active ? 'active' : ''}`}>
      <div className='scenario-topline'>
        <span className='offer-pill'>{SCENARIO_POSTURE_LABELS[props.scenario.posture]}</span>
        <span>{props.scenario.winScore}/99</span>
      </div>

      <h4>{props.scenario.title}</h4>
      <p>{props.scenario.thesis}</p>

      <div className='scenario-metrics'>
        <div>
          <span>Recover now</span>
          <strong>{formatCurrency(props.scenario.revenueNow)}</strong>
        </div>
        <div>
          <span>Trust</span>
          <strong>{props.scenario.trustPreservation}/99</strong>
        </div>
      </div>

      <strong>{props.scenario.downside}</strong>
    </article>
  )
}

function MoveCard(props: { move: ExecutionMove }) {
  return (
    <article className='move-card'>
      <div className='move-topline'>
        <span className='offer-pill'>{MOVE_TIMING_LABELS[props.move.timing]}</span>
        <span>{Math.round(props.move.confidence * 100)}% confidence</span>
      </div>

      <h4>{props.move.title}</h4>
      <p>{props.move.whyThisWins}</p>

      <div className='move-meta'>
        <div>
          <span>Owner</span>
          <strong>{props.move.owner.replaceAll('_', ' ')}</strong>
        </div>
        <div>
          <span>Channel</span>
          <strong>{props.move.channel}</strong>
        </div>
        <div>
          <span>Expected value</span>
          <strong>{formatCurrency(props.move.revenue)}</strong>
        </div>
        <div>
          <span>Relationship risk</span>
          <strong>{props.move.relationshipRisk}/99</strong>
        </div>
      </div>

      <div className='move-script'>{props.move.script}</div>
    </article>
  )
}

function SemanticMotifCard(props: { motif: SemanticMotif }) {
  return (
    <article className='motif-card'>
      <div className='motif-topline'>
        <span className='offer-pill'>{props.motif.source === 'embedding' ? 'Embedding motif' : 'Heuristic motif'}</span>
        <span>{props.motif.noveltyScore}/99 novelty</span>
      </div>

      <h4>{props.motif.title}</h4>
      <p>{props.motif.summary}</p>

      <div className='motif-tags'>
        {props.motif.categories.map((category) => (
          <span key={category} className='motif-tag'>
            {RISK_CATEGORY_LABELS[category]}
          </span>
        ))}
      </div>

      <div className='motif-samples'>
        {props.motif.sampleExcerpts.map((excerpt) => (
          <div key={excerpt} className='motif-sample'>
            {excerpt}
          </div>
        ))}
      </div>

      <strong>{props.motif.commercialAngle}</strong>
    </article>
  )
}

function PushbackCardView(props: { card: PushbackCard }) {
  return (
    <article className='pushback-card'>
      <strong>{props.card.objection}</strong>
      <p>{props.card.response}</p>
    </article>
  )
}

function EvidenceCard(props: {
  item: EvidenceItem
  finding: Finding | undefined
  artifact: DashboardPayload['artifacts'][number] | undefined
}) {
  return (
    <article className='evidence-card'>
      <div className='evidence-topline'>
        <span>{props.finding ? RISK_CATEGORY_LABELS[props.finding.category] : 'Signal'}</span>
        <span>{props.artifact ? ARTIFACT_KIND_LABELS[props.artifact.kind] : 'Artifact'}</span>
      </div>
      <h4>{props.item.title}</h4>
      <p>{props.item.excerpt}</p>
      <div className='evidence-footer'>
        <span>{props.artifact?.title ?? 'Unknown artifact'}</span>
        <strong>
          {SIGNAL_STAGE_LABELS[props.item.stage]} · {props.item.estimatedHours} hrs
        </strong>
      </div>
    </article>
  )
}

function buildPolarCheckoutUrl(
  baseUrl: string | undefined,
  payload: BuyerIntentRequest,
  leadId: string,
): string | null {
  if (!baseUrl) {
    return null
  }

  const checkoutUrl = new URL(baseUrl)
  checkoutUrl.searchParams.set('customer_email', payload.email)
  checkoutUrl.searchParams.set('customer_name', payload.name)
  checkoutUrl.searchParams.set('reference_id', leadId)
  checkoutUrl.searchParams.set('utm_source', 'deltaproof')
  checkoutUrl.searchParams.set('utm_medium', 'product')
  checkoutUrl.searchParams.set('utm_campaign', 'pricing-panel')
  checkoutUrl.searchParams.set('utm_content', payload.workspaceSlug)
  checkoutUrl.searchParams.set('utm_term', payload.plan)

  return checkoutUrl.toString()
}

function dedupeArtifacts(artifacts: ArtifactInput[]): ArtifactInput[] {
  const seen = new Set<string>()

  return artifacts.filter((artifact) => {
    const key = `${artifact.title}|${artifact.source}|${artifact.content.slice(0, 64)}`
    if (seen.has(key)) {
      return false
    }

    seen.add(key)
    return true
  })
}

export default App
