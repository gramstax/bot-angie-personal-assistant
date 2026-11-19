import {PageBase} from "~/base/page"
import {GoogleService} from "~/lib/google"
import {AppConfig} from "~/lib/config"

/** /email — ringkasan email unread hari ini (pengganti node Get Email / Gmail di n8n). */
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
      const token = AppConfig.load().googleAccessToken
      const result = await GoogleService.listUnreadEmails(token)
      let reply: string
      if (!result.connected) {
        reply = `✉️ ${result.reason}\n\nTanpa token itu aku tidak bisa membaca emailmu — dan aku tidak akan mengarang isinya.`
      } else if (result.items.length === 0) {
        reply = `✉️ Inbox bersih — tidak ada email unread hari ini.`
      } else {
        const lines = result.items.map((e) => `• ${e.subject}\n  ${e.from} — ${e.date}`)
        reply = `✉️ Email unread hari ini (${result.items.length}):\n${lines.join(`\n`)}`
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
