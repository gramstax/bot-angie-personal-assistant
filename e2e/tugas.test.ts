import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, resetEnv, tasksUser} from "./setup"

const intent = `tugas`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

describe(`E2E: TugasPage`, () => {
  it(`lists empty tasks with a hint to add one`, async () => {
    const responses = await e2e.sendText(`/tugas`, tasksUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {reply: `Kamu belum punya tugas. Tambah dengan /tambahtugas <teks> — contoh: /tambahtugas Beli susu.`}),
    )
  })

  it(`lists seeded tasks with done/total counts`, async () => {
    await bot.db.tasks.add(4301, `Beli susu`)
    await bot.db.tasks.add(4301, `Cuci motor`)
    await bot.db.tasks.complete(4301, 1)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/tugas`, tasksUser)
    const reply = e2e.lastCall(`sendMessage`)!
    const text = e2e.extractText(reply)
    expect(text).toContain(`📋 Tugasmu (1/2 selesai):`)
    expect(text).toContain(`✅ [1] Beli susu`)
    expect(text).toContain(`⬜ [2] Cuci motor`)
  })

  it(`filters the list when /tugas is given a keyword`, async () => {
    await bot.db.tasks.add(4301, `Beli susu`)
    await bot.db.tasks.add(4301, `Cuci motor`)
    e2e.clearCalls()
    const responses = await e2e.sendText(`/tugas susu`, tasksUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`[1] Beli susu`)
    expect(e2e.extractText(reply)).not.toContain(`Cuci motor`)
  })

  it(`shows the same list from the Tasks button (callback)`, async () => {
    await bot.db.tasks.add(4301, `Beli susu`)
    await e2e.sendText(`/start`, tasksUser)
    e2e.clearCalls()
    const responses = await e2e.sendCallbackQuery(`tugas`, tasksUser)
    expect(responses.map((c) => c.method)).toContain(`editMessageText`)
    expect(e2e.extractText(e2e.lastCall(`editMessageText`)!)).toContain(`[1] Beli susu`)
  })
})
