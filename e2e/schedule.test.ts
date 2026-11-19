import {afterEach, beforeEach, describe, expect, it} from "bun:test"
import {e2e, cmdEnUser, resetEnv, scheduleUser} from "./setup"
import {Dates} from "../src/lib/dates"
import {GoogleService} from "../src/lib/google"

const intent = `schedule`
const realFetch = GoogleService.fetchFn

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

afterEach(() => {
  GoogleService.fetchFn = realFetch
  process.env.GOOGLE_ACCESS_TOKEN = ``
})

describe(`E2E: SchedulePage`, () => {
  it(`is honest when Google is not connected — no fake events (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/schedule`, scheduleUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(
        intent,
        `default`,
        {isToday: true, dateKey: Dates.todayKey(), count: 0, items: [], state: `noconnect`, code: `no-token`, status: 0},
        `id`,
      ),
    )
  })

  it(`is honest when Google is not connected (English default)`, async () => {
    const responses = await e2e.sendText(`/schedule`, cmdEnUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(
        intent,
        `default`,
        {isToday: true, dateKey: Dates.todayKey(), count: 0, items: [], state: `noconnect`, code: `no-token`, status: 0},
        `en`,
      ),
    )
  })

  it(`accepts /schedule besok and still reports the honest not-connected state`, async () => {
    const responses = await e2e.sendText(`/schedule besok`, scheduleUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Google belum terhubung`)
  })

  it(`answers the same from the Schedule button (callback)`, async () => {
    await e2e.sendText(`/start`, scheduleUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`schedule`, scheduleUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`Google belum terhubung`)
  })

  it(`lists events from Google when a token is set (stubbed fetch)`, async () => {
    process.env.GOOGLE_ACCESS_TOKEN = `tok123`
    const today = Dates.todayKey()
    GoogleService.fetchFn = (async () => {
      return new Response(
        JSON.stringify({items: [
          {summary: `Rapat tim`, start: {dateTime: `${today}T09:00:00+07:00`}, end: {dateTime: `${today}T10:00:00+07:00`}, location: `Ruang A`},
        ]}),
        {status: 200, headers: {"Content-Type": `application/json`}},
      )
    }) as unknown as typeof fetch
    const responses = await e2e.sendText(`/schedule`, scheduleUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(
        intent,
        `default`,
        {
          isToday: true,
          dateKey: today,
          count: 1,
          items: [{time: `09:00–10:00`, summary: `Rapat tim`, at: ` @ Ruang A`}],
          state: `list`,
          code: ``,
          status: 0,
        },
        `id`,
      ),
    )
  })
})
