import {afterAll, beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e, angieMemoryUser, angieUser, angieVoiceUser, resetEnv} from "./setup"
import {TranscribePool} from "../src/lib/transcribe-pool"

const intent = `angie`

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
})

afterAll(async () => {
  await TranscribePool.shutdown()
})

describe(`E2E: AngiePage — teks bebas`, () => {
  it(`answers free text as Angie in mock mode and stores the turn in memory`, async () => {
    const responses = await e2e.sendText(`Halo Angie`, angieUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(reply).toBeDefined()
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {reply: `Baik, dicatat. Kamu bilang: "Halo Angie". Kita sudah ngobrol 1 pesan — ada lagi yang bisa kubantu?`}),
    )
    expect(bot.db.memory.list(4401).length).toBe(2)
  })

  it(`remembers context across turns: turn 2 answers from turn 1`, async () => {
    await e2e.sendText(`Aku suka kopi tubruk`, angieMemoryUser)
    e2e.clearCalls()
    const responses = await e2e.sendText(`Apa yang aku suka?`, angieMemoryUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toBe(
      e2e.gmsg(intent, `default`, {reply: `Kamu suka kopi tubruk — itu yang kamu bilang sebelumnya.`}),
    )
    // Window buffer: 2 turn tanya-jawab = 4 baris tersimpan.
    expect(bot.db.memory.list(4402).length).toBe(4)
  })

  it(`routes a task question to the LMDB task tool, not to a made-up answer`, async () => {
    await bot.db.tasks.add(4401, `Beli susu`)
    e2e.clearCalls()
    const responses = await e2e.sendText(`Apa saja tugasku?`, angieUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Ini daftar tugasmu:`)
    expect(e2e.extractText(reply)).toContain(`[1] Beli susu`)
  })

  it(`is honest when Google is not connected: email question says so`, async () => {
    const responses = await e2e.sendText(`Ada email apa hari ini?`, angieUser)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(e2e.extractText(reply)).toContain(`Google belum terhubung`)
  })

  it(`sends a typing indicator before the Angie reply`, async () => {
    const responses = await e2e.sendText(`Halo`, angieUser)
    expect(responses.map((c) => c.method)).toContain(`sendChatAction`)
  })
})

describe(`E2E: AngiePage — voice note`, () => {
  it(`transcribes voice via the worker pool and answers as Angie`, async () => {
    const responses = await e2e.sendVoice(angieVoiceUser)
    expect(responses.length).toBeGreaterThan(0)
    const reply = e2e.lastCall(`sendMessage`)!
    expect(reply).toBeDefined()
    const text = e2e.extractText(reply)
    expect(text).toContain(`🎙️ Kamu bilang: "Apa jadwalku besok?"`)
    expect(text).toContain(`Google belum terhubung`)
    // Bukti pool worker-thread benar-benar dipakai: 2 thread hidup.
    expect(TranscribePool.threadCount).toBe(2)
    expect(TranscribePool.launchedCount).toBe(2)
    // Transkrip + jawaban tersimpan di memori persisten.
    expect(bot.db.memory.list(4403).length).toBe(2)
  })
})
