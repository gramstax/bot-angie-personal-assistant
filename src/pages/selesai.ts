import {PageBase} from "~/base/page"
import {I18n} from "~/lib/i18n"

/** /selesai <id> — mark one task done in LMDB. */
export class SelesaiPage extends PageBase {
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
      await this.renderText({data: {reply: I18n.t(this.lang(), `donePrompt`)}})
    },
    process: async (raw: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const lang = this.lang()
      const id = Number(raw.trim())
      if (!Number.isInteger(id) || id <= 0) {
        await this.renderText({data: {reply: I18n.t(lang, `doneInvalid`, {raw})}})
        return
      }
      const result = await this.db.tasks.complete(userId, id)
      const reply =
        result === `ok`
          ? I18n.t(lang, `doneOk`, {id})
          : result === `already-done`
            ? I18n.t(lang, `doneAlready`, {id})
            : I18n.t(lang, `doneNotFound`, {id})
      await this.renderText({data: {reply}})
    },
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
