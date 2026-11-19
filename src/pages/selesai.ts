import {PageBase} from "~/base/page"

/** /selesai <id> — tandai satu tugas selesai di LMDB. */
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
      await this.renderText({data: {reply: `Tulis nomor tugasnya — contoh: /selesai 1. Lihat nomornya di /tugas.`}})
    },
    process: async (raw: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const id = Number(raw.trim())
      if (!Number.isInteger(id) || id <= 0) {
        await this.renderText({data: {reply: `Nomor tugasnya tidak valid: "${raw}". Lihat nomornya di /tugas, lalu /selesai <id>.`}})
        return
      }
      const result = await this.db.tasks.complete(userId, id)
      const reply =
        result === `ok`
          ? `✅ Tugas [${id}] selesai. Kerja bagus!`
          : result === `already-done`
            ? `Tugas [${id}] memang sudah selesai sebelumnya.`
            : `Tidak ada tugas dengan nomor [${id}]. Lihat daftarnya di /tugas.`
      await this.renderText({data: {reply}})
    },
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
