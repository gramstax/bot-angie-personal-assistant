import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, lupakanUser, resetEnv} from "./setup"

const intent = `lupakan`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: LupakanPage`, () => {
  it(`clears the user's conversation memory and confirms`, async () => {
    await e2e.sendText(`Aku suka kopi tubruk`, lupakanUser)
    expect(bot.db.memory.list(4901).length).toBe(2)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/lupakan`, lupakanUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {reply: `Sudah kulupakan. Obrolan kita mulai dari nol lagi — ceritakan apa pun dari awal, nanti kuingat lagi.`}),
    )
    expect(bot.db.memory.list(4901).length).toBe(0)
  })

  it(`after /lupakan, Angie no longer remembers the earlier like`, async () => {
    await e2e.sendText(`Aku suka kopi tubruk`, lupakanUser)
    await e2e.sendText(`/lupakan`, lupakanUser)
    e2e.clearCalls()
    const responses = await e2e.sendText(`Apa yang aku suka?`, lupakanUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`belum pernah cerita soal kesukaanmu`)
  })
})
