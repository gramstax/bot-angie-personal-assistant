import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, doneTaskUser, resetEnv} from "./setup"

const intent = `selesai`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
  await bot.db.tasks.add(4303, `Beli susu`)
})

describe(`E2E: SelesaiPage`, () => {
  it(`marks a task done`, async () => {
    const responses = await e2e.sendText(`/selesai 1`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(e2e.gmsg(intent, `default`, {reply: `✅ Tugas [1] selesai. Kerja bagus!`}))
    expect(bot.db.tasks.list(4303)[0]!.done).toBe(true)
  })

  it(`reports an unknown id instead of failing silently`, async () => {
    const responses = await e2e.sendText(`/selesai 99`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Tidak ada tugas dengan nomor [99]`)
  })

  it(`reports an already-done task on a second /selesai`, async () => {
    await e2e.sendText(`/selesai 1`, doneTaskUser)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/selesai 1`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`sudah selesai sebelumnya`)
  })

  it(`rejects a non-numeric id`, async () => {
    const responses = await e2e.sendText(`/selesai abc`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Nomor tugasnya tidak valid`)
  })

  it(`prompts for the id when /selesai has no argument`, async () => {
    const responses = await e2e.sendText(`/selesai`, doneTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Tulis nomor tugasnya`)
  })
})
