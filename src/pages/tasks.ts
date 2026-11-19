import {PageBase} from "~/base/page"

/**
 * /tasks — the task list from LMDB.
 *
 * All words live in `static template` (EN default + `lang="id"` variant);
 * the helper only computes data: the render `state`, the row list, and the
 * counts. Strict rule (Damar 2026-11-19 ~14:43 WIB): no string dictionary.
 */
export class TasksPage extends PageBase {
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

  helper = {
    load: (userId: number, filter?: string) => {
      const tasks = this.db.tasks.list(userId)
      const shown = filter
        ? tasks.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase()))
        : tasks
      const done = tasks.filter((t) => t.done).length
      return {
        state: tasks.length === 0 ? `empty` : shown.length === 0 ? `nomatch` : `list`,
        filter: filter ?? ``,
        done,
        total: tasks.length,
        tasks: shown.map((t) => ({icon: t.done ? `✅` : `⬜`, id: t.id, title: t.title})),
      }
    },
  }

  gdefault = {
    show: async (filter?: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.renderText({data: this.helper.load(userId, filter)})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>See your tasks</g-description>
      <g-description lang="id">Lihat daftar tugasmu</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="empty">You have no tasks yet. Add one with /addtask &lt;text&gt; — example: /addtask Buy milk.</g-case>
          <g-case is="nomatch">No tasks match "{{filter}}".</g-case>
          <g-default>📋 Your tasks ({{done}}/{{total}} done):
<g-map src="tasks" join="\\n">{{e.icon}} [{{e.id}}] {{e.title}}</g-map>

Mark one done with /done &lt;id&gt; — example: /done 1.</g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="empty">Kamu belum punya tugas. Tambah dengan /addtask &lt;teks&gt; — contoh: /addtask Beli susu.</g-case>
          <g-case is="nomatch">Tidak ada tugas yang cocok dengan "{{filter}}".</g-case>
          <g-default>📋 Tugasmu ({{done}}/{{total}} selesai):
<g-map src="tasks" join="\\n">{{e.icon}} [{{e.id}}] {{e.title}}</g-map>

Selesaikan dengan /done &lt;id&gt; — contoh: /done 1.</g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
