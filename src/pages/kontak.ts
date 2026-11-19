import {PageBase} from "~/base/page"
import {I18n} from "~/lib/i18n"

/** /contact (EN) / /kontak (ID) [name] — search/list contacts from LMDB. */
export class KontakPage extends PageBase {
  static data = this.buildData({intentCommandText: {default: `contact`, id: `kontak`}})

  async handleCallbackQueryData() {
    await this.gdefault.show()
  }

  async handleCommandText() {
    await this.gdefault.show()
  }

  async handleCommandArgsText() {
    await this.gdefault.show(this.msgTextCommandArgs.join(` `))
  }

  helper = {
    format: (userId: number, query?: string): string => {
      const lang = this.lang()
      const contacts = this.db.contacts.search(userId, query ?? ``)
      if (contacts.length === 0) {
        return query
          ? I18n.t(lang, `kontakNoMatch`, {query})
          : I18n.t(lang, `kontakEmpty`)
      }
      const lines = contacts.map(
        (c) => `👤 ${c.name}${c.email ? `\n   ✉️ ${c.email}` : ``}${c.phone ? `\n   📞 ${c.phone}` : ``}${c.note ? `\n   📝 ${c.note}` : ``}`,
      )
      const header = query
        ? I18n.t(lang, `kontakHeaderQuery`, {query, count: contacts.length})
        : I18n.t(lang, `kontakHeader`, {count: contacts.length})
      return `${header}\n${lines.join(`\n`)}`
    },
  }

  gdefault = {
    show: async (query?: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.renderText({data: {reply: this.helper.format(userId, query)}})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
