import {beforeEach, describe, expect, it} from "bun:test"
import {bot, cmdEnUser, e2e, addTaskUser, resetEnv} from "./setup"

const intent = `addtask`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: AddTaskPage`, () => {
  it(`adds a task and confirms with its id (Indonesian)`, async () => {
    const responses = await e2e.sendText(`/tambahtugas Beli susu di warung`, addTaskUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `added`, id: 1, title: `Beli susu di warung`}, `id`),
    )
    expect(bot.db.tasks.list(4302).map((t) => t.title)).toEqual([`Beli susu di warung`])
  })

  it(`adds a task and confirms with its id (English)`, async () => {
    const responses = await e2e.sendText(`/addtask Buy milk`, cmdEnUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `added`, id: 1, title: `Buy milk`}, `en`),
    )
    expect(bot.db.tasks.list(4961).map((t) => t.title)).toEqual([`Buy milk`])
  })

  it(`prompts for the task text when /tambahtugas has no argument`, async () => {
    const responses = await e2e.sendText(`/tambahtugas`, addTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `prompt`, id: 0, title: ``}, `id`),
    )
    expect(bot.db.tasks.list(4302).length).toBe(0)
  })

  it(`increments ids for a second task`, async () => {
    await e2e.sendText(`/tambahtugas Satu`, addTaskUser)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/tambahtugas Dua`, addTaskUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`[2] Dua`)
  })
})
