import { buildDashboard } from '../shared/engine'
import { LOOP_FIXTURES } from '../shared/fixtures'
import { PROMPT_PACK } from '../shared/prompt-pack'
import { RISK_CATEGORY_LABELS, formatCurrency } from '../shared/contracts'

interface FixtureResult {
  name: string
  recoveredRevenue: number
  missingCategories: string[]
  pass: boolean
}

const results: FixtureResult[] = LOOP_FIXTURES.map((fixture) => {
  const dashboard = buildDashboard({
    workspaceName: fixture.workspaceName,
    artifacts: fixture.artifacts,
  })

  const foundCategories = new Set(dashboard.findings.map((finding) => finding.category))
  const missingCategories = fixture.expectedCategories
    .filter((category) => !foundCategories.has(category))
    .map((category) => RISK_CATEGORY_LABELS[category])
  const recoveredRevenue = dashboard.overview.moneyAtRiskTotal

  return {
    name: fixture.name,
    recoveredRevenue,
    missingCategories,
    pass: missingCategories.length === 0 && recoveredRevenue >= fixture.minimumRecoveredRevenue,
  }
})

const passed = results.filter((result) => result.pass).length
const failed = results.filter((result) => !result.pass)

console.log(`DeltaProof prompt pack: ${PROMPT_PACK.version}`)
console.log(`Fixtures passed: ${passed}/${results.length}`)

for (const result of results) {
  console.log(`\n[${result.pass ? 'PASS' : 'FAIL'}] ${result.name}`)
  console.log(`Recovered revenue: ${formatCurrency(result.recoveredRevenue)}`)
  if (result.missingCategories.length) {
    console.log(`Missing categories: ${result.missingCategories.join(', ')}`)
  }
}

if (failed.length) {
  process.exitCode = 1
}
