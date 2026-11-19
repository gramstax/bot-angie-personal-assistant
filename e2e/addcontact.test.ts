import {beforeEach, describe, expect, it} from "bun:test"
import {bot, cmdEnUser, e2e, addContactUser, resetEnv} from "./setup"

const intent = `addcontact`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: AddContactPage`, () => {
  it(`adds a contact with name, email and phone (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/addcontact Budi | budi@mail.com | 08123456789`, addContactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `saved`, name: `Budi`, extra: ` — budi@mail.com — 08123456789`}, `id`),
    )
    const saved = bot.db.contacts.list(4702)
    expect(saved.length).toBe(1)
    expect(saved[0]!.email).toBe(`budi@mail.com`)
  })

  it(`adds a contact with name, email and phone (English)`, async () => {
    const responses = await e2e.sendText(`/addcontact Budi | budi@mail.com | 08123456789`, cmdEnUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `saved`, name: `Budi`, extra: ` — budi@mail.com — 08123456789`}, `en`),
    )
    expect(bot.db.contacts.list(4961).length).toBe(1)
  })

  it(`adds a contact with only a name`, async () => {
    const responses = await e2e.sendText(`/addcontact Sari`, addContactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`✅ Kontak disimpan: Sari`)
    expect(bot.db.contacts.list(4702)[0]!.phone).toBeUndefined()
  })

  it(`rejects a missing name`, async () => {
    const responses = await e2e.sendText(`/addcontact | sari@mail.com`, addContactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `noname`, name: ``, extra: ``}, `id`),
    )
    expect(bot.db.contacts.list(4702).length).toBe(0)
  })

  it(`prompts for the format when /addcontact has no argument`, async () => {
    const responses = await e2e.sendText(`/addcontact`, addContactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `prompt`, name: ``, extra: ``}, `id`),
    )
    expect(bot.db.contacts.list(4702).length).toBe(0)
  })
})
