/** Klien OpenAI minimal via fetch langsung (tanpa SDK tambahan). */
export interface IChatTool {
  type: `function`
  function: {
    name: string
    description: string
    parameters: Record<string, unknown>
  }
}

export interface IChatMessage {
  role: `system` | `user` | `assistant` | `tool`
  content: string | null
  tool_calls?: {id: string; type: `function`; function: {name: string; arguments: string}}[]
  tool_call_id?: string
}

export interface IChatResult {
  message: IChatMessage
}

/** Default base URL untuk API yang kompatibel dengan OpenAI. */
export const OPENAI_DEFAULT_BASE_URL = `https://api.openai.com/v1`

export class OpenAIClient {
  static fetchFn: typeof fetch = fetch

  /** Max retries on rate-limit responses (402/429) from free providers. */
  static readonly MAX_RATE_LIMIT_RETRIES = 3
  /** Default wait between rate-limited attempts (free providers allow ~1 reply/45 s per IP). */
  static readonly DEFAULT_RATE_LIMIT_WAIT_MS = 45_000
  /** Cap for a single rate-limit wait. */
  static readonly MAX_RATE_LIMIT_WAIT_MS = 60_000

  /**
   * Milliseconds a rate-limit response asks us to wait: the body's
   * "Retry after Ns" first, else the `retry-after` header, else the
   * default. Capped so one bad reply cannot stall the bot forever.
   */
  static retryAfterMs(res: Response, bodyText: string): number {
    const fromBody = /retry after\s+(\d+)\s*s/i.exec(bodyText)
    const header = res.headers?.get?.(`retry-after`)
    const seconds = fromBody ? Number(fromBody[1]) : Number(header ?? NaN)
    const ms = Number.isFinite(seconds) ? seconds * 1_000 : OpenAIClient.DEFAULT_RATE_LIMIT_WAIT_MS
    return Math.min(Math.max(ms, 0), OpenAIClient.MAX_RATE_LIMIT_WAIT_MS)
  }

  /** `<baseUrl>/chat/completions` — terima base URL polos maupun URL lengkap. */
  static chatCompletionsUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim().replace(/\/+$/, ``)
    if (trimmed.endsWith(`/chat/completions`)) return trimmed
    return `${trimmed}/chat/completions`
  }

  /** `<baseUrl>/audio/transcriptions` — buang akhiran `/chat/completions` bila ada. */
  static audioTranscriptionsUrl(baseUrl: string): string {
    const trimmed = baseUrl.trim().replace(/\/+$/, ``)
    const base = trimmed.endsWith(`/chat/completions`)
      ? trimmed.slice(0, -`/chat/completions`.length)
      : trimmed
    return `${base}/audio/transcriptions`
  }

  static async chat(
    apiKey: string,
    model: string,
    messages: IChatMessage[],
    tools: IChatTool[],
    baseUrl: string = OPENAI_DEFAULT_BASE_URL,
  ): Promise<IChatResult> {
    const headers: Record<string, string> = {"Content-Type": `application/json`}
    // Provider gratis seperti Pollinations tidak butuh kunci — kirim
    // Authorization hanya bila ada kunci.
    if (apiKey.trim() !== ``) headers.Authorization = `Bearer ${apiKey}`
    const url = OpenAIClient.chatCompletionsUrl(baseUrl)
    // Provider gratis membatasi pemakaian anonim (Pollinations: 1 balasan
    // tiap 45 dtk per IP, HTTP 402 FREE_LIMIT). Satu pertanyaan bisa
    // memanggil model beberapa kali (tool rounds), jadi tanpa retry
    // hampir selalu gagal — tunggu batasnya lalu coba lagi, jangan
    // langsung melempar error ke pengguna.
    for (let attempt = 0; attempt <= OpenAIClient.MAX_RATE_LIMIT_RETRIES; attempt++) {
      const res = await OpenAIClient.fetchFn(url, {
        method: `POST`,
        headers,
        body: JSON.stringify({
          model,
          messages,
          tools: tools.length > 0 ? tools : undefined,
          tool_choice: tools.length > 0 ? `auto` : undefined,
          temperature: 0.7,
        }),
      })
      if (res.ok) {
        const data = (await res.json()) as {choices?: {message?: IChatMessage}[]}
        const message = data.choices?.[0]?.message
        if (!message) throw new Error(`AI chat: empty response`)
        return {message}
      }
      const bodyText = await res.text().catch(() => ``)
      const retryable = res.status === 402 || res.status === 429
      if (!retryable || attempt === OpenAIClient.MAX_RATE_LIMIT_RETRIES) {
        throw new Error(`AI chat ${res.status}: ${bodyText.slice(0, 200)}`)
      }
      await new Promise((resolve) => setTimeout(resolve, OpenAIClient.retryAfterMs(res, bodyText)))
    }
    throw new Error(`AI chat: rate limit retries exhausted`)
  }
}
