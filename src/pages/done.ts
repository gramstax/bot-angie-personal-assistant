import {PageBase} from "~/base/page"

/**
 * /done (EN) / /selesai (ID) <id> — mark one task done in LMDB.
 *
 * All words live in `static template` (EN default + `lang="id"` variant);
 * the handler only computes data: the render `state` and the task `id` /
 * raw input. Strict rule (Damar 2026-11-19 ~14:43 WIB): no string dictionary.
 */
export class DonePage extends PageBase {
  static data = this.buildData({intentCommandText: {default: `done`, id: `selesai`}})

  async handleCommandText() {
    await this.gdefault.show()
  }

  async handleCommandArgsText() {
    await this.gdefault.process(this.msgTextCommandArgs.join(` `))
  }

  helper = {}

  gdefault = {
    show: async () => {
      await this.renderText({data: {state: `prompt`, id: 0, raw: ``}})
    },
    process: async (raw: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const id = Number(raw.trim())
      if (!Number.isInteger(id) || id <= 0) {
        await this.renderText({data: {state: `invalid`, id: 0, raw}})
        return
      }
      const result = await this.db.tasks.complete(userId, id)
      const state = result === `ok` ? `ok` : result === `already-done` ? `already` : `notfound`
      await this.renderText({data: {state, id, raw: ``}})
    },
  }

  static template = `
    <g-base>
      <g-description>Mark a task done</g-description>
      <g-description lang="id">Tandai tugas selesai</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="invalid">That task number is not valid: "{{raw}}". See the numbers with /tugas, then /selesai &lt;id&gt;.</g-case>
          <g-case is="ok">✅ Task [{{id}}] done. Nice work!</g-case>
          <g-case is="already">Task [{{id}}] was already done before.</g-case>
          <g-case is="notfound">There is no task with number [{{id}}]. See the list with /tugas.</g-case>
          <g-default>Write the task number — example: /selesai 1. See the numbers with /tugas.</g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="invalid">Nomor tugasnya tidak valid: "{{raw}}". Lihat nomornya di /tugas, lalu /selesai &lt;id&gt;.</g-case>
          <g-case is="ok">✅ Tugas [{{id}}] selesai. Kerja bagus!</g-case>
          <g-case is="already">Tugas [{{id}}] memang sudah selesai sebelumnya.</g-case>
          <g-case is="notfound">Tidak ada tugas dengan nomor [{{id}}]. Lihat daftarnya di /tugas.</g-case>
          <g-default>Tulis nomor tugasnya — contoh: /selesai 1. Lihat nomornya di /tugas.</g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
