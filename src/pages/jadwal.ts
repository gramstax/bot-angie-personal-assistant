import {PageBase} from "~/base/page"
import {Dates} from "~/lib/dates"
import {GoogleService} from "~/lib/google"
import {AppConfig} from "~/lib/config"

/** /jadwal [tanggal] — acara Google Calendar pada satu tanggal (pengganti node Get Calendar di n8n). */
export class JadwalPage extends PageBase {
  static data = this.buildData()

  async handleCallbackQueryData() {
    await this.gdefault.show()
  }

  async handleCommandText() {
    await this.gdefault.show()
  }

  async handleCommandArgsText() {
    await this.gdefault.show(this.msgTextCommandArgs.join(` `))
  }

  helper = {}

  gdefault = {
    show: async (raw?: string) => {
      const dateKey = (raw ? Dates.parseIndonesianDate(raw) : undefined) ?? Dates.todayKey()
      const label = raw ? dateKey : `hari ini (${dateKey})`
      const token = AppConfig.load().googleAccessToken
      const result = await GoogleService.listEvents(token, dateKey)
      let reply: string
      if (!result.connected) {
        reply = `📅 ${result.reason}\n\nTanpa token itu aku tidak bisa membaca kalendermu — dan aku tidak akan mengarang acaranya.`
      } else if (result.items.length === 0) {
        reply = `📅 Tidak ada acara pada ${label}. Harimu kosong, silakan dinikmati.`
      } else {
        const lines = result.items.map((e) => `• ${e.start.slice(11, 16)}–${e.end.slice(11, 16)} ${e.summary}${e.location ? ` @ ${e.location}` : ``}`)
        reply = `📅 Jadwal ${label} (${result.items.length} acara):\n${lines.join(`\n`)}`
      }
      await this.renderText({data: {reply}})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
