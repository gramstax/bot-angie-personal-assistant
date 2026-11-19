import {beforeEach, describe, expect, it} from "bun:test"
import {e2e, emailUser, resetEnv} from "./setup"

const intent = `email`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: EmailPage`, () => {
  it(`is honest when Google is not connected — no fake emails`, async () => {
    const responses = await e2e.sendText(`/email`, emailUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    const text = e2e.extractText(reply)
    expect(text).toContain(`Google belum terhubung`)
    expect(text).toContain(`tidak akan mengarang isinya`)
  })

  it(`answers the same from the Email button (callback)`, async () => {
    await e2e.sendText(`/start`, emailUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`email`, emailUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`Google belum terhubung`)
  })
})
