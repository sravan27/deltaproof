# DeltaProof

DeltaProof is a local-first revenue assurance product for agencies, consultancies, MSPs, and any fixed-fee delivery team that keeps losing margin between the signed scope and the final invoice.

Live deployment:
[https://deltaproof.sridharsravan.workers.dev](https://deltaproof.sridharsravan.workers.dev)

## What it does

- Ingests contracts, meeting notes, client messages, task exports, invoices, and delivery recaps
- Stages every scope signal from `whisper` to `unbilled` so early warning is visible before profit is gone
- Detects out-of-scope work, revision overruns, support-tail drift, and unbilled implementation creep
- Produces evidence-backed findings, money-at-risk estimates, semantic motifs, a shadow pipeline of sellable offers, an operator console, and a ready-to-send change-order packet
- Generates an executive decision brief in Markdown so the commercial truth can travel into Slack, docs, email, and board prep without losing its edge
- Generates a portfolio command brief that ranks every tracked workspace by decision window, so leaders know which client conversation cannot slip this week
- Stores a watchtower timeline that explains what changed since the last run instead of making the team rediscover the same revenue leak twice
- Exposes a multi-workspace command center so leaders can switch across live revenue surfaces instead of living inside one client at a time
- Supports local narrative refinement through Ollama with the latest Gemma 4 models
- Supports optional semantic clustering through EmbeddingGemma over Ollama's `/api/embed`
- Stores replayable dashboard snapshots in Cloudflare D1, backed by SQLite
- Runs recurring Cloudflare cron sweeps so saved workspaces can be re-evaluated automatically

## Why this product

Most products stop at one layer:

- contract review
- inbox triage
- generic AI note summaries
- invoicing

DeltaProof links all four. The upgraded thesis is stronger: if the promised work, believed work, shipped work, and billed work disagree, there is both recoverable revenue and an unclaimed expansion pipeline hiding in the gap.

The newest layer is what makes the product feel different: DeltaProof does not just spot revenue leakage. It ranks commercial postures such as recover-now, bundle-and-close, and pilot-then-expand; estimates the weekly cost of waiting; drafts the first move; and anticipates pushback before the team asks for money.

The latest layer pushes it further: DeltaProof now keeps commercial memory. It compares each workspace against its previous truth, highlights stage advances and new monetizable deltas, tracks the cost of waiting over time, and gives the operator a live pulse history instead of one isolated report.

The newest repo-level shift is structural: DeltaProof now behaves like a portfolio control room. The app can list seeded and stored workspaces, switch directly into the latest dashboard for each one, and keep a network-level view of pipeline, risk, and momentum.

The newest product-distribution layer is the decision brief. DeltaProof now turns each workspace into a board-ready markdown artifact with a decision, a why-now, a client-safe narrative, a proof stack, and operator moves. That matters because products become necessary when their output moves through organizations faster than meetings do.

The latest operating-system layer is the portfolio command brief. DeltaProof now estimates a decision window for every workspace, aggregates the whole book into one markdown memo, and ranks which recovery move should happen first. That is how the product stops being “nice to have analytics” and becomes part of the weekly operating cadence.

## Live demo state

On the seeded `Northstar Studio` workspace, the current engine produces:

- `$62,850` money at risk
- `$93,650` shadow pipeline value
- `$6,350` weekly cost of waiting
- `87/99` win score on the top operator posture
- A portfolio command brief showing `$95,850` exposed across the visible book and `2` workspaces inside a 7-day action window
- A watchtower pulse timeline with material-change cards and recurring sweep support
- A workspace catalog spanning `Northstar Studio`, `Meridian MSP`, and `Atlas RevOps Lab` with `1-day`, `14-day`, and `3-day` decision windows respectively

## Stack

- React 19 + Vite + Cloudflare Vite plugin
- Cloudflare Workers + Hono API
- Cloudflare D1 for persisted dashboard snapshots
- Cloudflare Cron Triggers for autonomous watchtower sweeps
- Local or cloud Ollama for premium commercial rewrites
- Optional EmbeddingGemma semantic motif discovery for latent expansion clustering
- Operator-console scenario ranking over monetization paths and pressure tracks
- History-aware watchtower diffing over stored workspace snapshots
- Workspace catalog APIs for loading the latest dashboard by slug
- Markdown brief routes for executive export by workspace
- Portfolio command brief APIs for book-level weekly operating review
- Decision-window estimation over the hottest live pressure track in each workspace
- Gemma 4 model path:
  - `gemma4:e4b` for efficient local execution
  - `gemma4:31b` for higher-end rewrite quality
- Embedding path:
  - `embeddinggemma` for semantic clustering and latent motif discovery
- A Karpathy-style eval loop in `scripts/karpathy-loop.ts`
- A research brief in [`RESEARCH.md`](/Users/sravansridhar/Documents/codex-experimentation/RESEARCH.md)

## Repo map

- [`src/App.tsx`](/Users/sravansridhar/Documents/codex-experimentation/src/App.tsx): workspace network, premium landing, watchtower timeline, counterfactual twin, operator console, shadow pipeline, and command deck UI
- [`src/lib/intake.ts`](/Users/sravansridhar/Documents/codex-experimentation/src/lib/intake.ts): client-side PDF/CSV/text extraction and analysis requests
- [`shared/engine.ts`](/Users/sravansridhar/Documents/codex-experimentation/shared/engine.ts): signal staging, scope-drift detection, semantic motifs, money-at-risk scoring, seed watchtower generation, operator sequencing, and monetization path generation
- [`shared/fixtures.ts`](/Users/sravansridhar/Documents/codex-experimentation/shared/fixtures.ts): seeded demo workspaces and eval fixtures
- [`worker/index.ts`](/Users/sravansridhar/Documents/codex-experimentation/worker/index.ts): API routes for demo, catalog, workspace hydration, analysis, and the autonomous scheduled sweep entrypoint
- [`shared/portfolio.ts`](/Users/sravansridhar/Documents/codex-experimentation/shared/portfolio.ts): portfolio command-brief generation and Markdown rendering across tracked workspaces
- [`worker/lib/catalog.ts`](/Users/sravansridhar/Documents/codex-experimentation/worker/lib/catalog.ts): workspace-summary catalog assembly across D1 and seeded fixtures
- [`shared/brief.ts`](/Users/sravansridhar/Documents/codex-experimentation/shared/brief.ts): executive brief generation and Markdown rendering
- [`worker/lib/ollama.ts`](/Users/sravansridhar/Documents/codex-experimentation/worker/lib/ollama.ts): local Gemma rewrite hook for findings, packet language, and operator moves
- [`worker/lib/semantic.ts`](/Users/sravansridhar/Documents/codex-experimentation/worker/lib/semantic.ts): EmbeddingGemma/Ollama motif enrichment
- [`worker/lib/watchtower.ts`](/Users/sravansridhar/Documents/codex-experimentation/worker/lib/watchtower.ts): history diffing, watchtower pulse generation, and duplicate-save protection
- [`migrations/0001_initial.sql`](/Users/sravansridhar/Documents/codex-experimentation/migrations/0001_initial.sql): D1 schema

## Local development

1. Install dependencies:

```bash
npm install
```

2. Copy local envs if you want Gemma rewrites or a live checkout link:

```bash
cp .dev.vars.example .dev.vars
```

3. Optional but recommended: pull Gemma 4 locally through Ollama:

```bash
ollama pull gemma4:e4b
ollama pull gemma4:31b
```

4. Start the app:

```bash
npm run dev
```

## Quality gates

```bash
npm test
npm run lint
npm run loop
npm run build
```

## Shipping

Cloudflare auth and D1 are already wired for this workspace. The main deploy command is:

```bash
npm run deploy
```

## Next commercial moves

- Set `POLAR_CHECKOUT_URL` for a live buy path
- Add authenticated multi-workspace storage on top of the existing snapshot schema
- Add outbound alert delivery so the watchtower can push the operator instead of waiting to be opened
- Push more artifacts into the eval loop so every new pricing pattern sharpens the engine instead of weakening it

## Why teams keep using it

The adoption wedge is not “use AI because it is cool.” It is:

- fixed-fee businesses need a weekly answer to which client is silently eating margin right now
- founders need a board-safe artifact they can forward without rewriting the commercial truth by hand
- account leads need a client-safe first move, not another dashboard they have to interpret

That is the whole DeltaProof bet: if the product becomes the fastest path from delivery ambiguity to a priced decision, teams will use it because they need the operating answer, not because they want another tool.
