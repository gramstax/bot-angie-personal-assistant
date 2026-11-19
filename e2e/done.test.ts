import {beforeEach, describe, expect, it} from "bun:test"
import {bot, cmdEnUser, e2e, doneTaskUser, resetEnv} from "./setup"

const intent = `done`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
  await bot.db.tasks.add(4303, `Beli susu`)
})

describe(`E2E: DonePage`, () => {
  it(`marks a task done (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/done 1`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `ok`, id: 1, raw: ``}, `id`),
    )
    expect(bot.db.tasks.list(4303)[0]!.done).toBe(true)
  })

  it(`marks a task done (English)`, async () => {
    await bot.db.tasks.add(4961, `Buy milk`)
    const responses = await e2e.sendText(`/done 1`, cmdEnUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `ok`, id: 1, raw: ``}, `en`),
    )
    expect(bot.db.tasks.list(4961)[0]!.done).toBe(true)
  })

  it(`reports an unknown id instead of failing silently`, async () => {
    const responses = await e2e.sendText(`/done 99`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `notfound`, id: 99, raw: ``}, `id`),
    )
  })

  it(`reports an already-done task on a second /done`, async () => {
    await e2e.sendText(`/done 1`, doneTaskUser)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/done 1`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `already`, id: 1, raw: ``}, `id`),
    )
  })

  it(`rejects a non-numeric id`, async () => {
    const responses = await e2e.sendText(`/done abc`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `invalid`, id: 0, raw: `abc`}, `id`),
    )
  })

  it(`prompts for the id when /done has no argument`, async () => {
    const responses = await e2e.sendText(`/done`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `prompt`, id: 0, raw: ``}, `id`),
    )
  })
})
