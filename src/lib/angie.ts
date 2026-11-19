import type {Db} from "~/db"
import {AppConfig} from "~/lib/config"
import {Dates} from "~/lib/dates"
import {GoogleService, type GoogleErrorCode} from "~/lib/google"
import type {Lang} from "~/lib/lang"
import {OpenAIClient, type IChatMessage, type IChatTool} from "~/lib/openai"
import type {ITurn} from "~/types/angie"

export type ToolName = `email` | `calendar` | `tasks` | `contacts`

/**
 * One tool's outcome as DATA, not words: preformatted item lines, a
 * connected flag, and a machine-readable error `code`. The page's static
 * template renders the label, the empty sentence, and the not-connected
 * sentence in the user's language — this file never holds those sentences
 * (strict rule, Damar 2026-11-19 ~14:43 WIB: no string dictionary, localize via
 * `static template` blocks).
 */
export interface IToolSection {
  tool: string
  connected: boolean
  code?: GoogleErrorCode
  status?: number
  /** Calendar only: the date the events were fetched for. */
  date?: string
  /** Display lines, data only (e.g. `• subject — from (date)`). */
  lines: string[]
}

export type AngieReplyKind =
  | `live`
  | `live-exhausted`
  | `live-noanswer`
  | `mock-echo`
  | `mock-like-found`
  | `mock-like-none`
  | `mock-tools-ok`
  | `mock-tools-empty`
  | `mock-tools-noconnect`

export interface IAngieReply {
  /** Flat render key: the page template switches on this, one case per kind. */
  kind: AngieReplyKind
  /** Live LLM text — only when kind === `live`. */
  reply: string
  /** mock-echo: the user's text. */
  text?: string
  /** mock-echo: turn count. */
  turns?: number
  /** mock-like-found: the remembered like. */
  liked?: string
  /** mock-tools-*: the first tool used (drives the template label). */
  label?: ToolName
  /** mock-tools-empty (calendar): the date with no events. */
  date?: string
  /** mock-tools-noconnect: Google failure code. */
  code?: GoogleErrorCode
  /** mock-tools-noconnect: HTTP status when the API answered with an error. */
  status?: number
  /** mock-tools-ok: flattened item lines from every tool used. */
  lines: string[]
  /** Names of the tools used on this turn (empty when none were used). */
  toolsUsed: string[]
  /** `openai` = live GPT-4o-mini, `mock` = ANGIE_MOCK_AI mode / no key. */
  via: `openai` | `mock`
}

const TOOLS: IChatTool[] = [
  {
    type: `function`,
    function: {
      name: `get_email`,
      description: `Fetch unread inbox emails (not promotions), filtered by date.`,
      parameters: {
        type: `object`,
        properties: {after: {type: `string`, description: `Start date YYYY-MM-DD, default today`}},
      },
    },
  },
  {
    type: `function`,
    function: {
      name: `get_calendar`,
      description: `Fetch Google Calendar events for a single date.`,
      parameters: {
        type: `object`,
        properties: {date: {type: `string`, description: `Date YYYY-MM-DD, default today`}},
      },
    },
  },
  {
    type: `function`,
    function: {
      name: `get_tasks`,
      description: `Fetch the user's task list from the database.`,
      parameters: {type: `object`, properties: {}},
    },
  },
  {
    type: `function`,
    function: {
      name: `get_contacts`,
      description: `Search the user's contacts by name, email, or phone.`,
      parameters: {
        type: `object`,
        properties: {query: {type: `string`, description: `Search keyword, empty = all contacts`}},
      },
    },
  },
]

/**
 * Angie — the conversation core. Flow: text/voice -> persistent window
 * buffer memory (LMDB) -> AI agent GPT-4o-mini + 4 tools (email, calendar,
 * tasks, contacts) -> reply.
 *
 * Mock mode (ANGIE_MOCK_AI=1 or no OPENAI_API_KEY): NO OpenAI calls —
 * deterministic structured replies from LMDB data + memory, so e2e can
 * prove the flow without keys. Google tools are still called as-is: without
 * a GOOGLE_ACCESS_TOKEN they answer "not connected", never fake data.
 */
export class AngieService {
  /**
   * LLM system prompt (model instruction, NOT a user-facing message — the
   * user never sees this text, so it stays in code by design). It tells
   * the model which language to answer in.
   */
  static systemPrompt(now = new Date(), lang: Lang = `en`): string {
    const dateLine = Dates.jakartaLong(now, lang === `id` ? `id-ID` : `en-GB`)
    if (lang === `id`) {
      return [
        `Kamu Angie, asisten pribadi yang ramah dan ringkas di Telegram.`,
        `Bahasa: Bahasa Indonesia yang natural dan santai, bukan terjemahan kaku.`,
        `Hari/tanggal saat ini (Asia/Jakarta): ${dateLine}.`,
        `Gunakan tool yang tersedia bila pengguna bertanya soal email, jadwal/kalender, tugas, atau kontak — jangan mengarang data.`,
        `Bila sebuah layanan belum terhubung, katakan dengan jujur dan beri tahu cara mengaktifkannya, jangan mengarang isinya.`,
        `Jawaban singkat, langsung ke inti, tanpa markdown berat.`,
      ].join(`\n`)
    }
    return [
      `You are Angie, a friendly and concise personal assistant on Telegram.`,
      `Language: natural, relaxed English.`,
      `Current day/date (Asia/Jakarta): ${dateLine}.`,
      `Use the available tools when the user asks about email, schedule/calendar, tasks, or contacts — never invent data.`,
      `When a service is not connected, say so honestly and tell the user how to enable it; never invent its contents.`,
      `Keep answers short, to the point, and without heavy markdown.`,
    ].join(`\n`)
  }

  /** Run one tool on Angie's behalf; returns structured data for the AI/page. */
  static async runTool(
    db: Db,
    userId: number,
    name: string,
    args: Record<string, unknown>,
  ): Promise<IToolSection> {
    const token = AppConfig.load().googleAccessToken
    switch (name) {
      case `get_email`: {
        const result = await GoogleService.listUnreadEmails(token, {
          afterKey: typeof args.after === `string` && args.after ? args.after : Dates.todayKey(),
        })
        if (!result.connected) return {tool: `email`, connected: false, code: result.code, status: result.status, lines: []}
        return {
          tool: `email`,
          connected: true,
          lines: result.items.map((e) => `• ${e.subject} — ${e.from} (${e.date})`),
        }
      }
      case `get_calendar`: {
        const dateKey = typeof args.date === `string` && args.date ? args.date : Dates.todayKey()
        const result = await GoogleService.listEvents(token, dateKey)
        if (!result.connected) return {tool: `calendar`, connected: false, code: result.code, status: result.status, date: dateKey, lines: []}
        return {
          tool: `calendar`,
          connected: true,
          date: dateKey,
          lines: result.items.map((e) => `• ${e.start.slice(11, 16)} ${e.summary}${e.location ? ` @ ${e.location}` : ``}`),
        }
      }
      case `get_tasks`: {
        const tasks = db.tasks.list(userId)
        return {
          tool: `tasks`,
          connected: true,
          lines: tasks.map((t) => `${t.done ? `✅` : `⬜`} [${t.id}] ${t.title}`),
        }
      }
      case `get_contacts`: {
        const query = typeof args.query === `string` ? args.query : ``
        const contacts = db.contacts.search(userId, query)
        return {
          tool: `contacts`,
          connected: true,
          lines: contacts.map((c) => `• ${c.name}${c.email ? ` — ${c.email}` : ``}${c.phone ? ` — ${c.phone}` : ``}`),
        }
      }
      default:
        return {tool: name, connected: true, lines: [`(unknown tool: ${name})`]}
    }
  }

  /**
   * Render a tool section as MODEL input (live mode only). The user never
   * sees this text — the model paraphrases it — so it stays a compact
   * data token, not a localized sentence.
   */
  static formatForModel(section: IToolSection): string {
    if (!section.connected) {
      return section.code === `no-token`
        ? `(Google not connected: no access token set)`
        : `(Google API error${section.status ? ` ${section.status}` : ``})`
    }
    return section.lines.length > 0 ? section.lines.join(`\n`) : `(no results)`
  }

  /** Keywords -> tools, used by mock mode and as a first hint in live mode. */
  static pickTools(text: string): string[] {
    const lower = text.toLowerCase()
    const picked: string[] = []
    if (
      lower.includes(`email`) || lower.includes(`surat`) || lower.includes(`inbox`) ||
      lower.includes(`mail`)
    ) picked.push(`get_email`)
    if (
      lower.includes(`jadwal`) || lower.includes(`kalender`) || lower.includes(`acara`) ||
      lower.includes(`besok`) || lower.includes(`lusa`) || lower.includes(`agenda`) ||
      lower.includes(`meeting`) || lower.includes(`rapat`) || lower.includes(`schedule`) ||
      lower.includes(`calendar`) || lower.includes(`tomorrow`) || lower.includes(`event`)
    ) picked.push(`get_calendar`)
    if (
      lower.includes(`tugas`) || lower.includes(`todo`) || lower.includes(`to-do`) ||
      lower.includes(`pekerjaan`) || lower.includes(`task`) || lower.includes(`work`)
    ) picked.push(`get_tasks`)
    if (
      lower.includes(`kontak`) || lower.includes(`nomor`) || lower.includes(`telepon`) ||
      lower.includes(`emailnya`) || lower.includes(`contact`) || lower.includes(`phone`) ||
      lower.includes(`number`)
    ) picked.push(`get_contacts`)
    return picked
  }

  static async chat(db: Db, userId: number, text: string, lang: Lang = `en`, now = new Date()): Promise<IAngieReply> {
    const memory = db.memory.list(userId)
    // Read env fresh (not load-time cache) — see AppConfig.isMock.
    const apiKey = AppConfig.load().openaiApiKey
    const mock = AppConfig.isMock()

    const built = mock
      ? await AngieService.mockReply(db, userId, text, memory)
      : await AngieService.liveReply(db, userId, text, memory, apiKey, now, lang)
    const reply: IAngieReply = {...built, via: mock ? `mock` : `openai`}

    await db.memory.add(userId, {role: `user`, text, at: Date.now()})
    // Memory stores DATA for the model, not the localized sentence — the
    // sentence lives in the page template. The model reads this turn back
    // as context; the user never sees the stored text.
    await db.memory.add(userId, {role: `assistant`, text: AngieService.memoryText(reply), at: Date.now()})
    return reply
  }

  /** Data-only rendering of a reply for the persistent memory (model context). */
  static memoryText(reply: IAngieReply): string {
    switch (reply.kind) {
      case `live`: return reply.reply
      case `live-exhausted`: case `live-noanswer`: return `(no answer)`
      case `mock-echo`: return reply.text ?? ``
      case `mock-like-found`: return reply.liked ?? ``
      case `mock-like-none`: return `(no likes yet)`
      case `mock-tools-ok`: return reply.lines.join(`\n`)
      case `mock-tools-empty`: return `(no results)`
      case `mock-tools-noconnect`: return `(Google not connected)`
    }
  }

  private static async liveReply(
    db: Db,
    userId: number,
    text: string,
    memory: ITurn[],
    apiKey: string,
    now: Date,
    lang: Lang,
  ): Promise<Omit<IAngieReply, `via`>> {
    const messages: IChatMessage[] = [
      {role: `system`, content: AngieService.systemPrompt(now, lang)},
      ...memory.slice(-10).map((t): IChatMessage => ({role: t.role, content: t.text})),
      {role: `user`, content: text},
    ]
    const toolsUsed: string[] = []
    for (let round = 0; round < 3; round++) {
      const {message} = await OpenAIClient.chat(apiKey, `gpt-4o-mini`, messages, TOOLS)
      const calls = message.tool_calls ?? []
      if (calls.length === 0) {
        const reply = (message.content ?? ``).trim()
        return reply
          ? {kind: `live`, reply, lines: [], toolsUsed}
          : {kind: `live-noanswer`, reply: ``, lines: [], toolsUsed}
      }
      messages.push({role: `assistant`, content: message.content, tool_calls: calls})
      for (const call of calls) {
        toolsUsed.push(call.function.name)
        let args: Record<string, unknown> = {}
        try {
          args = JSON.parse(call.function.arguments) as Record<string, unknown>
        } catch {
          args = {}
        }
        const section = await AngieService.runTool(db, userId, call.function.name, args)
        messages.push({role: `tool`, content: AngieService.formatForModel(section), tool_call_id: call.id})
      }
    }
    return {kind: `live-exhausted`, reply: ``, lines: [], toolsUsed}
  }

  /** Deterministic structured replies without OpenAI — for tests and when no key is set. */
  private static async mockReply(
    db: Db,
    userId: number,
    text: string,
    memory: ITurn[],
  ): Promise<Omit<IAngieReply, `via`>> {
    const toolsUsed = AngieService.pickTools(text)

    // Memory: the user asks what they like / what they said.
    const likeMatch = /apa.*(suka|kesukaan|favorit)|what.*(like|love|favourite|favorite)/i.test(text)
    if (likeMatch) {
      const liked = memory
        .filter((t) => t.role === `user`)
        .map((t) => {
          const idMatch = t.text.match(/suka\s+([a-zA-Z\u00C0-\u024F ]+)/i)?.[1]?.trim()
          const enMatch = t.text.match(/(?:like|love)\s+([a-zA-Z ]+)/i)?.[1]?.trim()
          return idMatch ?? enMatch
        })
        .find((v) => v)
      if (liked) {
        return {kind: `mock-like-found`, reply: ``, liked, lines: [], toolsUsed}
      }
      return {kind: `mock-like-none`, reply: ``, lines: [], toolsUsed}
    }

    if (toolsUsed.length > 0) {
      const sections: IToolSection[] = []
      for (const tool of toolsUsed) {
        const args: Record<string, unknown> = {}
        if (tool === `get_calendar`) {
          args.date = Dates.parseDate(text) ?? Dates.todayKey()
        }
        if (tool === `get_contacts`) {
          const m = text.match(/kontak\s+(\S+)/i) ?? text.match(/contact\s+(\S+)/i) ?? text.match(/nomor\s+(\S+)/i) ?? text.match(/number\s+(\S+)/i)
          if (m?.[1]) args.query = m[1].replace(/[^\p{L}\p{N}]+$/u, ``)
        }
        sections.push(await AngieService.runTool(db, userId, tool, args))
      }
      const first = sections[0]!
      const label = first.tool as ToolName
      const lines = sections.flatMap((s) => s.lines)
      // One label (the first tool) + one body: when several tools are used
      // at once, only the lines that exist are shown — an empty tool's
      // sentence is dropped instead of shown next to real results.
      if (!first.connected) {
        return {kind: `mock-tools-noconnect`, reply: ``, label, code: first.code, status: first.status, lines: [], toolsUsed}
      }
      if (lines.length === 0) {
        return {kind: `mock-tools-empty`, reply: ``, label, date: first.date, lines: [], toolsUsed}
      }
      return {kind: `mock-tools-ok`, reply: ``, label, lines, toolsUsed}
    }
    const turns = memory.length + 1
    return {kind: `mock-echo`, reply: ``, text, turns, lines: [], toolsUsed}
  }
}
