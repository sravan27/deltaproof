import { z } from 'zod'
import type { DashboardPayload, Finding } from '../../shared/contracts'
import { renderExecutiveBriefMarkdown } from '../../shared/brief'
import { PROMPT_PACK } from '../../shared/prompt-pack'
import type { AppEnv } from './types'

const upgradeSchema = z.object({
  updatedFindingNarratives: z.array(
    z.object({
      id: z.string(),
      title: z.string(),
      summary: z.string(),
      whyNow: z.string(),
      recommendation: z.string(),
    }),
  ),
  packetSummary: z.string(),
  packetEmailDraft: z.string(),
  operatorThesis: z.string(),
  executiveBrief: z.object({
    headline: z.string(),
    decision: z.string(),
    whyNow: z.string(),
    internalNarrative: z.string(),
    clientNarrative: z.string(),
  }),
  updatedMoveNarratives: z.array(
    z.object({
      id: z.string(),
      whyThisWins: z.string(),
      script: z.string(),
    }),
  ),
})

function normalizeBaseUrl(baseUrl: string): string {
  return baseUrl.endsWith('/api') ? baseUrl : `${baseUrl.replace(/\/$/, '')}/api`
}

function buildChatBody(model: string, dashboard: DashboardPayload): string {
  const systemPrompt = [
    PROMPT_PACK.system,
    PROMPT_PACK.responseContract,
    'Keep every dollar figure unchanged. Be evidence-first, commercially sharp, and concise.',
  ].join(' ')

  return JSON.stringify({
    model,
    stream: false,
    format: {
      type: 'object',
      properties: {
        updatedFindingNarratives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              title: { type: 'string' },
              summary: { type: 'string' },
              whyNow: { type: 'string' },
              recommendation: { type: 'string' },
            },
            required: ['id', 'title', 'summary', 'whyNow', 'recommendation'],
          },
        },
        packetSummary: { type: 'string' },
        packetEmailDraft: { type: 'string' },
        operatorThesis: { type: 'string' },
        executiveBrief: {
          type: 'object',
          properties: {
            headline: { type: 'string' },
            decision: { type: 'string' },
            whyNow: { type: 'string' },
            internalNarrative: { type: 'string' },
            clientNarrative: { type: 'string' },
          },
          required: ['headline', 'decision', 'whyNow', 'internalNarrative', 'clientNarrative'],
        },
        updatedMoveNarratives: {
          type: 'array',
          items: {
            type: 'object',
            properties: {
              id: { type: 'string' },
              whyThisWins: { type: 'string' },
              script: { type: 'string' },
            },
            required: ['id', 'whyThisWins', 'script'],
          },
        },
      },
      required: [
        'updatedFindingNarratives',
        'packetSummary',
        'packetEmailDraft',
        'operatorThesis',
        'executiveBrief',
        'updatedMoveNarratives',
      ],
    },
    messages: [
      { role: 'system', content: systemPrompt },
      {
        role: 'user',
        content: JSON.stringify({
          workspaceName: dashboard.workspaceName,
          headline: dashboard.headline,
          findings: dashboard.findings,
          operatorConsole: {
            thesis: dashboard.operatorConsole.thesis,
            scenarios: dashboard.operatorConsole.scenarios,
            moves: dashboard.operatorConsole.moves,
            pushbackCards: dashboard.operatorConsole.pushbackCards,
          },
          executiveBrief: dashboard.executiveBrief,
          packet: dashboard.packet,
        }),
      },
    ],
    options: {
      temperature: 0.2,
      top_p: 0.95,
      top_k: 64,
    },
  })
}

async function requestUpgrade(
  baseUrl: string,
  model: string,
  env: AppEnv,
  dashboard: DashboardPayload,
): Promise<DashboardPayload | null> {
  const headers = new Headers({
    'Content-Type': 'application/json',
  })

  if (env.OLLAMA_API_KEY) {
    headers.set('Authorization', `Bearer ${env.OLLAMA_API_KEY}`)
  }

  const response = await fetch(`${normalizeBaseUrl(baseUrl)}/chat`, {
    method: 'POST',
    headers,
    body: buildChatBody(model, dashboard),
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as {
    message?: { content?: string }
  }
  const rawContent = payload.message?.content

  if (!rawContent) {
    return null
  }

  const parsed = upgradeSchema.parse(JSON.parse(rawContent))
  const narrativeMap = new Map(parsed.updatedFindingNarratives.map((item) => [item.id, item]))
  const moveMap = new Map(parsed.updatedMoveNarratives.map((item) => [item.id, item]))

  return {
    ...dashboard,
    findings: dashboard.findings.map((finding) => upgradeFinding(finding, narrativeMap.get(finding.id))),
    operatorConsole: {
      ...dashboard.operatorConsole,
      thesis: parsed.operatorThesis,
      moves: dashboard.operatorConsole.moves.map((move) => upgradeMove(move, moveMap.get(move.id))),
    },
    executiveBrief: {
      ...dashboard.executiveBrief,
      headline: parsed.executiveBrief.headline,
      decision: parsed.executiveBrief.decision,
      whyNow: parsed.executiveBrief.whyNow,
      internalNarrative: parsed.executiveBrief.internalNarrative,
      clientNarrative: parsed.executiveBrief.clientNarrative,
      markdown: renderExecutiveBriefMarkdown({
        ...dashboard.executiveBrief,
        headline: parsed.executiveBrief.headline,
        decision: parsed.executiveBrief.decision,
        whyNow: parsed.executiveBrief.whyNow,
        internalNarrative: parsed.executiveBrief.internalNarrative,
        clientNarrative: parsed.executiveBrief.clientNarrative,
      }),
    },
    packet: {
      ...dashboard.packet,
      summary: parsed.packetSummary,
      emailDraft: parsed.packetEmailDraft,
    },
    runtime: {
      ...dashboard.runtime,
      strategy: 'ollama',
      model,
    },
  }
}

function upgradeFinding(
  finding: Finding,
  upgrade:
    | {
        id: string
        title: string
        summary: string
        whyNow: string
        recommendation: string
      }
    | undefined,
): Finding {
  if (!upgrade) {
    return finding
  }

  return {
    ...finding,
    title: upgrade.title,
    summary: upgrade.summary,
    whyNow: upgrade.whyNow,
    recommendation: upgrade.recommendation,
  }
}

function upgradeMove(
  move: DashboardPayload['operatorConsole']['moves'][number],
  upgrade:
    | {
        id: string
        whyThisWins: string
        script: string
      }
    | undefined,
): DashboardPayload['operatorConsole']['moves'][number] {
  if (!upgrade) {
    return move
  }

  return {
    ...move,
    whyThisWins: upgrade.whyThisWins,
    script: upgrade.script,
  }
}

export async function enrichDashboardWithOllama(
  dashboard: DashboardPayload,
  env: AppEnv,
): Promise<DashboardPayload> {
  if (!env.OLLAMA_BASE_URL) {
    return dashboard
  }

  const models = [
    env.OLLAMA_MODEL ?? 'gemma4:31b',
    env.OLLAMA_FALLBACK_MODEL ?? 'gemma4:e4b',
  ].filter((value, index, values) => values.indexOf(value) === index)

  for (const model of models) {
    try {
      const upgraded = await requestUpgrade(env.OLLAMA_BASE_URL, model, env, dashboard)
      if (upgraded) {
        return upgraded
      }
    } catch {
      continue
    }
  }

  return dashboard
}
