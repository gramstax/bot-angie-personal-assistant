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

/** Machine-readable failure reason — the human sentence lives in the page template. */
export type GoogleErrorCode = `no-token` | `gmail-error` | `calendar-error`

export type GoogleResult<T> =
  | {connected: true; items: T[]}
  | {connected: false; code: GoogleErrorCode; status?: number}

/**
 * Direct Google API adapter (plain fetch REST, OAuth2 Bearer <redacted> env
 * GOOGLE_ACCESS_TOKEN) for Gmail and Google Calendar.
 *
 * There is NO mock data: when no token is set, the tool returns
 * `{connected: false}` and Angie answers honestly that Google is not
 * connected. `fetchFn` can be injected from tests so unit tests never
 * touch the network.
 *
 * Strict rule (Damar 2026-11-19 ~14:43 WIB): no user-facing strings in this
 * file — a failure is a `code` (+ HTTP `status`), and the page's static
 * template renders the sentence in the user's language.
 */
export class GoogleService {
  static fetchFn: typeof fetch = fetch

  static async listUnreadEmails(
    token: string,
    opts?: {afterKey?: string; max?: number},
  ): Promise<GoogleResult<IEmailSummary>> {
    if (!token) return {connected: false, code: `no-token`}
    const after = opts?.afterKey ?? Dates.todayKey()
    const q = encodeURIComponent(`is:unread in:inbox -category:promotions after:${after.replaceAll(`-`, `/`)}`)
    const listRes = await GoogleService.fetchFn(
      `https://gmail.googleapis.com/gmail/v1/users/me/messages?q=${q}&maxResults=${opts?.max ?? 10}`,
      {headers: {Authorization: `Bearer ${token}`}},
    )
    if (!listRes.ok) {
      return {connected: false, code: `gmail-error`, status: listRes.status}
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
        subject: header(`Subject`) || `(no subject)`,
        date: header(`Date`),
        snippet: msg.snippet ?? ``,
      })
    }
    return {connected: true, items}
  }

  static async listEvents(token: string, dateKey: string): Promise<GoogleResult<ICalendarEvent>> {
    if (!token) return {connected: false, code: `no-token`}
    const {timeMin, timeMax} = Dates.dayRange(dateKey)
    const url =
      `https://www.googleapis.com/calendar/v3/calendars/primary/events` +
      `?timeMin=${encodeURIComponent(timeMin)}&timeMax=${encodeURIComponent(timeMax)}&singleEvents=true&orderBy=startTime&maxResults=20`
    const res = await GoogleService.fetchFn(url, {headers: {Authorization: `Bearer ${token}`}})
    if (!res.ok) {
      return {connected: false, code: `calendar-error`, status: res.status}
    }
    const data = (await res.json()) as {
      items?: {summary?: string; start?: {dateTime?: string; date?: string}; end?: {dateTime?: string; date?: string}; location?: string}[]
    }
    return {
      connected: true,
      items: (data.items ?? []).map((e) => ({
        summary: e.summary ?? `(no title)`,
        start: e.start?.dateTime ?? e.start?.date ?? ``,
        end: e.end?.dateTime ?? e.end?.date ?? ``,
        location: e.location,
      })),
    }
  }
}
