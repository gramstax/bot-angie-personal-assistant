import {PageBase} from "~/base/page"
import {AngieService} from "~/lib/angie"
import {AppConfig} from "~/lib/config"
import {I18n} from "~/lib/i18n"
import {TranscribePool} from "~/lib/transcribe-pool"

/**
 * AngiePage — the heart of the bot: any free text or voice note goes to Angie.
 *
 * - handleFreeText: free text (not a command) -> AngieService.chat.
 * - handleFreeVoice: voice note -> download the file -> TranscribePool
 *   (worker thread, Whisper) -> show a short transcript -> answer as Angie.
 *   Mock mode: the download is skipped, the worker returns a stub transcript.
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
    answer: async (reply: string) => {
      await this.renderText({mode: `reply`, data: {reply}})
    },
  }

  gchat = {
    show: async () => {},
    process: async (text: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const lang = this.lang()
      await this.helper.typing()
      try {
        const {reply} = await AngieService.chat(this.db, userId, text, lang)
        await this.helper.answer(reply)
      } catch (err) {
        await this.helper.answer(I18n.t(lang, `angieError`))
        throw err
      }
    },
  }

  gvoice = {
    show: async () => {},
    process: async (fileId: string, _duration: number) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const lang = this.lang()
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
          await this.helper.answer(I18n.t(lang, `angieVoiceEmpty`))
          return
        }
        const {reply} = await AngieService.chat(this.db, userId, text, lang)
        await this.helper.answer(`${I18n.t(lang, `angieVoicePrefix`, {text})}\n\n${reply}`)
      } catch {
        await this.helper.answer(I18n.t(lang, `angieVoiceFail`))
      }
    },
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
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
