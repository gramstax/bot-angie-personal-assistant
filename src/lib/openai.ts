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
    const res = await OpenAIClient.fetchFn(OpenAIClient.chatCompletionsUrl(baseUrl), {
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
    if (!res.ok) {
      const body = await res.text().catch(() => ``)
      throw new Error(`AI chat ${res.status}: ${body.slice(0, 200)}`)
    }
    const data = (await res.json()) as {choices?: {message?: IChatMessage}[]}
    const message = data.choices?.[0]?.message
    if (!message) throw new Error(`AI chat: empty response`)
    return {message}
  }
}
