import {Dates} from "~/lib/dates"

export interface IEmailSummary {
  id: string
  from: string
  subject: string
  date: string
  snippet: string
}

export interface ICalendarEvent {
  summary: string
  start: string
  end: string
  location?: string
}

export type GoogleResult<T> =
  | {connected: true; items: T[]}
  | {connected: false; reason: string}

/**
 * Adapter Google API langsung (fetch REST, OAuth2 Bearer dari env
 * GOOGLE_ACCESS_TOKEN) — pengganti node Gmail / Google Calendar di n8n.
 *
 * TIDAK ada data mock: bila token belum ada, tool mengembalikan
 * `{connected: false}` dan Angie menjawab jujur "belum terhubung, isi
 * GOOGLE_ACCESS_TOKEN". `fetchFn` bisa di-inject dari tes supaya unit test
 * tidak menyentuh jaringan.
 */
export class GoogleService {
  static fetchFn: typeof fetch = fetch

  static async listUnreadEmails(token: string, opts?: {afterKey?: string; max?: number}): Promise<GoogleResult<IEmailSummary>> {
    if (!token) return {connected: false, reason: `Google belum terhubung — isi GOOGLE_ACCESS_TOKEN di .env`}
    const after = opts?.afterKey ?? Dates.todayKey()
    const q = encodeURIComponent(`is:unread in:inbox -category:promotions after:${after.replaceAll(`-`, `/`)}`)
    const listRes = await GoogleService.fetchFn(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${opts?.max ?? 10}`,
      {headers: {Authorization: `Bearer ${token}`}},
    )
    if (!listRes.ok) {
      return {connected: false, reason: `Gmail error ${listRes.status} — token mungkin kedaluwarsa`}
    }
    const list = (await listRes.json()) as {messages?: {id: string}[]}
    const items: IEmailSummary[] = []
    for (const m of list.messages ?? []) {
      const r = await GoogleService.fetchFn(
        `https://gmail.googleapis.com/gmail/v1/users/me/messages/${m.id}?format=metadata&metadataHeaders=From&metadataHeaders=Subject&metadataHeaders=Date`,
        {headers: {Authorization: `Bearer ${token}`}},
      )
      if (!r.ok) continue
      const msg = (await r.json()) as {
        snippet?: string
        payload?: {headers?: {name: string; value: string}[]}
      }
      const header = (name: string) =>
        msg.payload?.headers?.find((h) => h.name.toLowerCase() === name.toLowerCase())?.value ?? ``
      items.push({
        id: m.id,
        from: header(`From`),
        subject: header(`Subject`) || `(tanpa subjek)`,
        date: header(`Date`),
        snippet: msg.snippet ?? ``,
      })
    }
    return {connected: true, items}
  }

  static async listEvents(token: string, dateKey: string): Promise<GoogleResult<ICalendarEvent>> {
    if (!token) return {connected: false, reason: `Google belum terhubung — isi GOOGLE_ACCESS_TOKEN di .env`}
    const {timeMin, timeMax} = Dates.dayRange(dateKey)
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
      `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=20`
    const res = await GoogleService.fetchFn(url, {headers: {Authorization: `Bearer ${token}`}})
    if (!res.ok) {
      return {connected: false, reason: `Google Calendar error ${res.status} — token mungkin kedaluwarsa`}
    }
    const data = (await res.json()) as {
      items?: {summary?: string; start?: {dateTime?: string; date?: string}; end?: {dateTime?: string; date?: string}; location?: string}[]
    }
    return {
      connected: true,
      items: (data.items ?? []).map((e) => ({
        summary: e.summary ?? `(tanpa judul)`,
        start: e.start?.dateTime ?? e.start?.date ?? ``,
        end: e.end?.dateTime ?? e.end?.date ?? ``,
        location: e.location,
      })),
    }
  }
}
