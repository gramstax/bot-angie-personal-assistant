import {afterEach, describe, expect, it} from "bun:test"
import {AppConfig} from "../src/lib/config"
import {OPENAI_DEFAULT_BASE_URL, OpenAIClient, type IChatMessage} from "../src/lib/openai"

const defaultUrl = OPENAI_DEFAULT_BASE_URL
const pollinationsUrl = `https://text.pollinations.ai/openai`

function stubFetch(body: unknown, ok = true, status = 200) {
  let seenUrl = ``
  let seenInit: RequestInit | undefined
  const fetchFn = (async (url: string, init?: RequestInit) => {
    seenUrl = url
    seenInit = init
    return {
      ok,
      status,
      text: async () => (typeof body === `string` ? body : JSON.stringify(body)),
      json: async () => body,
    }
  }) as unknown as typeof fetch
  return {fetchFn, seen: () => ({url: seenUrl, init: seenInit})}
}

describe(`OpenAIClient.chatCompletionsUrl`, () => {
  it(`appends /chat/completions to the default base URL`, () => {
    expect(OpenAIClient.chatCompletionsUrl(defaultUrl)).toBe(`${defaultUrl}/chat/completions`)
  })

  it(`strips trailing slashes before appending`, () => {
    expect(OpenAIClient.chatCompletionsUrl(`${defaultUrl}///`)).toBe(`${defaultUrl}/chat/completions`)
    expect(OpenAIClient.chatCompletionsUrl(`${pollinationsUrl}/`)).toBe(`${pollinationsUrl}/chat/completions`)
  })

  it(`passes a full /chat/completions URL through unchanged`, () => {
    const full = `${defaultUrl}/chat/completions`
    expect(OpenAIClient.chatCompletionsUrl(full)).toBe(full)
    expect(OpenAIClient.chatCompletionsUrl(`${full}/`)).toBe(full)
  })

  it(`uses a custom base URL as-is`, () => {
    expect(OpenAIClient.chatCompletionsUrl(pollinationsUrl)).toBe(`${pollinationsUrl}/chat/completions`)
  })
})

describe(`OpenAIClient.audioTranscriptionsUrl`, () => {
  it(`appends /audio/transcriptions to the default base URL`, () => {
    expect(OpenAIClient.audioTranscriptionsUrl(defaultUrl)).toBe(`${defaultUrl}/audio/transcriptions`)
  })

  it(`uses a custom base URL as-is`, () => {
    expect(OpenAIClient.audioTranscriptionsUrl(pollinationsUrl)).toBe(`${pollinationsUrl}/audio/transcriptions`)
  })

  it(`strips a trailing /chat/completions suffix first`, () => {
    expect(OpenAIClient.audioTranscriptionsUrl(`${defaultUrl}/chat/completions`)).toBe(
      `${defaultUrl}/audio/transcriptions`,
    )
  })
})

describe(`OpenAIClient.chat`, () => {
  const originalFetchFn = OpenAIClient.fetchFn
  afterEach(() => {
    OpenAIClient.fetchFn = originalFetchFn
  })

  const messages: IChatMessage[] = [{role: `user`, content: `hi`}]

  it(`posts to the configured custom base URL without an Authorization header when the key is empty`, async () => {
    const stub = stubFetch({choices: [{message: {role: `assistant`, content: `hello`}}]})
    OpenAIClient.fetchFn = stub.fetchFn
    const result = await OpenAIClient.chat(``, `openai`, messages, [], pollinationsUrl)
    expect(result.message.content).toBe(`hello`)
    const {url, init} = stub.seen()
    expect(url).toBe(`${pollinationsUrl}/chat/completions`)
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBeUndefined()
  })

  it(`sends Authorization when a key is set`, async () => {
    const stub = stubFetch({choices: [{message: {role: `assistant`, content: `hello`}}]})
    OpenAIClient.fetchFn = stub.fetchFn
    await OpenAIClient.chat(`sk-test`, `gpt-4o-mini`, messages, [])
    const {init} = stub.seen()
    const headers = init?.headers as Record<string, string>
    expect(headers.Authorization).toBe(`Bearer sk-test`)
  })

  it(`omits tools and tool_choice when the tool list is empty`, async () => {
    const stub = stubFetch({choices: [{message: {role: `assistant`, content: `hello`}}]})
    OpenAIClient.fetchFn = stub.fetchFn
    await OpenAIClient.chat(`sk-test`, `gpt-4o-mini`, messages, [])
    const {init} = stub.seen()
    const body = JSON.parse(String(init?.body)) as Record<string, unknown>
    expect(body.tools).toBeUndefined()
    expect(body.tool_choice).toBeUndefined()
    expect(body.model).toBe(`gpt-4o-mini`)
  })

  it(`throws an AI chat error on a failed response`, async () => {
    const stub = stubFetch(`nope`, false, 401)
    OpenAIClient.fetchFn = stub.fetchFn
    await expect(OpenAIClient.chat(`sk-test`, `gpt-4o-mini`, messages, [])).rejects.toThrow(`AI chat 401`)
  })
})

describe(`AppConfig.normalizeBaseUrl`, () => {
  it(`returns the default for empty or blank input`, () => {
    expect(AppConfig.normalizeBaseUrl(``)).toBe(defaultUrl)
    expect(AppConfig.normalizeBaseUrl(`   `)).toBe(defaultUrl)
  })

  it(`trims whitespace and strips trailing slashes`, () => {
    expect(AppConfig.normalizeBaseUrl(`  ${pollinationsUrl}/// `)).toBe(pollinationsUrl)
  })

  it(`keeps a custom URL unchanged`, () => {
    expect(AppConfig.normalizeBaseUrl(pollinationsUrl)).toBe(pollinationsUrl)
  })
})

describe(`AppConfig.isCustomBaseUrl`, () => {
  it(`is false for an unset or default base URL`, () => {
    expect(AppConfig.isCustomBaseUrl({})).toBe(false)
    expect(AppConfig.isCustomBaseUrl({OPENAI_BASE_URL: defaultUrl})).toBe(false)
    expect(AppConfig.isCustomBaseUrl({OPENAI_BASE_URL: `${defaultUrl}/`})).toBe(false)
  })

  it(`is true for a custom base URL`, () => {
    expect(AppConfig.isCustomBaseUrl({OPENAI_BASE_URL: pollinationsUrl})).toBe(true)
  })
})

describe(`AppConfig.isMock`, () => {
  it(`is mock with no key and the default base URL`, () => {
    expect(AppConfig.isMock({})).toBe(true)
    expect(AppConfig.isMock({OPENAI_API_KEY: ``})).toBe(true)
    expect(AppConfig.isMock({OPENAI_API_KEY: `   `})).toBe(true)
  })

  it(`is NOT mock with no key and a custom base URL (keyless live provider)`, () => {
    expect(AppConfig.isMock({OPENAI_BASE_URL: pollinationsUrl})).toBe(false)
  })

  it(`is mock when the mock flag is set, even with a key or custom base URL`, () => {
    expect(AppConfig.isMock({ANGIE_MOCK_AI: `1`, OPENAI_API_KEY: `sk-test`})).toBe(true)
    expect(AppConfig.isMock({ANGIE_MOCK_AI: `true`, OPENAI_BASE_URL: pollinationsUrl})).toBe(true)
  })

  it(`is NOT mock when a key is set`, () => {
    expect(AppConfig.isMock({OPENAI_API_KEY: `sk-test`})).toBe(false)
    expect(AppConfig.isMock({OPENAI_API_KEY: `sk-test`, OPENAI_BASE_URL: pollinationsUrl})).toBe(false)
  })
})

describe(`AppConfig.load`, () => {
  it(`reads the model and base URL from env with OpenAI defaults`, () => {
    const cfg = AppConfig.load({})
    expect(cfg.openaiBaseUrl).toBe(defaultUrl)
    expect(cfg.openaiModel).toBe(`gpt-4o-mini`)
    const custom = AppConfig.load({OPENAI_BASE_URL: pollinationsUrl, OPENAI_MODEL: `openai`})
    expect(custom.openaiBaseUrl).toBe(pollinationsUrl)
    expect(custom.openaiModel).toBe(`openai`)
  })
})

describe(`OpenAIClient.retryAfterMs`, () => {
  const res = (header?: string) =>
    new Response(``, {status: 402, headers: header === undefined ? {} : {"retry-after": header}})

  it(`parses "Retry after Ns" from the body first`, () => {
    expect(OpenAIClient.retryAfterMs(res(`120`), `Free limit reached: Retry after 41s`)).toBe(41_000)
  })

  it(`falls back to the retry-after header`, () => {
    expect(OpenAIClient.retryAfterMs(res(`30`), `something else`)).toBe(30_000)
  })

  it(`falls back to the default when neither is present`, () => {
    expect(OpenAIClient.retryAfterMs(res(), `something else`)).toBe(OpenAIClient.DEFAULT_RATE_LIMIT_WAIT_MS)
  })

  it(`caps the wait at the maximum`, () => {
    expect(OpenAIClient.retryAfterMs(res(), `Retry after 120s`)).toBe(OpenAIClient.MAX_RATE_LIMIT_WAIT_MS)
  })
})

describe(`OpenAIClient.chat rate-limit retry`, () => {
  afterEach(() => {
    OpenAIClient.fetchFn = fetch
  })

  const messages: IChatMessage[] = [{role: `user`, content: `hello`}]
  const okBody = {choices: [{message: {role: `assistant`, content: `hi`}}]}
  const limitBody = {status: 402, error: {message: `Free limit reached: Retry after 0s`}}

  it(`retries a 402 once and succeeds`, async () => {
    let calls = 0
    OpenAIClient.fetchFn = (async (_url: string | URL | Request, _init?: RequestInit) => {
      calls++
      if (calls === 1) {
        return new Response(JSON.stringify(limitBody), {status: 402, headers: {"Content-Type": `application/json`}})
      }
      return new Response(JSON.stringify(okBody), {status: 200, headers: {"Content-Type": `application/json`}})
    }) as typeof fetch
    const {message} = await OpenAIClient.chat(``, `openai-fast`, messages, [], pollinationsUrl)
    expect(message.content).toBe(`hi`)
    expect(calls).toBe(2)
  })

  it(`throws after exhausting retries on a persistent 402`, async () => {
    let calls = 0
    OpenAIClient.fetchFn = (async (_url: string | URL | Request, _init?: RequestInit) => {
      calls++
      return new Response(JSON.stringify(limitBody), {status: 402, headers: {"Content-Type": `application/json`}})
    }) as typeof fetch
    await expect(OpenAIClient.chat(``, `openai-fast`, messages, [], pollinationsUrl)).rejects.toThrow(`AI chat 402`)
    expect(calls).toBe(OpenAIClient.MAX_RATE_LIMIT_RETRIES + 1)
  })

  it(`does not retry a 400`, async () => {
    let calls = 0
    OpenAIClient.fetchFn = (async (_url: string | URL | Request, _init?: RequestInit) => {
      calls++
      return new Response(JSON.stringify({error: `bad request`}), {status: 400, headers: {"Content-Type": `application/json`}})
    }) as typeof fetch
    await expect(OpenAIClient.chat(``, `openai-fast`, messages, [], pollinationsUrl)).rejects.toThrow(`AI chat 400`)
    expect(calls).toBe(1)
  })
})
