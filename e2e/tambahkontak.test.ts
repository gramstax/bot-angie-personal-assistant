import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, addKontakUser, resetEnv} from "./setup"

const intent = `tambahkontak`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: TambahKontakPage`, () => {
  it(`adds a contact with name, email and phone`, async () => {
    const responses = await e2e.sendText(`/tambahkontak Budi | budi@mail.com | 08123456789`, addKontakUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {reply: `✅ Kontak disimpan: Budi — budi@mail.com — 08123456789\n\nCari dengan /kontak Budi.`}),
    )
    const saved = bot.db.contacts.list(4702)
    expect(saved.length).toBe(1)
    expect(saved[0]!.email).toBe(`budi@mail.com`)
  })

  it(`adds a contact with only a name`, async () => {
    const responses = await e2e.sendText(`/tambahkontak Sari`, addKontakUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`✅ Kontak disimpan: Sari`)
    expect(bot.db.contacts.list(4702)[0]!.phone).toBeUndefined()
  })

  it(`prompts for the format when /tambahkontak has no argument`, async () => {
    const responses = await e2e.sendText(`/tambahkontak`, addKontakUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Formatnya: /tambahkontak`)
    expect(bot.db.contacts.list(4702).length).toBe(0)
  })
})
