import type {Db} from "~/db"
import {AppConfig} from "~/lib/config"
import {Dates} from "~/lib/dates"
import {GoogleService} from "~/lib/google"
import {OpenAIClient, type IChatMessage, type IChatTool} from "~/lib/openai"
import type {ITurn} from "~/types/angie"

export interface IAngieReply {
  reply: string
  /** Nama tool yang dipakai pada turn ini (kosong bila tidak ada). */
  toolsUsed: string[]
  /** `openai` = live GPT-4o-mini, `mock` = mode ANGIE_MOCK_AI / tanpa kunci. */
  via: `openai` | `mock`
}

const TOOLS: IChatTool[] = [
  {
    type: `function`,
    function: {
      name: `get_email`,
      description: `Ambil email unread di inbox (bukan promo), difilter tanggal.`,
      parameters: {
        type: `object`,
        properties: {after: {type: `string`, description: `Tanggal mulai YYYY-MM-DD, default hari ini`}},
      },
    },
  },
  {
    type: `function`,
    function: {
      name: `get_calendar`,
      description: `Ambil acara Google Calendar pada satu tanggal.`,
      parameters: {
        type: `object`,
        properties: {date: {type: `string`, description: `Tanggal YYYY-MM-DD, default hari ini`}},
      },
    },
  },
  {
    type: `function`,
    function: {
      name: `get_tasks`,
      description: `Ambil daftar tugas pengguna dari database.`,
      parameters: {type: `object`, properties: {}},
    },
  },
  {
    type: `function`,
    function: {
      name: `get_contacts`,
      description: `Cari kontak pengguna berdasarkan nama/email/telepon.`,
      parameters: {
        type: `object`,
        properties: {query: {type: `string`, description: `Kata kunci pencarian, kosong = semua kontak`}},
      },
    },
  },
]

/**
 * Angie — inti percakapan. Alur ini adalah n8n workflow 2462 tanpa n8n:
 * teks/voice -> memori window buffer (LMDB, persisten) -> AI Agent
 * GPT-4o-mini + 4 tool (email, kalender, tugas, kontak) -> jawaban.
 *
 * Mode mock (ANGIE_MOCK_AI=1 atau OPENAI_API_KEY kosong): TIDAK ada
 * panggilan OpenAI — balasan deterministik dari data LMDB + memori, supaya
 * e2e bisa membuktikan alur tanpa kunci. Tool Google tetap dipanggil apa
 * adanya: tanpa GOOGLE_ACCESS_TOKEN ia menjawab "belum terhubung", bukan
 * data palsu.
 */
export class AngieService {
  static systemPrompt(now = new Date()): string {
    return [
      `Kamu Angie, asisten pribadi yang ramah dan ringkas di Telegram.`,
      `Bahasa: Bahasa Indonesia yang natural dan santai, bukan terjemahan kaku.`,
      `Hari/tanggal saat ini (Asia/Jakarta): ${Dates.jakartaLong(now)}.`,
      `Gunakan tool yang tersedia bila pengguna bertanya soal email, jadwal/kalender, tugas, atau kontak — jangan mengarang data.`,
      `Bila sebuah layanan belum terhubung, katakan dengan jujur dan beri tahu cara mengaktifkannya, jangan mengarang isinya.`,
      `Jawaban singkat, langsung ke inti, tanpa markdown berat.`,
    ].join(`\n`)
  }

  /** Jalankan satu tool atas nama Angie; mengembalikan teks hasil untuk AI/pengguna. */
  static async runTool(db: Db, userId: number, name: string, args: Record<string, unknown>): Promise<string> {
    const token = AppConfig.load().googleAccessToken
    switch (name) {
      case `get_email`: {
        const result = await GoogleService.listUnreadEmails(token, {
          afterKey: typeof args.after === `string` && args.after ? args.after : Dates.todayKey(),
        })
        if (!result.connected) return result.reason
        if (result.items.length === 0) return `Tidak ada email unread hari ini.`
        return result.items.map((e) => `• ${e.subject} — ${e.from} (${e.date})`).join(`\n`)
      }
      case `get_calendar`: {
        const dateKey = typeof args.date === `string` && args.date ? args.date : Dates.todayKey()
        const result = await GoogleService.listEvents(token, dateKey)
        if (!result.connected) return result.reason
        if (result.items.length === 0) return `Tidak ada acara pada ${dateKey}.`
        return result.items.map((e) => `• ${e.start.slice(11, 16)} ${e.summary}${e.location ? ` @ ${e.location}` : ``}`).join(`\n`)
      }
      case `get_tasks`: {
        const tasks = db.tasks.list(userId)
        if (tasks.length === 0) return `Belum ada tugas. Tambah dengan /tambahtugas <teks>.`
        return tasks
          .map((t) => `${t.done ? `✅` : `⬜`} [${t.id}] ${t.title}`)
          .join(`\n`)
      }
      case `get_contacts`: {
        const query = typeof args.query === `string` ? args.query : ``
        const contacts = db.contacts.search(userId, query)
        if (contacts.length === 0) return query ? `Tidak ada kontak yang cocok dengan "${query}".` : `Belum ada kontak. Tambah dengan /tambahkontak <nama> | <email> | <telepon>.`
        return contacts
          .map((c) => `• ${c.name}${c.email ? ` — ${c.email}` : ``}${c.phone ? ` — ${c.phone}` : ``}`)
          .join(`\n`)
      }
      default:
        return `Tool tidak dikenal: ${name}`
    }
  }

  /** Kata kunci -> tool, dipakai mode mock dan sebagai petunjuk awal mode live. */
  static pickTools(text: string): string[] {
    const lower = text.toLowerCase()
    const picked: string[] = []
    if (lower.includes(`email`) || lower.includes(`surat`) || lower.includes(`inbox`)) picked.push(`get_email`)
    if (
      lower.includes(`jadwal`) || lower.includes(`kalender`) || lower.includes(`acara`) ||
      lower.includes(`besok`) || lower.includes(`lusa`) || lower.includes(`agenda`) ||
      lower.includes(`meeting`) || lower.includes(`rapat`)
    ) picked.push(`get_calendar`)
    if (lower.includes(`tugas`) || lower.includes(`todo`) || lower.includes(`to-do`) || lower.includes(`pekerjaan`)) picked.push(`get_tasks`)
    if (lower.includes(`kontak`) || lower.includes(`nomor`) || lower.includes(`telepon`) || lower.includes(`emailnya`)) picked.push(`get_contacts`)
    return picked
  }

  static async chat(db: Db, userId: number, text: string, now = new Date()): Promise<IAngieReply> {
    const memory = db.memory.list(userId)
    // Baca env segar (bukan cache load-time) — lihat AppConfig.isMock.
    const apiKey = AppConfig.load().openaiApiKey
    const mock = AppConfig.isMock()
    let reply: string
    let toolsUsed: string[] = []

    if (mock) {
      const built = await AngieService.mockReply(db, userId, text, memory)
      reply = built.reply
      toolsUsed = built.toolsUsed
    } else {
      const built = await AngieService.liveReply(db, userId, text, memory, apiKey, now)
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
  ): Promise<{reply: string; toolsUsed: string[]}> {
    const messages: IChatMessage[] = [
      {role: `system`, content: AngieService.systemPrompt(now)},
      ...memory.slice(-10).map((t): IChatMessage => ({role: t.role, content: t.text})),
      {role: `user`, content: text},
    ]
    const toolsUsed: string[] = []
    for (let round = 0; round < 3; round++) {
      const {message} = await OpenAIClient.chat(apiKey, `gpt-4o-mini`, messages, TOOLS)
      const calls = message.tool_calls ?? []
      if (calls.length === 0) {
        return {reply: (message.content ?? ``).trim() || `Maaf, aku tidak bisa menjawab itu sekarang.`, toolsUsed}
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
        const result = await AngieService.runTool(db, userId, call.function.name, args)
        messages.push({role: `tool`, content: result, tool_call_id: call.id})
      }
    }
    return {reply: `Sudah kuperiksa datanya, tapi aku kehabisan langkah untuk merangkumnya. Coba tanya lagi dengan lebih spesifik ya.`, toolsUsed}
  }

  /** Balasan deterministik tanpa OpenAI — untuk tes dan saat kunci belum diisi. */
  private static async mockReply(
    db: Db,
    userId: number,
    text: string,
    memory: ITurn[],
  ): Promise<{reply: string; toolsUsed: string[]}> {
    const toolsUsed = AngieService.pickTools(text)
    const parts: string[] = []

    // Ingatan: pengguna bertanya apa yang ia sukai / apa yang ia katakan.
    const likeMatch = text.match(/apa.*(suka|kesukaan|favorit)/i)
    if (likeMatch) {
      const liked = memory
        .filter((t) => t.role === `user`)
        .map((t) => t.text.match(/suka\s+([a-zA-Z\u00C0-\u024F ]+)/i)?.[1]?.trim())
        .find((v) => v)
      if (liked) {
        return {reply: `Kamu suka ${liked} — itu yang kamu bilang sebelumnya.`, toolsUsed}
      }
      return {reply: `Kamu belum pernah cerita soal kesukaanmu ke aku. Coba ceritakan, nanti kuingat.`, toolsUsed}
    }

    for (const tool of toolsUsed) {
      const args: Record<string, unknown> = {}
      if (tool === `get_calendar`) {
        const dateKey = Dates.parseIndonesianDate(text) ?? Dates.todayKey()
        args.date = dateKey
      }
      if (tool === `get_contacts`) {
        const m = text.match(/kontak\s+(\S+)/i) ?? text.match(/nomor\s+(\S+)/i)
        if (m?.[1]) args.query = m[1].replace(/[^\p{L}\p{N}]+$/u, ``)
      }
      const result = await AngieService.runTool(db, userId, tool, args)
      parts.push(result)
    }
    if (parts.length > 0) {
      const label =
        toolsUsed.includes(`get_email`) ? `Ini ringkasan emailmu:` :
        toolsUsed.includes(`get_calendar`) ? `Ini jadwalku yang kutemukan:` :
        toolsUsed.includes(`get_tasks`) ? `Ini daftar tugasmu:` :
        `Ini kontak yang kutemukan:`
      return {reply: `${label}\n${parts.join(`\n`)}`, toolsUsed}
    }
    const turns = memory.length + 1
    return {
      reply: `Baik, dicatat. Kamu bilang: "${text}". Kita sudah ngobrol ${turns} pesan — ada lagi yang bisa kubantu?`,
      toolsUsed,
    }
  }
}
