import {PageBase} from "~/base/page"

/** /kontak [nama] — cari/daftar kontak dari LMDB (pengganti tabel Contacts Baserow di n8n). */
export class KontakPage extends PageBase {
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
    format: (userId: number, query?: string): string => {
      const contacts = this.db.contacts.search(userId, query ?? ``)
      if (contacts.length === 0) {
        return query
          ? `Tidak ada kontak yang cocok dengan "${query}". Tambah dengan /tambahkontak <nama> | <email> | <telepon>.`
          : `Kamu belum menyimpan kontak. Tambah dengan /tambahkontak <nama> | <email> | <telepon> — contoh: /tambahkontak Budi | budi@mail.com | 08123456789.`
      }
      const lines = contacts.map(
        (c) => `👤 ${c.name}${c.email ? `\n   ✉️ ${c.email}` : ``}${c.phone ? `\n   📞 ${c.phone}` : ``}${c.note ? `\n   📝 ${c.note}` : ``}`,
      )
      return `👤 Kontak${query ? ` untuk "${query}"` : ``} (${contacts.length}):\n${lines.join(`\n`)}`
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
