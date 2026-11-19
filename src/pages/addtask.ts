import {PageBase} from "~/base/page"

/**
 * /addtask <text> — add one task to LMDB.
 *
 * All words live in `static template` (EN default + `lang="id"` variant);
 * the handler only computes data: the render `state` and the new task's
 * `id`/`title`. Strict rule (Damar 2026-11-19 ~14:43 WIB): no string dictionary.
 */
export class AddTaskPage extends PageBase {
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
      await this.renderText({data: {state: `prompt`, id: 0, title: ``}})
    },
    process: async (title: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const result = await this.db.tasks.add(userId, title)
      if (!result.ok) {
        const state = result.reason === `full` ? `full` : `prompt`
        await this.renderText({data: {state, id: 0, title: ``}})
        return
      }
      await this.renderText({data: {state: `added`, id: result.task.id, title: result.task.title}})
    },
  }

  static template = `
    <g-base>
      <g-description>Add a new task</g-description>
      <g-description lang="id">Tambah tugas baru</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="full">You have reached the task limit (100). Finish a few first with /done &lt;id&gt;.</g-case>
          <g-case is="added">✅ Task added: [{{id}}] {{title}}

See them all with /tasks.</g-case>
          <g-default>Write the task after the command — example: /addtask Buy milk at the store.</g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="full">Tugasmu sudah mencapai batas (100). Selesaikan dulu beberapa dengan /done &lt;id&gt;.</g-case>
          <g-case is="added">✅ Tugas ditambahkan: [{{id}}] {{title}}

Lihat semuanya dengan /tasks.</g-case>
          <g-default>Tulis tugasnya setelah perintah — contoh: /addtask Beli susu di warung.</g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
