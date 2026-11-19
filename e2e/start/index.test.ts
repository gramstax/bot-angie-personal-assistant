import {beforeEach, describe, expect, it} from "bun:test"
import {cmdEnUser, e2e, resetEnv, startUser} from "../setup"

const intent = `start`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: StartPage`, () => {
  it(`respond to /start command with welcome message and full keyboard (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/start`, startUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(reply).toBeDefined()
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {userName: `angieuser`}, `id`))
    // The menu keyboard comes from the single KeyboardGBlock.mainMenu()
    // definition (EN + ID variants emitted by _build) — labels in ID here.
    expect(e2e.extractButtonLabels(reply)).toEqual([`📋 Tugas`, `👤 Kontak`, `✉️ Email`, `📅 Jadwal`, `🌐 Bahasa`, `🆘 Bantuan`])
    expect(e2e.extractButtonLabels(reply)).toEqual(e2e.gkb(intent, `default`, `inline`, {}, `id`))
  })

  it(`respond to /start command with welcome message and full keyboard (English)`, async () => {
    const responses = await e2e.sendText(`/start`, cmdEnUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(reply).toBeDefined()
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {userName: `cmden`}, `en`))
    expect(e2e.extractButtonLabels(reply)).toEqual([`📋 Tasks`, `👤 Contacts`, `✉️ Email`, `📅 Schedule`, `🌐 Language`, `🆘 Help`])
    expect(e2e.extractButtonLabels(reply)).toEqual(e2e.gkb(intent, `default`, `inline`, {}, `en`))
  })

  it(`edits the welcome page from a callback`, async () => {
    await e2e.sendText(`/start`, startUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(intent, startUser)
    expect(responses.length).toBeGreaterThan(0)
    expect(responses[0]!.method).toBe(`editMessageText`)
    expect(e2e.extractText(responses[0]!)).toBe(e2e.gmsg(intent, `default`, {userName: `angieuser`}, `id`))
    expect(e2e.extractButtonLabels(responses[0]!)).toEqual(e2e.gkb(intent, `default`, `inline`, {}, `id`))
  })

  it(`navigates to Tasks from the Start keyboard`, async () => {
    await e2e.sendText(`/start`, startUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`tasks`, startUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`belum punya tugas`)
  })
})
