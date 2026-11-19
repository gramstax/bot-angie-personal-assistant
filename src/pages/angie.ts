import {PageBase} from "~/base/page"
import {AngieService, type AngieReplyKind} from "~/lib/angie"
import {AppConfig} from "~/lib/config"
import {TranscribePool} from "~/lib/transcribe-pool"

/**
 * AngiePage — the heart of the bot: any free text or voice note goes to Angie.
 *
 * - handleFreeText: free text (not a command) -> AngieService.chat.
 * - handleFreeVoice: voice note -> download the file -> TranscribePool
 *   (worker thread, Whisper) -> show a short transcript -> answer as Angie.
 *   Mock mode: the download is skipped, the worker returns a stub transcript.
 *
 * All words live in `static template` (EN default + `lang="id"` variant):
 * one flat `<g-switch value="kind">` with a case per reply kind; lists
 * render through `<g-map>`, the voice transcript prefix through
 * `<g-ifelse>`. The page only computes data (kind + template variables).
 * Strict rule (Damar 2026-11-19 ~14:43 WIB): no string dictionary.
 *
 * NOTE: angle brackets are never written inside `<g-ifelse>` bodies —
 * `&lt;` there would reach Telegram raw instead of decoded — so the two
 * tool empty-sentences are phrased without a `<...>` placeholder (the full
 * command format still shows in the /tambahtugas and /tambahkontak pages).
 */
export class AngiePage extends PageBase {
  static data = this.buildData()

  async handleFreeText() {
    const text = this.msg?.text ?? ``
    if (!text || text.startsWith(`/`)) return
    await this.gchat.process(text)
  }

  async handleFreeVoice() {
    const voice = this.msg?.voice
    if (!voice) return
    await this.gvoice.process(voice.file_id, voice.duration ?? 0)
  }

  helper = {
    typing: async () => {
      try {
        const chatId = this.chat?.id ?? this.from?.id
        if (chatId !== undefined) await this.api.sendChatAction(chatId, `typing`)
      } catch {
        // The typing indicator is cosmetic — the answer still goes through without it.
      }
    },
    /** Render one Angie reply through the template switch. */
    answer: async (data: {
      voiceText: string
      kind: AngieReplyKind | `error` | `voice-empty` | `voice-fail`
      reply?: string
      text?: string
      turns?: number
      liked?: string
      label?: string
      date?: string
      code?: string
      status?: number
      lines?: string[]
    }) => {
      await this.renderText({
        mode: `reply`,
        data: {
          voiceText: data.voiceText,
          kind: data.kind,
          reply: data.reply ?? ``,
          text: data.text ?? ``,
          turns: data.turns ?? 0,
          liked: data.liked ?? ``,
          label: data.label ?? ``,
          date: data.date ?? ``,
          code: data.code ?? ``,
          status: data.status ?? 0,
          lines: data.lines ?? [],
        },
      })
    },
  }

  gchat = {
    show: async () => {},
    process: async (text: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.helper.typing()
      try {
        const result = await AngieService.chat(this.db, userId, text, this.lang())
        await this.helper.answer({voiceText: ``, kind: result.kind, ...AngiePage.toTemplateData(result)})
      } catch (err) {
        await this.helper.answer({voiceText: ``, kind: `error`})
        throw err
      }
    },
  }

  gvoice = {
    show: async () => {},
    process: async (fileId: string, _duration: number) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.helper.typing()
      try {
        const mock = AppConfig.isMock()
        let audioBase64 = ``
        if (!mock) {
          audioBase64 = await AngiePage.downloadVoice(this, fileId)
        }
        const transcribed = await TranscribePool.transcribe(audioBase64, `voice.ogg`, mock)
        const text = transcribed.text.trim()
        if (!text) {
          await this.helper.answer({voiceText: ``, kind: `voice-empty`})
          return
        }
        const result = await AngieService.chat(this.db, userId, text, this.lang())
        await this.helper.answer({voiceText: text, kind: result.kind, ...AngiePage.toTemplateData(result)})
      } catch {
        await this.helper.answer({voiceText: ``, kind: `voice-fail`})
      }
    },
  }

  /** Map a service reply onto the template's data fields (data only, no words). */
  static toTemplateData(result: Awaited<ReturnType<typeof AngieService.chat>>) {
    return {
      reply: result.reply,
      text: result.text ?? ``,
      turns: result.turns ?? 0,
      liked: result.liked ?? ``,
      label: result.label ?? ``,
      date: result.date ?? ``,
      code: result.code ?? ``,
      status: result.status ?? 0,
      lines: result.lines,
    }
  }

  /** Download a Telegram voice note to base64. Live mode only. */
  static async downloadVoice(page: AngiePage, fileId: string): Promise<string> {
    const token = process.env.BOT_TOKEN ?? ``
    if (!token) throw new Error(`BOT_TOKEN is not set`)
    const file = await page.api.getFile(fileId)
    const path = file.file_path
    if (!path) throw new Error(`Telegram did not return a file_path`)
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${path}`)
    if (!res.ok) throw new Error(`Voice download failed: HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.toString(`base64`)
  }

  static template = `
    <g-base>
      <g-message>
        <g-ifelse>voiceText ? '🎙️ You said: "' + voiceText + '"\\n\\n' : ''</g-ifelse><g-switch value="kind">
          <g-case is="live">{{reply}}</g-case>
          <g-case is="live-exhausted">I checked the data, but I ran out of steps to summarize it. Please ask again, more specifically.</g-case>
          <g-case is="live-noanswer">Sorry, I cannot answer that right now.</g-case>
          <g-case is="mock-echo">Noted. You said: "{{text}}". We have exchanged {{turns}} messages — anything else I can help with?</g-case>
          <g-case is="mock-like-found">You like {{liked}} — that is what you told me earlier.</g-case>
          <g-case is="mock-like-none">You have not told me about your likes yet. Tell me, and I will remember it.</g-case>
          <g-case is="mock-tools-ok"><g-ifelse>label === 'email' ? 'Here is a summary of your email:' : label === 'calendar' ? 'Here is the schedule I found:' : label === 'tasks' ? 'Here is your task list:' : 'Here are the contacts I found:'</g-ifelse>
<g-map src="lines" join="\\n">{{e}}</g-map></g-case>
          <g-case is="mock-tools-empty"><g-ifelse>label === 'email' ? 'Here is a summary of your email:' : label === 'calendar' ? 'Here is the schedule I found:' : label === 'tasks' ? 'Here is your task list:' : 'Here are the contacts I found:'</g-ifelse>
<g-ifelse>label === 'email' ? 'No unread emails today.' : label === 'calendar' ? 'No events on ' + date + '.' : label === 'tasks' ? 'No tasks yet. Add one with /tambahtugas.' : 'No contacts yet. Add one with /tambahkontak.'</g-ifelse></g-case>
          <g-case is="mock-tools-noconnect"><g-ifelse>label === 'email' ? 'Here is a summary of your email:' : label === 'calendar' ? 'Here is the schedule I found:' : label === 'tasks' ? 'Here is your task list:' : 'Here are the contacts I found:'</g-ifelse>
<g-ifelse>code === 'gmail-error' ? 'Gmail error ' + status + ' — the token may have expired' : code === 'calendar-error' ? 'Google Calendar error ' + status + ' — the token may have expired' : 'Google is not connected — set GOOGLE_ACCESS_TOKEN in .env'</g-ifelse></g-case>
          <g-case is="voice-empty">Sorry, I could not hear anything in that voice note. Please send it again or just type your message.</g-case>
          <g-case is="voice-fail">Sorry, transcribing that voice note failed. Please send it again or just type your message.</g-case>
          <g-default>Sorry, something went wrong while I was processing your message. Please try again in a moment.</g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-ifelse>voiceText ? '🎙️ Kamu bilang: "' + voiceText + '"\\n\\n' : ''</g-ifelse><g-switch value="kind">
          <g-case is="live">{{reply}}</g-case>
          <g-case is="live-exhausted">Sudah kuperiksa datanya, tapi aku kehabisan langkah untuk merangkumnya. Coba tanya lagi dengan lebih spesifik ya.</g-case>
          <g-case is="live-noanswer">Maaf, aku tidak bisa menjawab itu sekarang.</g-case>
          <g-case is="mock-echo">Baik, dicatat. Kamu bilang: "{{text}}". Kita sudah ngobrol {{turns}} pesan — ada lagi yang bisa kubantu?</g-case>
          <g-case is="mock-like-found">Kamu suka {{liked}} — itu yang kamu bilang sebelumnya.</g-case>
          <g-case is="mock-like-none">Kamu belum pernah cerita soal kesukaanmu ke aku. Coba ceritakan, nanti kuingat.</g-case>
          <g-case is="mock-tools-ok"><g-ifelse>label === 'email' ? 'Ini ringkasan emailmu:' : label === 'calendar' ? 'Ini jadwalku yang kutemukan:' : label === 'tasks' ? 'Ini daftar tugasmu:' : 'Ini kontak yang kutemukan:'</g-ifelse>
<g-map src="lines" join="\\n">{{e}}</g-map></g-case>
          <g-case is="mock-tools-empty"><g-ifelse>label === 'email' ? 'Ini ringkasan emailmu:' : label === 'calendar' ? 'Ini jadwalku yang kutemukan:' : label === 'tasks' ? 'Ini daftar tugasmu:' : 'Ini kontak yang kutemukan:'</g-ifelse>
<g-ifelse>label === 'email' ? 'Tidak ada email unread hari ini.' : label === 'calendar' ? 'Tidak ada acara pada ' + date + '.' : label === 'tasks' ? 'Belum ada tugas. Tambah dengan /tambahtugas.' : 'Belum ada kontak. Tambah dengan /tambahkontak.'</g-ifelse></g-case>
          <g-case is="mock-tools-noconnect"><g-ifelse>label === 'email' ? 'Ini ringkasan emailmu:' : label === 'calendar' ? 'Ini jadwalku yang kutemukan:' : label === 'tasks' ? 'Ini daftar tugasmu:' : 'Ini kontak yang kutemukan:'</g-ifelse>
<g-ifelse>code === 'gmail-error' ? 'Gmail error ' + status + ' — token mungkin kedaluwarsa' : code === 'calendar-error' ? 'Google Calendar error ' + status + ' — token mungkin kedaluwarsa' : 'Google belum terhubung — isi GOOGLE_ACCESS_TOKEN di .env'</g-ifelse></g-case>
          <g-case is="voice-empty">Maaf, aku tidak bisa mendengar isi voice note itu. Coba kirim lagi atau ketik saja pesannya.</g-case>
          <g-case is="voice-fail">Maaf, transkripsi voice note gagal. Coba kirim lagi atau ketik saja pesannya.</g-case>
          <g-default>Maaf, ada yang salah saat aku memproses pesanmu. Coba lagi sebentar lagi ya.</g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
