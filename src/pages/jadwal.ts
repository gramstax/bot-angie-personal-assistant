import {PageBase} from "~/base/page"
import {Dates} from "~/lib/dates"
import {GoogleService} from "~/lib/google"
import {AppConfig} from "~/lib/config"
import {I18n} from "~/lib/i18n"

/** /schedule (EN) / /jadwal (ID) [date] — Google Calendar events for one date. */
export class JadwalPage extends PageBase {
  static data = this.buildData({intentCommandText: {default: `schedule`, id: `jadwal`}})

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
      const lang = this.lang()
      const dateKey = (raw ? Dates.parseDate(raw) : undefined) ?? Dates.todayKey()
      const label = raw ? dateKey : `${I18n.t(lang, `jadwalToday`)} (${dateKey})`
      const token = AppConfig.load().googleAccessToken
      const result = await GoogleService.listEvents(token, dateKey, lang)
      let reply: string
      if (!result.connected) {
        reply = `📅 ${result.reason}\n\n${I18n.t(lang, `jadwalNotConnectedNote`)}`
      } else if (result.items.length === 0) {
        reply = I18n.t(lang, `jadwalNoEvents`, {label})
      } else {
        const lines = result.items.map((e) => `• ${e.start.slice(11, 16)}–${e.end.slice(11, 16)} ${e.summary}${e.location ? ` @ ${e.location}` : ``}`)
        reply = `${I18n.t(lang, `jadwalHeader`, {label, count: result.items.length})}\n${lines.join(`\n`)}`
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
