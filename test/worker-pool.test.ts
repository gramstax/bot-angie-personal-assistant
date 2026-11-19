import {afterAll, describe, expect, it} from "bun:test"
import {TranscribePool} from "../src/lib/transcribe-pool"

afterAll(async () => {
  await TranscribePool.shutdown()
})

describe(`TranscribePool (worker-thread)`, () => {
  it(`launches 2 workers and pings both (settled)`, async () => {
    const pings = await TranscribePool.ping()
    expect(pings.length).toBe(2)
    expect(pings.every((p) => p.ok)).toBe(true)
    expect(new Set(pings.map((p) => p.threadId)).size).toBe(2)
    expect(TranscribePool.threadCount).toBe(2)
  })

  it(`transcribes in mock mode via the pool, round-robin across workers`, async () => {
    const r1 = await TranscribePool.transcribe(``, `voice.ogg`, true)
    const r2 = await TranscribePool.transcribe(``, `voice.ogg`, true)
    expect(r1.via).toBe(`mock`)
    expect(r1.text).toBe(`Apa jadwalku besok?`)
    expect(r2.text).toBe(`Apa jadwalku besok?`)
    // Round-robin: dua panggilan berurutan dilayani worker berbeda.
    expect(r1.threadId).not.toBe(r2.threadId)
  })

  it(`shutdown is idempotent and the pool can be re-launched`, async () => {
    await TranscribePool.shutdown()
    expect(TranscribePool.threadCount).toBe(0)
    await TranscribePool.shutdown()
    const pings = await TranscribePool.ping()
    expect(pings.length).toBe(2)
  })
})
