import {PageBase} from "~/base/page"
import {Dates} from "~/lib/dates"
import {GoogleService} from "~/lib/google"
import {AppConfig} from "~/lib/config"

/**
 * /schedule [date] — Google Calendar events for one date.
 *
 * All words live in `static template` (EN default + `lang="id"` variant);
 * the helper only computes data: the render `state`, the Google failure
 * `code`/`status`, the date label parts, and the item list (`time` is a
 * preformatted HH:MM–HH:MM range, `at` a data-only location suffix).
 * Strict rule (Damar 2026-11-19 ~14:43 WIB): no string dictionary.
 */
export class SchedulePage extends PageBase {
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
    load: async (raw?: string) => {
      const dateKey = (raw ? Dates.parseDate(raw) : undefined) ?? Dates.todayKey()
      const token = AppConfig.load().googleAccessToken
      const result = await GoogleService.listEvents(token, dateKey)
      const base = {isToday: !raw, dateKey, count: 0, items: [] as {time: string; summary: string; at: string}[]}
      if (!result.connected) {
        return {...base, state: `noconnect`, code: result.code, status: result.status ?? 0}
      }
      return {
        ...base,
        state: result.items.length === 0 ? `empty` : `list`,
        code: ``,
        status: 0,
        count: result.items.length,
        items: result.items.map((e) => ({
          time: `${e.start.slice(11, 16)}–${e.end.slice(11, 16)}`,
          summary: e.summary,
          at: e.location ? ` @ ${e.location}` : ``,
        })),
      }
    },
  }

  gdefault = {
    show: async (raw?: string) => {
      await this.renderText({data: await this.helper.load(raw)})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>See events for a day</g-description>
      <g-description lang="id">Lihat acara hari itu</g-description>
      <g-message>
        <g-switch value="state">
          <g-case is="noconnect">📅 <g-ifelse>code === 'calendar-error' ? 'Google Calendar error ' + status + ' — the token may have expired' : 'Google is not connected — set GOOGLE_ACCESS_TOKEN in .env'</g-ifelse>

Without that token I cannot read your calendar — and I will not make up its events.</g-case>
          <g-case is="empty">📅 No events on <g-ifelse>isToday ? 'today (' + dateKey + ')' : dateKey</g-ifelse>. Enjoy the free day.</g-case>
          <g-default>📅 Schedule for <g-ifelse>isToday ? 'today (' + dateKey + ')' : dateKey</g-ifelse> ({{count}} events):
<g-map src="items" join="\\n">• {{e.time}} {{e.summary}}{{e.at}}</g-map></g-default>
        </g-switch>
      </g-message>
      <g-message lang="id">
        <g-switch value="state">
          <g-case is="noconnect">📅 <g-ifelse>code === 'calendar-error' ? 'Google Calendar error ' + status + ' — token mungkin kedaluwarsa' : 'Google belum terhubung — isi GOOGLE_ACCESS_TOKEN di .env'</g-ifelse>

Tanpa token itu aku tidak bisa membaca kalendermu — dan aku tidak akan mengarang acaranya.</g-case>
          <g-case is="empty">📅 Tidak ada acara pada <g-ifelse>isToday ? 'hari ini (' + dateKey + ')' : dateKey</g-ifelse>. Harimu kosong, silakan dinikmati.</g-case>
          <g-default>📅 Jadwal <g-ifelse>isToday ? 'hari ini (' + dateKey + ')' : dateKey</g-ifelse> ({{count}} acara):
<g-map src="items" join="\\n">• {{e.time}} {{e.summary}}{{e.at}}</g-map></g-default>
        </g-switch>
      </g-message>
    </g-base>
  `
}
