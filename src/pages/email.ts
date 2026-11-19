import {PageBase} from "~/base/page"
import {GoogleService} from "~/lib/google"
import {AppConfig} from "~/lib/config"

/**
 * /email — a summary of today's unread emails.
 *
 * All words live in `static template` (EN default + `lang="id"` variant);
 * the helper only computes data: the render `state`, the Google failure
 * `code`/`status`, and the item list. Strict rule (Damar 2026-11-19
 * ~14:43 WIB): no string dictionary.
 */
export class EmailPage extends PageBase {
  static data = this.buildData()

  async handleCallbackQueryData() {
    await this.gdefault.show()
  }

  async handleCommandText() {
    await this.gdefault.show()
  }

  helper = {
    load: async () => {
      const token = AppConfig.load().googleAccessToken
      const result = await GoogleService.listUnreadEmails(token)
      if (!result.connected) {
        return {state: `noconnect`, code: result.code, status: result.status ?? 0, count: 0, items: []}
      }
      return {
        state: result.items.length === 0 ? `empty` : `list`,
        code: ``,
        status: 0,
        count: result.items.length,
        items: result.items.map((e) => ({subject: e.subject, from: e.from, date: e.date})),
      }
    },
  }

  gdefault = {
    show: async () => {
      await this.renderText({data: await this.helper.load()})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>Today's unread emails</g-description>
      <g-description lang="id">Email unread hari ini</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="noconnect">✉️ <g-ifelse>code === 'gmail-error' ? 'Gmail error ' + status + ' — the token may have expired' : 'Google is not connected — set GOOGLE_ACCESS_TOKEN in .env'</g-ifelse>

Without that token I cannot read your email — and I will not make up its contents.</g-case>
          <g-case is="empty">✉️ Inbox clear — no unread emails today.</g-case>
          <g-default>✉️ Unread emails today ({{count}}):
<g-map src="items" join="\\n">• {{e.subject}}
  {{e.from}} — {{e.date}}</g-map></g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="noconnect">✉️ <g-ifelse>code === 'gmail-error' ? 'Gmail error ' + status + ' — token mungkin kedaluwarsa' : 'Google belum terhubung — isi GOOGLE_ACCESS_TOKEN di .env'</g-ifelse>

Tanpa token itu aku tidak bisa membaca emailmu — dan aku tidak akan mengarang isinya.</g-case>
          <g-case is="empty">✉️ Inbox bersih — tidak ada email unread hari ini.</g-case>
          <g-default>✉️ Email unread hari ini ({{count}}):
<g-map src="items" join="\\n">• {{e.subject}}
  {{e.from}} — {{e.date}}</g-map></g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
