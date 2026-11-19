import {afterEach, beforeEach, describe, expect, it} from "bun:test"
import {cmdEnUser, e2e, emailUser, resetEnv} from "./setup"
import {GoogleService} from "../src/lib/google"

const intent = `email`
const realFetch = GoogleService.fetchFn

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

afterEach(() => {
  GoogleService.fetchFn = realFetch
  process.env.GOOGLE_ACCESS_TOKEN = ``
})

describe(`E2E: EmailPage`, () => {
  it(`is honest when Google is not connected — no fake emails (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/email`, emailUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `noconnect`, code: `no-token`, status: 0, count: 0, items: []}, `id`),
    )
  })

  it(`is honest when Google is not connected (English default)`, async () => {
    const responses = await e2e.sendText(`/email`, cmdEnUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `noconnect`, code: `no-token`, status: 0, count: 0, items: []}, `en`),
    )
  })

  it(`answers the same from the Email button (callback)`, async () => {
    await e2e.sendText(`/start`, emailUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`email`, emailUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`Google belum terhubung`)
  })

  it(`lists unread emails from Google when a token is set (stubbed fetch)`, async () => {
    process.env.GOOGLE_ACCESS_TOKEN = `tok123`
    GoogleService.fetchFn = (async (url: string | URL | Request) => {
      const u = String(url)
      const body = u.includes(`/messages?`)
        ? {messages: [{id: `m1`}]}
        : {
            snippet: `isi singkat`,
            payload: {headers: [
              {name: `From`, value: `bos@kantor.com`},
              {name: `Subject`, value: `Rapat besok`},
              {name: `Date`, value: `Wed, 19 Nov 2026`},
            ]},
          }
      return new Response(JSON.stringify(body), {status: 200, headers: {"Content-Type": `application/json`}})
    }) as typeof fetch
    const responses = await e2e.sendText(`/email`, emailUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(
        intent,
        `default`,
        {
          state: `list`,
          code: ``,
          status: 0,
          count: 1,
          items: [{subject: `Rapat besok`, from: `bos@kantor.com`, date: `Wed, 19 Nov 2026`}],
        },
        `id`,
      ),
    )
  })
})
