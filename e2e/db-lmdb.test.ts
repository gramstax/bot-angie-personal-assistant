import {beforeEach, describe, expect, it} from "bun:test"
import {bot, dbUser, e2e, resetEnv} from "./setup"

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`e2e: LMDB repositories (direct)`, () => {
  it(`user createIfNotExists is idempotent`, async () => {
    // data-e2e persists across runs, so the row may already exist from a
    // previous run — assert idempotency, not first-run creation.
    await bot.db.user.createIfNotExists(4101, {username: `dbuser`, firstName: `Db`})
    const second = await bot.db.user.createIfNotExists(4101, {username: `dbuser`, firstName: `Db`})
    expect(second.created).toBe(false)
    expect(second.user.username).toBe(`dbuser`)
    expect(bot.db.user.count()).toBeGreaterThanOrEqual(1)
  })

  it(`task add/complete/remove round-trip`, async () => {
    const added = await bot.db.tasks.add(4101, `Kerjakan laporan`)
    expect(added.ok).toBe(true)
    if (!added.ok) return
    expect(bot.db.tasks.list(4101).length).toBe(1)
    expect(await bot.db.tasks.complete(4101, added.task.id)).toBe(`ok`)
    expect(await bot.db.tasks.complete(4101, added.task.id)).toBe(`already-done`)
    expect(await bot.db.tasks.remove(4101, added.task.id)).toBe(true)
    expect(bot.db.tasks.list(4101).length).toBe(0)
  })

  it(`contact search matches name, email and phone`, async () => {
    await bot.db.contacts.add(4101, {name: `Budi Santoso`, email: `budi@mail.com`, phone: `0812`})
    await bot.db.contacts.add(4101, {name: `Sari`, email: `sari@mail.com`})
    expect(bot.db.contacts.search(4101, `budi`).length).toBe(1)
    expect(bot.db.contacts.search(4101, `sari@mail`).length).toBe(1)
    expect(bot.db.contacts.search(4101, `0812`).length).toBe(1)
    expect(bot.db.contacts.search(4101, ``).length).toBe(2)
  })

  it(`memory clear wipes the window`, async () => {
    await bot.db.memory.add(4101, {role: `user`, text: `halo`, at: Date.now()})
    expect(bot.db.memory.list(4101).length).toBe(1)
    await bot.db.memory.clear(4101)
    expect(bot.db.memory.list(4101).length).toBe(0)
  })

  it(`db usage reports map size`, () => {
    const usage = bot.db.usage()
    expect(usage.total).toBeGreaterThan(0)
  })

  void dbUser
})
