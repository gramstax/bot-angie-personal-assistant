import {PageBase} from "~/base/page"

/**
 * /contact (EN) / /kontak (ID) [name] — search/list contacts from LMDB.
 *
 * All words live in `static template` (EN default + `lang="id"` variant);
 * the helper only computes data: the render `state`, the row list, and the
 * counts. Each row's `extra` is data-only formatting (emoji + values, no
 * words). Strict rule (Damar 2026-11-19 ~14:43 WIB): no string dictionary.
 */
export class ContactPage extends PageBase {
  static data = this.buildData({intentCommandText: {default: `contact`, id: `kontak`}})

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
    load: (userId: number, query?: string) => {
      const contacts = this.db.contacts.search(userId, query ?? ``)
      return {
        state: contacts.length === 0 ? (query ? `nomatch` : `empty`) : `list`,
        query: query ?? ``,
        count: contacts.length,
        contacts: contacts.map((c) => ({
          name: c.name,
          extra: `${c.email ? `\n   ✉️ ${c.email}` : ``}${c.phone ? `\n   📞 ${c.phone}` : ``}${c.note ? `\n   📝 ${c.note}` : ``}`,
        })),
      }
    },
  }

  gdefault = {
    show: async (query?: string) => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.renderText({data: this.helper.load(userId, query)})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>Find a contact</g-description>
      <g-description lang="id">Cari kontak</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="empty">You have not saved any contacts yet. Add one with /tambahkontak &lt;name&gt; | &lt;email&gt; | &lt;phone&gt; — example: /tambahkontak Budi | budi@mail.com | 08123456789.</g-case>
          <g-case is="nomatch">No contacts match "{{query}}". Add one with /tambahkontak &lt;name&gt; | &lt;email&gt; | &lt;phone&gt;.</g-case>
          <g-default><g-ifelse>query ? '👤 Contacts for "' + query + '" (' + count + '):' : '👤 Contacts (' + count + '):'</g-ifelse>
<g-map src="contacts" join="\\n">👤 {{e.name}}{{e.extra}}</g-map></g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="empty">Kamu belum menyimpan kontak. Tambah dengan /tambahkontak &lt;nama&gt; | &lt;email&gt; | &lt;telepon&gt; — contoh: /tambahkontak Budi | budi@mail.com | 08123456789.</g-case>
          <g-case is="nomatch">Tidak ada kontak yang cocok dengan "{{query}}". Tambah dengan /tambahkontak &lt;nama&gt; | &lt;email&gt; | &lt;telepon&gt;.</g-case>
          <g-default><g-ifelse>query ? '👤 Kontak untuk "' + query + '" (' + count + '):' : '👤 Kontak (' + count + '):'</g-ifelse>
<g-map src="contacts" join="\\n">👤 {{e.name}}{{e.extra}}</g-map></g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
