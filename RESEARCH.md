# Research Brief

This repo is trying to stay opinionated and current, not merely “AI-flavored.” These are the official sources that shaped the current product architecture.

## Verified model path

- Google AI for Developers Gemma releases:
  [https://ai.google.dev/gemma/docs/releases](https://ai.google.dev/gemma/docs/releases)
  Verified on April 10, 2026.
  Notes:
  - Gemma 4 released on March 31, 2026 in `E2B`, `E4B`, `31B`, and `26B A4B`.
  - FunctionGemma released on December 18, 2025.
  - EmbeddingGemma released on September 4, 2025.

## Verified runtime path

- Cloudflare Workers cron trigger configuration:
  [https://developers.cloudflare.com/workers/configuration/cron-triggers/](https://developers.cloudflare.com/workers/configuration/cron-triggers/)
  Verified on April 12, 2026.
  Notes:
  - Cloudflare officially supports scheduled Worker execution through cron triggers
  - Wrangler-managed config is the right source of truth for production schedules

- Cloudflare Workers best practices:
  [https://developers.cloudflare.com/workers/best-practices/workers-best-practices/](https://developers.cloudflare.com/workers/best-practices/workers-best-practices/)
  Verified on April 12, 2026.
  Notes:
  - Cloudflare recommends moving background work off the request path
  - structured logging and clear binding usage matter in production Worker code

- Cloudflare D1:
  [https://developers.cloudflare.com/d1/](https://developers.cloudflare.com/d1/)
  Verified on April 12, 2026.
  Notes:
  - D1 remains the simplest relational SQLite path for replayable workspace memory at the edge
  - it fits DeltaProof’s need for cheap, durable commercial-history storage

## Why this problem is urgent now

- Kantata / SPI Research 2025 Professional Services Maturity Benchmark:
  [https://get.kantata.com/rs/677-LEJ-696/images/2025-ps-maturity-benchmark.pdf](https://get.kantata.com/rs/677-LEJ-696/images/2025-ps-maturity-benchmark.pdf)
  Verified on April 10, 2026.
  Notes from the benchmark:
  - EBITDA margins fell to `9.8%`
  - on-time delivery dropped to `73.4%`
  - the report explicitly calls out margin erosion, revenue leakage, poor forecasting, and scope creep as profit killers
  - the optimization framing matters more than generic automation framing

This is exactly the hole DeltaProof is targeting. Agencies and consultancies do not only need better summaries; they need early-warning plus monetization plus execution sequencing.

## Why Gemma 4

- Gemma releases page notes Gemma 4 supports long context and multimodal input.
- For DeltaProof this matters because the product wants a strong local reasoning path for commercial synthesis over long artifact trails.

## Why EmbeddingGemma

- EmbeddingGemma overview:
  [https://ai.google.dev/gemma/docs/embeddinggemma](https://ai.google.dev/gemma/docs/embeddinggemma)
  Notes:
  - 308M multilingual embedding model
  - designed for retrieval, semantic similarity, classification, and clustering
  - flexible output dimensions from `768` to `128`
  - on-device and offline-friendly

- EmbeddingGemma model card:
  [https://ai.google.dev/gemma/docs/embeddinggemma/model_card](https://ai.google.dev/gemma/docs/embeddinggemma/model_card)
  Notes:
  - Google positions it as state-of-the-art for its size
  - purpose-built for retrieval, clustering, and semantic search

DeltaProof uses this as the conceptual basis for the semantic motif layer. The product does not only look for pre-seeded categories; it can also cluster latent expansion patterns when `embeddinggemma` is available through Ollama.

## Why FunctionGemma matters next

- Function calling with Gemma:
  [https://ai.google.dev/gemma/docs/capabilities/function-calling](https://ai.google.dev/gemma/docs/capabilities/function-calling)
  Notes:
  - FunctionGemma is a specialized lightweight model for tool use
  - Google recommends Gemma 3 27B for best performance and 12B for a balanced path in general function-calling settings

This is relevant for DeltaProof’s next phase: autonomous commercial actions such as drafting tailored recovery plays, generating structured proposal options, or triggering downstream workflows with explicit safeguards.

The current repo now partially closes that gap with an operator console that ranks postures, calculates the weekly cost of waiting, sequences the next moves, and anticipates pushback. FunctionGemma still matters for the next step because it would let those moves become safer structured tool calls instead of text-only guidance.

## Why continuous memory matters

The Cloudflare sources above make the runtime choice obvious:

- D1 gives DeltaProof a low-friction SQLite memory core for every workspace
- cron triggers give it an always-on analysis heartbeat
- Workers best practices reinforce keeping these watchtower sweeps off the critical request path

That combination is what turns DeltaProof from a good one-off analyzer into a commercial memory system.

## Why Ollama is in the stack

- Ollama embed API:
  [https://docs.ollama.com/api/embed](https://docs.ollama.com/api/embed)
  Notes:
  - `POST /api/embed`
  - accepts a `model`, `input`, optional `dimensions`, and optional `truncate`
  - official example uses `embeddinggemma`

That endpoint is the current runtime bridge between DeltaProof and EmbeddingGemma for local semantic motif discovery.

## Product interpretation

The key insight is not “use the biggest model available.” It is:

- use Gemma 4 for premium local commercial synthesis
- use EmbeddingGemma for latent signal discovery and clustering
- use a strict eval loop so the repo stays honest about what got better
- keep sensitive customer data local-first wherever possible

This is why DeltaProof now has:

- signal staging from `whisper` to `unbilled`
- shadow pipeline generation
- decision-window estimation so the team knows when pricing power expires
- operator-console scenario ranking and first-move sequencing
- watchtower change cards and pulse history
- recurring cron-driven workspace sweeps
- a workspace-network control room layered over multiple service scenarios
- executive Markdown briefs that let the commercial truth leave the product without losing structure
- portfolio command briefs that turn many client situations into one weekly founder memo
- counterfactual reality mapping
- semantic motif discovery
- replayable eval fixtures and regression gates
