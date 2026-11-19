import {beforeEach, describe, expect, it} from "bun:test"
import {e2e, jadwalUser, resetEnv} from "./setup"

const intent = `jadwal`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: JadwalPage`, () => {
  it(`is honest when Google is not connected — no fake events`, async () => {
    const responses = await e2e.sendText(`/jadwal`, jadwalUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    const text = e2e.extractText(reply)
    expect(text).toContain(`Google belum terhubung`)
    expect(text).toContain(`tidak akan mengarang acaranya`)
  })

  it(`accepts /jadwal besok and still reports the honest not-connected state`, async () => {
    const responses = await e2e.sendText(`/jadwal besok`, jadwalUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Google belum terhubung`)
  })

  it(`answers the same from the Jadwal button (callback)`, async () => {
    await e2e.sendText(`/start`, jadwalUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`jadwal`, jadwalUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`Google belum terhubung`)
  })
})
