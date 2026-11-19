import {PageBase} from "~/base/page"

/**
 * /addcontact <name> | <email> | <phone> — add one contact to LMDB.
 *
 * All words live in `static template` (EN default + `lang="id"` variant);
 * the handler only computes data: the render `state` and the saved
 * contact's `name`/`extra` (`extra` is data-only formatting: " — email —
 * phone", no words). Strict rule (Damar 2026-11-19 ~14:43 WIB): no string dictionary.
 */
export class AddContactPage extends PageBase {
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
      await this.renderText({data: {state: `prompt`, name: ``, extra: ``}})
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
        const state = result.reason === `full` ? `full` : `noname`
        await this.renderText({data: {state, name: ``, extra: ``}})
        return
      }
      const c = result.contact
      const extra = `${c.email ? ` — ${c.email}` : ``}${c.phone ? ` — ${c.phone}` : ``}`
      await this.renderText({data: {state: `saved`, name: c.name, extra}})
    },
  }

  static template = `
    <g-base>
      <g-description>Add a contact</g-description>
      <g-description lang="id">Tambah kontak</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="full">You have reached the contact limit (200).</g-case>
          <g-case is="noname">The name is missing. The format is: /addcontact &lt;name&gt; | &lt;email&gt; | &lt;phone&gt;.</g-case>
          <g-case is="saved">✅ Contact saved: {{name}}{{extra}}

Find it with /contact {{name}}.</g-case>
          <g-default>The format is: /addcontact &lt;name&gt; | &lt;email&gt; | &lt;phone&gt;
Example: /addcontact Budi | budi@mail.com | 08123456789
Email and phone may be left empty, but the name is required.</g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="full">Kontakmu sudah mencapai batas (200).</g-case>
          <g-case is="noname">Namanya belum ada. Formatnya: /addcontact &lt;nama&gt; | &lt;email&gt; | &lt;telepon&gt;.</g-case>
          <g-case is="saved">✅ Kontak disimpan: {{name}}{{extra}}

Cari dengan /contact {{name}}.</g-case>
          <g-default>Formatnya: /addcontact &lt;nama&gt; | &lt;email&gt; | &lt;telepon&gt;
Contoh: /addcontact Budi | budi@mail.com | 08123456789
Email dan telepon boleh dikosongkan, tapi nama wajib ada.</g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
