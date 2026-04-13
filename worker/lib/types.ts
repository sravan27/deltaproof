export interface AppEnv extends Env {
  OLLAMA_BASE_URL?: string
  OLLAMA_MODEL?: string
  OLLAMA_FALLBACK_MODEL?: string
  OLLAMA_EMBED_MODEL?: string
  OLLAMA_EMBED_DIMENSIONS?: string
  OLLAMA_API_KEY?: string
  POLAR_CHECKOUT_URL?: string
}
