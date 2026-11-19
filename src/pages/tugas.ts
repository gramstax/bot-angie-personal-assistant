import {PageBase} from "~/base/page"

/** /tugas — daftar tugas dari LMDB (pengganti tabel Tasks Baserow di n8n). */
export class TugasPage extends PageBase {
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
    format: (userId: number, filter?: string): string => {
      const tasks = this.db.tasks.list(userId)
      const shown = filter
        ? tasks.filter((t) => t.title.toLowerCase().includes(filter.toLowerCase()))
        : tasks
      if (tasks.length === 0) return `Kamu belum punya tugas. Tambah dengan /tambahtugas <teks> — contoh: /tambahtugas Beli susu.`
      if (shown.length === 0) return `Tidak ada tugas yang cocok dengan "${filter}".`
      const lines = shown.map((t) => `${t.done ? `✅` : `⬜`} [${t.id}] ${t.title}`)
      const done = tasks.filter((t) => t.done).length
      return `📋 Tugasmu (${done}/${tasks.length} selesai):\n${lines.join(`\n`)}\n\nSelesaikan dengan /selesai <id> — contoh: /selesai 1.`
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
