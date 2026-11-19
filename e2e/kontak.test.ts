import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, kontakUser, resetEnv} from "./setup"

const intent = `kontak`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: KontakPage`, () => {
  it(`lists empty contacts with a hint to add one`, async () => {
    const responses = await e2e.sendText(`/kontak`, kontakUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`belum menyimpan kontak`)
    expect(e2e.extractText(reply)).toContain(`/tambahkontak`)
  })

  it(`lists seeded contacts`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`, email: `budi@mail.com`, phone: `08123456789`})
    e2e.clearCalls()
    const responses = await e2e.sendText(`/kontak`, kontakUser)
    const reply = e2e.lastCall(`sendMessage`)!
    const text = e2e.extractText(reply)
    expect(text).toContain(`👤 Budi`)
    expect(text).toContain(`budi@mail.com`)
    expect(text).toContain(`08123456789`)
  })

  it(`searches by name with /kontak <nama>`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`, email: `budi@mail.com`})
    await bot.db.contacts.add(4701, {name: `Sari`, email: `sari@mail.com`})
    e2e.clearCalls()
    const responses = await e2e.sendText(`/kontak sari`, kontakUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Sari`)
    expect(e2e.extractText(reply)).not.toContain(`Budi`)
  })

  it(`shows the same list from the Kontak button (callback)`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`, email: `budi@mail.com`})
    await e2e.sendText(`/start`, kontakUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`kontak`, kontakUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`👤 Budi`)
  })

  it(`reports no match for an unknown name`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`})
    e2e.clearCalls()
    const responses = await e2e.sendText(`/kontak zzz`, kontakUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Tidak ada kontak yang cocok dengan "zzz"`)
  })
})
