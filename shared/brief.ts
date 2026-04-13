import type {
  ContractBaseline,
  DecisionWindow,
  ExecutiveBrief,
  Finding,
  MonetizationPath,
  OperatorConsole,
  Watchtower,
} from './contracts'
import { formatCurrency } from './contracts'

export function buildExecutiveBrief(params: {
  workspaceName: string
  baseline: ContractBaseline
  findings: Finding[]
  monetizationPaths: MonetizationPath[]
  operatorConsole: OperatorConsole
  watchtower: Watchtower
  decisionWindow: DecisionWindow
}): ExecutiveBrief {
  const recommendedScenario =
    params.operatorConsole.scenarios.find(
      (scenario) => scenario.id === params.operatorConsole.recommendedScenarioId,
    ) ?? params.operatorConsole.scenarios[0]
  const topPath = params.monetizationPaths[0]
  const topFinding = params.findings[0]
  const topMoves = params.operatorConsole.moves.slice(0, 3)

  const brief: ExecutiveBrief = {
    title: `${params.workspaceName} executive decision brief`,
    headline:
      topPath && recommendedScenario
        ? `${topPath.title} is the fastest path to converting drift into a deliberate commercial decision.`
        : `DeltaProof found monetizable movement inside ${params.workspaceName}.`,
    decision:
      recommendedScenario && topPath
        ? `Approve the ${recommendedScenario.title.toLowerCase()} posture and formalize ${topPath.title.toLowerCase()} before the client normalizes the extra work.`
        : `Review the top monetizable delta and decide whether to recover now or package it into the next phase.`,
    whyNow:
      topFinding
        ? `${topFinding.title} is already visible in the delivery trail, and the current cost of waiting is ${formatCurrency(params.operatorConsole.costOfWaiting)} per week.`
        : `The workspace is moving and DeltaProof is already seeing commercial slippage.`,
    decisionWindowLabel: `${params.decisionWindow.label} · ${params.decisionWindow.days} day${params.decisionWindow.days === 1 ? '' : 's'} to reset the commercial truth.`,
    internalNarrative:
      `${params.baseline.clientName} is behaving as though the relationship now includes work outside the signed ${params.baseline.projectName} scope. The operator posture should treat this as a leadership decision, not a project-management footnote.`,
    clientNarrative:
      topPath
        ? `We want to keep momentum, but the live workstream has moved beyond the original brief. The cleanest path is to package ${topPath.title.toLowerCase()} as its own decision so delivery quality stays high without burying the added scope in the base fee.`
        : `We want to keep momentum without hiding the commercial delta inside the original fee.`,
    financialCallout: [
      `${formatCurrency(params.findings.reduce((sum, finding) => sum + finding.moneyAtRisk, 0))} money at risk`,
      `${formatCurrency(params.monetizationPaths.reduce((sum, path) => sum + path.expectedValue, 0))} shadow pipeline`,
      `${formatCurrency(params.operatorConsole.costOfWaiting)} weekly cost of waiting`,
    ].join(' · '),
    proofBullets: params.findings
      .slice(0, 3)
      .map((finding) => `${finding.title}: ${formatCurrency(finding.moneyAtRisk)} at ${Math.round(finding.confidence * 100)}% confidence.`),
    operatorMoves: topMoves.map((move) => `${move.title}: ${move.script}`),
    boardQuestions: [
      'What work has already become emotionally committed, even if it is not commercially committed yet?',
      'Which approval path protects the relationship while still resetting the economic truth of the engagement?',
      'What happens to margin if this sits untouched for one more client cycle?',
    ],
    markdown: '',
  }

  return {
    ...brief,
    markdown: renderExecutiveBriefMarkdown(brief),
  }
}

export function renderExecutiveBriefMarkdown(brief: ExecutiveBrief): string {
  return [
    `# ${brief.title}`,
    '',
    `## Headline`,
    brief.headline,
    '',
    `## Decision`,
    brief.decision,
    '',
    `## Why Now`,
    brief.whyNow,
    '',
    `## Decision Window`,
    brief.decisionWindowLabel,
    '',
    `## Financial Callout`,
    brief.financialCallout,
    '',
    `## Internal Narrative`,
    brief.internalNarrative,
    '',
    `## Client-Safe Narrative`,
    brief.clientNarrative,
    '',
    `## Proof Stack`,
    ...brief.proofBullets.map((bullet) => `- ${bullet}`),
    '',
    `## Operator Moves`,
    ...brief.operatorMoves.map((move) => `- ${move}`),
    '',
    `## Board Questions`,
    ...brief.boardQuestions.map((question) => `- ${question}`),
    '',
  ].join('\n')
}
