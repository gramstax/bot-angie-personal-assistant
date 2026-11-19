import {afterEach, describe, expect, it} from "bun:test"
import {GoogleService} from "../src/lib/google"

const realFetch = GoogleService.fetchFn

afterEach(() => {
  GoogleService.fetchFn = realFetch
})

function stubFetch(handler: (url: string) => unknown, status = 200) {
  GoogleService.fetchFn = (async (url: string | URL | Request) => {
    const body = handler(String(url))
    return new Response(JSON.stringify(body), {status, headers: {"Content-Type": `application/json`}})
  }) as typeof fetch
}

describe(`GoogleService`, () => {
  it(`returns not-connected with code no-token without a token — never fake data`, async () => {
    const emails = await GoogleService.listUnreadEmails(``)
    expect(emails).toEqual({connected: false, code: `no-token`})
    const events = await GoogleService.listEvents(``, `2026-11-19`)
    expect(events).toEqual({connected: false, code: `no-token`})
  })

  it(`lists unread emails excluding promo via the query`, async () => {
    let seenQuery = ``
    stubFetch((url) => {
      if (url.includes(`/messages?`)) {
        seenQuery = url
        return {messages: [{id: `m1`}, {id: `m2`}]}
      }
      return {
        snippet: `isi singkat`,
        payload: {headers: [
          {name: `From`, value: `bos@kantor.com`},
          {name: `Subject`, value: `Rapat besok`},
          {name: `Date`, value: `Wed, 19 Nov 2026`},
        ]},
      }
    })
    const result = await GoogleService.listUnreadEmails(`tok123`, {afterKey: `2026-11-19`})
    expect(seenQuery).toContain(`is%3Aunread`)
    expect(seenQuery).toContain(`-category%3Apromotions`)
    expect(result.connected).toBe(true)
    if (!result.connected) return
    expect(result.items.length).toBe(2)
    expect(result.items[0]!.subject).toBe(`Rapat besok`)
    expect(result.items[0]!.from).toBe(`bos@kantor.com`)
  })

  it(`reports gmail-error with the HTTP status on a 401`, async () => {
    stubFetch(() => ({error: {message: `Invalid Credentials`}}), 401)
    const result = await GoogleService.listUnreadEmails(`bad-token`)
    expect(result).toEqual({connected: false, code: `gmail-error`, status: 401})
  })

  it(`lists calendar events for the requested date range`, async () => {
    let seenUrl = ``
    stubFetch((url) => {
      seenUrl = url
      return {items: [
        {summary: `Rapat tim`, start: {dateTime: `2026-11-19T09:00:00+07:00`}, end: {dateTime: `2026-11-19T10:00:00+07:00`}, location: `Ruang A`},
      ]}
    })
    const result = await GoogleService.listEvents(`tok123`, `2026-11-19`)
    expect(seenUrl).toContain(`timeMin=2026-11-19T00%3A00%3A00Z`)
    expect(result.connected).toBe(true)
    if (!result.connected) return
    expect(result.items[0]!.summary).toBe(`Rapat tim`)
    expect(result.items[0]!.location).toBe(`Ruang A`)
  })

  it(`reports calendar-error with the HTTP status on a 401`, async () => {
    stubFetch(() => ({error: {message: `Invalid Credentials`}}), 401)
    const result = await GoogleService.listEvents(`bad-token`, `2026-11-19`)
    expect(result).toEqual({connected: false, code: `calendar-error`, status: 401})
  })
})
