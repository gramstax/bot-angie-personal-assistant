import {PageBase} from "~/base/page"

/** /tambahtugas <teks> — tambah satu tugas ke LMDB. */
export class TambahTugasPage extends PageBase {
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
      await this.renderText({data: {reply: `Tulis tugasnya setelah perintah — contoh: /tambahtugas Beli susu di warung.`}})
    },
    process: async (title: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const result = await this.db.tasks.add(userId, title)
      if (!result.ok) {
        const reply = result.reason === `full`
          ? `Tugasmu sudah mencapai batas (100). Selesaikan dulu beberapa dengan /selesai <id>.`
          : `Tulis tugasnya setelah perintah — contoh: /tambahtugas Beli susu di warung.`
        await this.renderText({data: {reply}})
        return
      }
      await this.renderText({data: {reply: `✅ Tugas ditambahkan: [${result.task.id}] ${result.task.title}\n\nLihat semuanya dengan /tugas.`}})
    },
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
