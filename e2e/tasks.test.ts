import {beforeEach, describe, expect, it} from "bun:test"
import {bot, cmdEnUser, e2e, resetEnv, tasksUser} from "./setup"

const intent = `tasks`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: TasksPage`, () => {
  it(`lists empty tasks (Indonesian, fixture language_code id)`, async () => {
    const responses = await e2e.sendText(`/tasks`, tasksUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `empty`, filter: ``, done: 0, total: 0, tasks: []}, `id`),
    )
  })

  it(`lists empty tasks (English default)`, async () => {
    const responses = await e2e.sendText(`/tasks`, cmdEnUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `empty`, filter: ``, done: 0, total: 0, tasks: []}, `en`),
    )
  })

  it(`lists seeded tasks with done/total counts`, async () => {
    await bot.db.tasks.add(4301, `Beli susu`)
    await bot.db.tasks.add(4301, `Cuci motor`)
    await bot.db.tasks.complete(4301, 1)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/tasks`, tasksUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(
        intent,
        `default`,
        {
          state: `list`,
          filter: ``,
          done: 1,
          total: 2,
          tasks: [
            {icon: `✅`, id: 1, title: `Beli susu`},
            {icon: `⬜`, id: 2, title: `Cuci motor`},
          ],
        },
        `id`,
      ),
    )
  })

  it(`filters the list when /tasks is given a keyword`, async () => {
    await bot.db.tasks.add(4301, `Beli susu`)
    await bot.db.tasks.add(4301, `Cuci motor`)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/tasks susu`, tasksUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`[1] Beli susu`)
    expect(e2e.extractText(reply)).not.toContain(`Cuci motor`)
  })

  it(`reports no match for an unknown keyword`, async () => {
    await bot.db.tasks.add(4301, `Beli susu`)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/tasks zzz`, tasksUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {state: `nomatch`, filter: `zzz`, done: 0, total: 1, tasks: []}, `id`),
    )
  })

  it(`shows the same list from the Tasks button (callback)`, async () => {
    await bot.db.tasks.add(4301, `Beli susu`)
    await e2e.sendText(`/start`, tasksUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`tasks`, tasksUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`[1] Beli susu`)
  })
})
