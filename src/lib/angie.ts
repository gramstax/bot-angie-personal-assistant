import type {Db} from "~/db"
import {AppConfig} from "~/lib/config"
import {Dates} from "~/lib/dates"
import {GoogleService} from "~/lib/google"
import {I18n, type Lang} from "~/lib/i18n"
import {OpenAIClient, type IChatMessage, type IChatTool} from "~/lib/openai"
import type {ITurn} from "~/types/angie"

export interface IAngieReply {
  reply: string
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
 * deterministic replies from LMDB data + memory, so e2e can prove the flow
 * without keys. Google tools are still called as-is: without a
 * GOOGLE_ACCESS_TOKEN they answer "not connected", never fake data.
 */
export class AngieService {
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

  /** Run one tool on Angie's behalf; returns the result text for the AI/user. */
  static async runTool(
    db: Db,
    userId: number,
    name: string,
    args: Record<string, unknown>,
    lang: Lang = `en`,
  ): Promise<string> {
    const token = AppConfig.load().googleAccessToken
    switch (name) {
      case `get_email`: {
        const result = await GoogleService.listUnreadEmails(token, {
          afterKey: typeof args.after === `string` && args.after ? args.after : Dates.todayKey(),
          lang,
        })
        if (!result.connected) return result.reason
        if (result.items.length === 0) return I18n.t(lang, `toolNoEmail`)
        return result.items.map((e) => `• ${e.subject} — ${e.from} (${e.date})`).join(`\n`)
      }
      case `get_calendar`: {
        const dateKey = typeof args.date === `string` && args.date ? args.date : Dates.todayKey()
        const result = await GoogleService.listEvents(token, dateKey, lang)
        if (!result.connected) return result.reason
        if (result.items.length === 0) return I18n.t(lang, `toolNoEvents`, {date: dateKey})
        return result.items.map((e) => `• ${e.start.slice(11, 16)} ${e.summary}${e.location ? ` @ ${e.location}` : ``}`).join(`\n`)
      }
      case `get_tasks`: {
        const tasks = db.tasks.list(userId)
        if (tasks.length === 0) return I18n.t(lang, `toolNoTasks`)
        return tasks
          .map((t) => `${t.done ? `✅` : `⬜`} [${t.id}] ${t.title}`)
          .join(`\n`)
      }
      case `get_contacts`: {
        const query = typeof args.query === `string` ? args.query : ``
        const contacts = db.contacts.search(userId, query)
        if (contacts.length === 0) return query ? I18n.t(lang, `toolNoContactsQuery`, {query}) : I18n.t(lang, `toolNoContacts`)
        return contacts
          .map((c) => `• ${c.name}${c.email ? ` — ${c.email}` : ``}${c.phone ? ` — ${c.phone}` : ``}`)
          .join(`\n`)
      }
      default:
        return I18n.t(lang, `toolUnknown`, {name})
    }
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
    let reply: string
    let toolsUsed: string[] = []

    if (mock) {
      const built = await AngieService.mockReply(db, userId, text, memory, lang)
      reply = built.reply
      toolsUsed = built.toolsUsed
    } else {
      const built = await AngieService.liveReply(db, userId, text, memory, apiKey, now, lang)
      reply = built.reply
      toolsUsed = built.toolsUsed
    }

    await db.memory.add(userId, {role: `user`, text, at: Date.now()})
    await db.memory.add(userId, {role: `assistant`, text: reply, at: Date.now()})
    return {reply, toolsUsed, via: mock ? `mock` : `openai`}
  }

  private static async liveReply(
    db: Db,
    userId: number,
    text: string,
    memory: ITurn[],
    apiKey: string,
    now: Date,
    lang: Lang,
  ): Promise<{reply: string; toolsUsed: string[]}> {
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
        return {reply: (message.content ?? ``).trim() || I18n.t(lang, `angieNoAnswer`), toolsUsed}
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
        const result = await AngieService.runTool(db, userId, call.function.name, args, lang)
        messages.push({role: `tool`, content: result, tool_call_id: call.id})
      }
    }
    return {reply: I18n.t(lang, `angieExhausted`), toolsUsed}
  }

  /** Deterministic replies without OpenAI — for tests and when no key is set. */
  private static async mockReply(
    db: Db,
    userId: number,
    text: string,
    memory: ITurn[],
    lang: Lang,
  ): Promise<{reply: string; toolsUsed: string[]}> {
    const toolsUsed = AngieService.pickTools(text)
    const parts: string[] = []

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
        return {reply: I18n.t(lang, `mockLikeFound`, {liked}), toolsUsed}
      }
      return {reply: I18n.t(lang, `mockLikeNone`), toolsUsed}
    }

    for (const tool of toolsUsed) {
      const args: Record<string, unknown> = {}
      if (tool === `get_calendar`) {
        const dateKey = Dates.parseDate(text) ?? Dates.todayKey()
        args.date = dateKey
      }
      if (tool === `get_contacts`) {
        const m = text.match(/kontak\s+(\S+)/i) ?? text.match(/contact\s+(\S+)/i) ?? text.match(/nomor\s+(\S+)/i) ?? text.match(/number\s+(\S+)/i)
        if (m?.[1]) args.query = m[1].replace(/[^\p{L}\p{N}]+$/u, ``)
      }
      const result = await AngieService.runTool(db, userId, tool, args, lang)
      parts.push(result)
    }
    if (parts.length > 0) {
      const label =
        toolsUsed.includes(`get_email`) ? I18n.t(lang, `mockLabelEmail`) :
        toolsUsed.includes(`get_calendar`) ? I18n.t(lang, `mockLabelCalendar`) :
        toolsUsed.includes(`get_tasks`) ? I18n.t(lang, `mockLabelTasks`) :
        I18n.t(lang, `mockLabelContacts`)
      return {reply: `${label}\n${parts.join(`\n`)}`, toolsUsed}
    }
    const turns = memory.length + 1
    return {
      reply: I18n.t(lang, `mockEcho`, {text, turns}),
      toolsUsed,
    }
  }
}
