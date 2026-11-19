import {beforeEach, describe, expect, it} from "bun:test"
import {bot, cmdEnUser, e2e, contactUser, resetEnv} from "./setup"

const intent = `contact`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: ContactPage`, () => {
  it(`lists empty contacts with a hint to add one (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/contact`, contactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `empty`, query: ``, count: 0, contacts: []}, `id`),
    )
  })

  it(`lists empty contacts (English default)`, async () => {
    const responses = await e2e.sendText(`/contact`, cmdEnUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `empty`, query: ``, count: 0, contacts: []}, `en`),
    )
  })

  it(`lists seeded contacts`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`, email: `budi@mail.com`, phone: `08123456789`})
    e2e.clearCalls()
    const responses = await e2e.sendText(`/contact`, contactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(
        intent,
        `default`,
        {
          state: `list`,
          query: ``,
          count: 1,
          contacts: [{name: `Budi`, extra: `\n   ✉️ budi@mail.com\n   📞 08123456789`}],
        },
        `id`,
      ),
    )
  })

  it(`searches by name with /contact <nama>`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`, email: `budi@mail.com`})
    await bot.db.contacts.add(4701, {name: `Sari`, email: `sari@mail.com`})
    e2e.clearCalls()
    const responses = await e2e.sendText(`/contact sari`, contactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Sari`)
    expect(e2e.extractText(reply)).not.toContain(`Budi`)
  })

  it(`shows the same list from the Contacts button (callback)`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`, email: `budi@mail.com`})
    await e2e.sendText(`/start`, contactUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`contact`, contactUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`👤 Budi`)
  })

  it(`reports no match for an unknown name`, async () => {
    await bot.db.contacts.add(4701, {name: `Budi`})
    e2e.clearCalls()
    const responses = await e2e.sendText(`/contact zzz`, contactUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `nomatch`, query: `zzz`, count: 0, contacts: []}, `id`),
    )
  })
})
