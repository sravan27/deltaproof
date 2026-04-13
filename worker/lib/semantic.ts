import {
  RISK_CATEGORY_LABELS,
  type DashboardPayload,
  type RiskCategory,
  type SemanticMotif,
} from '../../shared/contracts'
import type { AppEnv } from './types'

interface EmbedResponse {
  embeddings?: number[][]
}

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api`
}

export async function enrichDashboardWithSemanticMotifs(
  dashboard: DashboardPayload,
  env: AppEnv,
): Promise<DashboardPayload> {
  if (!env.OLLAMA_BASE_URL || dashboard.evidence.length < 3) {
    return dashboard
  }

  try {
    const embedModel = env.OLLAMA_EMBED_MODEL ?? 'embeddinggemma'
    const inputs = dashboard.evidence.map((item) => `${item.title}\n${item.excerpt}`)
    const vectors = await requestEmbeddings(env, embedModel, inputs)

    if (!vectors.length || vectors.length !== dashboard.evidence.length) {
      return dashboard
    }

    const motifs = buildEmbeddingMotifs(dashboard, vectors)
    if (!motifs.length) {
      return dashboard
    }

    return {
      ...dashboard,
      semanticMotifs: dedupeMotifs([...motifs, ...dashboard.semanticMotifs]).slice(0, 6),
    }
  } catch {
    return dashboard
  }
}

async function requestEmbeddings(
  env: AppEnv,
  model: string,
  input: string[],
): Promise<number[][]> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  if (env.OLLAMA_API_KEY) {
    headers.set('Authorization', `Bearer ${env.OLLAMA_API_KEY}`)
  }

  const response = await fetch(`${normalizeBaseUrl(env.OLLAMA_BASE_URL!)}/embed`, {
    method: 'POST',
    headers,
    body: JSON.stringify({
      model,
      input,
      dimensions: env.OLLAMA_EMBED_DIMENSIONS ? Number.parseInt(env.OLLAMA_EMBED_DIMENSIONS, 10) : undefined,
      truncate: true,
    }),
  })

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as EmbedResponse
  return payload.embeddings ?? []
}

function buildEmbeddingMotifs(
  dashboard: DashboardPayload,
  vectors: number[][],
): SemanticMotif[] {
  const clusters = clusterVectors(vectors, 0.84)

  const motifResults: Array<SemanticMotif | null> = clusters.map((cluster, index) => {
      const items = cluster.map((itemIndex) => dashboard.evidence[itemIndex])
      if (items.length < 2) {
        return null
      }

      const categories = uniqueCategories(items.map((item) => item.category))
      const titles = items.map((item) => item.title)
      const themeTitle = buildThemeTitle(categories, titles)
      const relatedFindings = dashboard.findings.filter((finding) => categories.includes(finding.category))
      const relatedRevenue = relatedFindings.reduce((sum, finding) => sum + finding.moneyAtRisk, 0)

      return {
        id: `embedding-motif-${index + 1}`,
        title: themeTitle,
        summary:
          relatedRevenue > 0
            ? `EmbeddingGemma grouped ${items.length} signals into a latent theme worth roughly ${formatUsd(relatedRevenue)} if the team packages it coherently.`
            : `EmbeddingGemma grouped ${items.length} semantically related signals that look like the start of a distinct expansion lane.`,
        evidenceIds: items.map((item) => item.id),
        categories,
        intensity: Math.min(99, Math.round(items.reduce((sum, item) => sum + item.urgency, 0) / items.length * 18)),
        noveltyScore: Math.min(
          99,
          48 + uniqueCategories(items.map((item) => item.category)).length * 12 + new Set(items.map((item) => item.stage)).size * 8,
        ),
        commercialAngle: buildCommercialAngle(categories, relatedFindings),
        sampleExcerpts: items.slice(0, 3).map((item) => item.excerpt),
        source: 'embedding',
      } satisfies SemanticMotif
    })

  return motifResults
    .filter((motif): motif is SemanticMotif => motif !== null)
    .sort((left, right) => right.intensity - left.intensity)
}

function clusterVectors(vectors: number[][], threshold: number): number[][] {
  const assigned = new Set<number>()
  const clusters: number[][] = []

  for (let i = 0; i < vectors.length; i += 1) {
    if (assigned.has(i)) {
      continue
    }

    const cluster = [i]
    assigned.add(i)

    for (let j = i + 1; j < vectors.length; j += 1) {
      if (assigned.has(j)) {
        continue
      }

      if (cosineSimilarity(vectors[i], vectors[j]) >= threshold) {
        cluster.push(j)
        assigned.add(j)
      }
    }

    if (cluster.length >= 2) {
      clusters.push(cluster)
    }
  }

  return clusters
}

function cosineSimilarity(left: number[], right: number[]): number {
  let dot = 0
  let leftNorm = 0
  let rightNorm = 0

  for (let i = 0; i < left.length; i += 1) {
    dot += left[i] * right[i]
    leftNorm += left[i] * left[i]
    rightNorm += right[i] * right[i]
  }

  if (!leftNorm || !rightNorm) {
    return 0
  }

  return dot / (Math.sqrt(leftNorm) * Math.sqrt(rightNorm))
}

function buildThemeTitle(categories: RiskCategory[], titles: string[]): string {
  if (categories.length === 1) {
    return `${RISK_CATEGORY_LABELS[categories[0]]} motif`
  }

  if (categories.includes('portal_access') && categories.includes('data_sync')) {
    return 'Partner operations motif'
  }

  const common = mostCommonSignificantWord(titles.join(' '))
  return common ? `${capitalize(common)} expansion motif` : 'Latent expansion motif'
}

function buildCommercialAngle(categories: RiskCategory[], relatedFindings: DashboardPayload['findings']): string {
  if (categories.includes('maintenance_tail')) {
    return 'These signals lean toward a retainer shape more than a one-off recovery.'
  }

  if (categories.includes('ai_assistant')) {
    return 'The semantic overlap suggests an AI pilot is becoming a product expectation, not a side request.'
  }

  if (relatedFindings[0]) {
    return relatedFindings[0].recommendation
  }

  return 'Package the motif as one coherent commercial move before the client treats it as default scope.'
}

function uniqueCategories(categories: RiskCategory[]): RiskCategory[] {
  return Array.from(new Set(categories))
}

function mostCommonSignificantWord(input: string): string | null {
  const stopwords = new Set([
    'the',
    'and',
    'for',
    'with',
    'that',
    'this',
    'from',
    'into',
    'your',
    'their',
    'client',
    'work',
    'team',
    'flow',
    'build',
  ])
  const counts = new Map<string, number>()

  for (const raw of input.toLowerCase().split(/[^a-z0-9]+/g)) {
    if (raw.length < 4 || stopwords.has(raw)) {
      continue
    }
    counts.set(raw, (counts.get(raw) ?? 0) + 1)
  }

  const ranked = Array.from(counts.entries()).sort((left, right) => right[1] - left[1])
  return ranked[0]?.[0] ?? null
}

function capitalize(input: string): string {
  return `${input[0]?.toUpperCase() ?? ''}${input.slice(1)}`
}

function dedupeMotifs(motifs: SemanticMotif[]): SemanticMotif[] {
  const seen = new Set<string>()

  return motifs.filter((motif) => {
    const key = `${motif.title}-${motif.categories.join(',')}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}

function formatUsd(value: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    maximumFractionDigits: 0,
  }).format(value)
}
