import {PageBase} from "~/base/page"
import {I18n} from "~/lib/i18n"

/** /tasks (EN) / /tugas (ID) — the task list from LMDB. */
export class TugasPage extends PageBase {
  static data = this.buildData({intentCommandText: {default: `tasks`, id: `tugas`}})

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
    format: (userId: number, filter?: string): string => {
      const lang = this.lang()
      const tasks = this.db.tasks.list(userId)
      const shown = filter
        ? tasks.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase()))
        : tasks
      if (tasks.length === 0) return I18n.t(lang, `tugasEmpty`)
      if (shown.length === 0) return I18n.t(lang, `tugasNoMatch`, {filter: filter ?? ``})
      const lines = shown.map((t) => `${t.done ? `✅` : `⬜`} [${t.id}] ${t.title}`)
      const done = tasks.filter((t) => t.done).length
      return `${I18n.t(lang, `tugasHeader`, {done, total: tasks.length})}\n${lines.join(`\n`)}\n\n${I18n.t(lang, `tugasDoneHint`)}`
    },
  }

  gdefault = {
    show: async (filter?: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.renderText({data: {reply: this.helper.format(userId, filter)}})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
