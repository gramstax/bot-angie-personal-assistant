import {PageBase} from "~/base/page"
import {AngieService} from "~/lib/angie"
import {AppConfig} from "~/lib/config"
import {TranscribePool} from "~/lib/transcribe-pool"

/**
 * AngiePage — jantung bot: teks bebas & voice note apa pun masuk ke Angie.
 * Ini padanan "AI Agent (Angie)" + "Window Buffer Memory" di n8n workflow
 * 2462: trigger Telegram -> IF voice/text -> STT -> AI Agent -> balasan.
 *
 * - handleFreeText: teks bebas (bukan command) -> AngieService.chat.
 * - handleFreeVoice: voice note -> unduh file -> TranscribePool (worker
 *   thread, Whisper) -> tampilkan transkripsi singkat -> jawab sebagai Angie.
 *   Mode mock: unduhan dilewati, worker mengembalikan transkripsi stub.
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
        // Indikator typing itu kosmetik — jawaban tetap jalan tanpanya.
      }
    },
    answer: async (reply: string) => {
      await this.renderText({mode: `reply`, data: {reply}})
    },
  }

  gchat = {
    show: async () => {},
    process: async (text: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.helper.typing()
      try {
        const {reply} = await AngieService.chat(this.db, userId, text)
        await this.helper.answer(reply)
      } catch (err) {
        await this.helper.answer(`Maaf, ada yang salah saat aku memproses pesanmu. Coba lagi sebentar lagi ya.`)
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
          await this.helper.answer(`Maaf, aku tidak bisa mendengar isi voice note itu. Coba kirim lagi atau ketik saja pesannya.`)
          return
        }
        const {reply} = await AngieService.chat(this.db, userId, text)
        await this.helper.answer(`🎙️ Kamu bilang: "${text}"\n\n${reply}`)
      } catch {
        await this.helper.answer(`Maaf, transkripsi voice note gagal. Coba kirim lagi atau ketik saja pesannya.`)
      }
    },
  }

  /** Unduh voice note Telegram ke base64. Hanya dipakai mode live. */
  static async downloadVoice(page: AngiePage, fileId: string): Promise<string> {
    const token = process.env.BOT_TOKEN ?? ``
    if (!token) throw new Error(`BOT_TOKEN belum diisi`)
    const file = await page.api.getFile(fileId)
    const path = file.file_path
    if (!path) throw new Error(`Telegram tidak mengembalikan file_path`)
    const res = await fetch(`https://api.telegram.org/file/bot${token}/${path}`)
    if (!res.ok) throw new Error(`Unduh voice gagal: HTTP ${res.status}`)
    const buf = Buffer.from(await res.arrayBuffer())
    return buf.toString(`base64`)
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
