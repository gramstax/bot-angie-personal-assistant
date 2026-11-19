import {PageBase} from "~/base/page"
import {GoogleService} from "~/lib/google"
import {AppConfig} from "~/lib/config"
import {I18n} from "~/lib/i18n"

/** /email — a summary of today's unread emails. */
export class EmailPage extends PageBase {
  static data = this.buildData()

  async handleCallbackQueryData() {
    await this.gdefault.show()
  }

  async handleCommandText() {
    await this.gdefault.show()
  }

  helper = {}

  gdefault = {
    show: async () => {
      const lang = this.lang()
      const token = AppConfig.load().googleAccessToken
      const result = await GoogleService.listUnreadEmails(token, {lang})
      let reply: string
      if (!result.connected) {
        reply = `✉️ ${result.reason}\n\n${I18n.t(lang, `emailNotConnectedNote`)}`
      } else if (result.items.length === 0) {
        reply = I18n.t(lang, `emailClean`)
      } else {
        const lines = result.items.map((e) => `• ${e.subject}\n  ${e.from} — ${e.date}`)
        reply = `${I18n.t(lang, `emailHeader`, {count: result.items.length})}\n${lines.join(`\n`)}`
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
