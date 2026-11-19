import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, forgetUser, resetEnv} from "./setup"

const intent = `forget`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: ForgetPage`, () => {
  it(`clears the user's conversation memory and confirms`, async () => {
    await e2e.sendText(`Aku suka kopi tubruk`, forgetUser)
    expect(bot.db.memory.list(4901).length).toBe(2)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/forget`, forgetUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {}, `id`))
    expect(bot.db.memory.list(4901).length).toBe(0)
  })

  it(`after /forget, Angie no longer remembers the earlier like`, async () => {
    await e2e.sendText(`Aku suka kopi tubruk`, forgetUser)
    await e2e.sendText(`/forget`, forgetUser)
    e2e.clearCalls()
    const responses = await e2e.sendText(`Apa yang aku suka?`, forgetUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`belum pernah cerita soal kesukaanmu`)
  })
})
