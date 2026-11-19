import {PageBase} from "~/base/page"
import {I18n} from "~/lib/i18n"

/** /tambahkontak <name> | <email> | <phone> — add one contact to LMDB. */
export class TambahKontakPage extends PageBase {
  static data = this.buildData()

  async handleCommandText() {
    await this.gdefault.show()
  }

  async handleCommandArgsText() {
    await this.gdefault.process(this.msgTextCommandArgs.join(` `))
  }

  helper = {}

  gdefault = {
    show: async () => {
      await this.renderText({data: {reply: I18n.t(this.lang(), `addContactPrompt`)}})
    },
    process: async (raw: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const lang = this.lang()
      const parts = raw.split(`|`).map((p) => p.trim())
      const name = parts[0] ?? ``
      const result = await this.db.contacts.add(userId, {
        name,
        email: parts[1] || undefined,
        phone: parts[2] || undefined,
      })
      if (!result.ok) {
        const reply = result.reason === `full`
          ? I18n.t(lang, `addContactFull`)
          : I18n.t(lang, `addContactNoName`)
        await this.renderText({data: {reply}})
        return
      }
      const c = result.contact
      const extra = `${c.email ? ` — ${c.email}` : ``}${c.phone ? ` — ${c.phone}` : ``}`
      await this.renderText({data: {reply: I18n.t(lang, `addContactSaved`, {name: c.name, extra})}})
    },
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
