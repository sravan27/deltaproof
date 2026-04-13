import type {
  AnalyzeRequest,
  ArtifactInput,
  DashboardPayload,
  PortfolioBrief,
  WorkspaceSummary,
} from '../../shared/contracts'
import type { TextItem } from 'pdfjs-dist/types/src/display/api'

let pdfRuntime:
  | Promise<{
      getDocument: typeof import('pdfjs-dist').getDocument
    }>
  | undefined

let papaRuntime: Promise<typeof import('papaparse')> | undefined

export async function extractArtifactsFromFiles(files: File[]): Promise<ArtifactInput[]> {
  const extracted = await Promise.all(files.map((file) => extractArtifactFromFile(file)))
  return extracted.filter((artifact): artifact is ArtifactInput => Boolean(artifact))
}

export async function requestAnalysis(payload: AnalyzeRequest): Promise<DashboardPayload> {
  const response = await fetch('/api/analyze', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(payload),
  })

  if (!response.ok) {
    throw new Error('DeltaProof could not analyze the uploaded artifacts.')
  }

  return (await response.json()) as DashboardPayload
}

export async function requestWorkspaceCatalog(): Promise<WorkspaceSummary[]> {
  const response = await fetch('/api/workspaces')

  if (!response.ok) {
    throw new Error('DeltaProof could not load workspace catalog.')
  }

  return (await response.json()) as WorkspaceSummary[]
}

export async function requestWorkspaceDashboard(slug: string): Promise<DashboardPayload> {
  const response = await fetch(`/api/workspaces/${slug}`)

  if (!response.ok) {
    throw new Error('DeltaProof could not load this workspace.')
  }

  return (await response.json()) as DashboardPayload
}

export async function requestWorkspaceBriefMarkdown(slug: string): Promise<string> {
  const response = await fetch(`/api/workspaces/${slug}/brief.md`)

  if (!response.ok) {
    throw new Error('DeltaProof could not load the executive brief.')
  }

  return response.text()
}

export async function requestPortfolioBrief(): Promise<PortfolioBrief> {
  const response = await fetch('/api/portfolio')

  if (!response.ok) {
    throw new Error('DeltaProof could not load the portfolio brief.')
  }

  return (await response.json()) as PortfolioBrief
}

export async function requestPortfolioBriefMarkdown(): Promise<string> {
  const response = await fetch('/api/portfolio/brief.md')

  if (!response.ok) {
    throw new Error('DeltaProof could not load the portfolio markdown brief.')
  }

  return response.text()
}

async function extractArtifactFromFile(file: File): Promise<ArtifactInput | null> {
  const lowerName = file.name.toLowerCase()

  let content = ''

  if (file.type === 'application/pdf' || lowerName.endsWith('.pdf')) {
    content = await extractPdfText(file)
  } else if (lowerName.endsWith('.csv')) {
    content = await extractCsvText(file)
  } else {
    content = await file.text()
  }

  const normalized = content.trim()
  if (!normalized) {
    return null
  }

  return {
    title: file.name.replace(/\.[^.]+$/, ''),
    source: `Uploaded / ${file.name}`,
    content: normalized,
    createdAt: new Date(file.lastModified || Date.now()).toISOString(),
  }
}

async function extractPdfText(file: File): Promise<string> {
  const { getDocument } = await loadPdfRuntime()
  const pdf = await getDocument({ data: await file.arrayBuffer() }).promise
  const pages: string[] = []

  for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber += 1) {
    const page = await pdf.getPage(pageNumber)
    const textContent = await page.getTextContent()
    const pageText = textContent.items
      .map((item) => ('str' in item ? (item as TextItem).str : ''))
      .join(' ')

    pages.push(pageText)
  }

  return pages.join('\n')
}

async function extractCsvText(file: File): Promise<string> {
  const Papa = await loadPapaRuntime()
  const text = await file.text()
  const parsed = Papa.parse<string[]>(text, {
    skipEmptyLines: true,
  })

  return parsed.data.map((row: string[]) => row.join(' | ')).join('\n')
}

async function loadPdfRuntime(): Promise<{
  getDocument: typeof import('pdfjs-dist').getDocument
}> {
  if (!pdfRuntime) {
    pdfRuntime = Promise.all([
      import('pdfjs-dist'),
      import('pdfjs-dist/build/pdf.worker.mjs?url'),
    ]).then(([pdfjs, workerUrl]) => {
      pdfjs.GlobalWorkerOptions.workerSrc = workerUrl.default
      return {
        getDocument: pdfjs.getDocument,
      }
    })
  }

  return pdfRuntime
}

async function loadPapaRuntime(): Promise<typeof import('papaparse')> {
  if (!papaRuntime) {
    papaRuntime = import('papaparse')
  }

  return papaRuntime
}
