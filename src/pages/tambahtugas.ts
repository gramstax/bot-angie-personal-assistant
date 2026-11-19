import {PageBase} from "~/base/page"
import {I18n} from "~/lib/i18n"

/** /addtask (EN) / /tambahtugas (ID) <text> — add one task to LMDB. */
export class TambahTugasPage extends PageBase {
  static data = this.buildData({intentCommandText: {default: `addtask`, id: `tambahtugas`}})

  async handleCommandText() {
    await this.gdefault.show()
  }

  async handleCommandArgsText() {
    await this.gdefault.process(this.msgTextCommandArgs.join(` `))
  }

  helper = {}

  gdefault = {
    show: async () => {
      await this.renderText({data: {reply: I18n.t(this.lang(), `addTaskPrompt`)}})
    },
    process: async (title: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const lang = this.lang()
      const result = await this.db.tasks.add(userId, title)
      if (!result.ok) {
        const reply = result.reason === `full`
          ? I18n.t(lang, `addTaskFull`)
          : I18n.t(lang, `addTaskPrompt`)
        await this.renderText({data: {reply}})
        return
      }
      await this.renderText({data: {reply: I18n.t(lang, `addTaskAdded`, {id: result.task.id, title: result.task.title})}})
    },
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
