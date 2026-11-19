import {PageBase} from "~/base/page"

/** /tambahkontak <nama> | <email> | <telepon> — tambah satu kontak ke LMDB. */
export class TambahKontakPage extends PageBase {
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
      await this.renderText({data: {reply: `Formatnya: /tambahkontak <nama> | <email> | <telepon>\nContoh: /tambahkontak Budi | budi@mail.com | 08123456789\nEmail dan telepon boleh dikosongkan, tapi nama wajib ada.`}})
    },
    process: async (raw: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      const parts = raw.split(`|`).map((p) => p.trim())
      const name = parts[0] ?? ``
      const result = await this.db.contacts.add(userId, {
        name,
        email: parts[1] || undefined,
        phone: parts[2] || undefined,
      })
      if (!result.ok) {
        const reply = result.reason === `full`
          ? `Kontakmu sudah mencapai batas (200).`
          : `Namanya belum ada. Formatnya: /tambahkontak <nama> | <email> | <telepon>.`
        await this.renderText({data: {reply}})
        return
      }
      const c = result.contact
      await this.renderText({data: {reply: `✅ Kontak disimpan: ${c.name}${c.email ? ` — ${c.email}` : ``}${c.phone ? ` — ${c.phone}` : ``}\n\nCari dengan /kontak ${c.name}.`}})
    },
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
