import {afterAll, afterEach, beforeEach, describe, expect, it} from "bun:test"
import {mkdtempSync} from "node:fs"
import {tmpdir} from "node:os"
import {join} from "node:path"
import {Db} from "../src/db"
import {AngieService} from "../src/lib/angie"

const dbPath = mkdtempSync(join(tmpdir(), `angie-test-`))
const db = new Db(dbPath)
const USER = 777001

beforeEach(async () => {
  process.env.ANGIE_MOCK_AI = `1`
  process.env.OPENAI_API_KEY = ``
  process.env.GOOGLE_ACCESS_TOKEN = ``
  await db.memory.clear(USER)
  await db.tasks.clear(USER)
  await db.contacts.clear(USER)
})

afterEach(() => {
  process.env.ANGIE_MOCK_AI = ``
})

afterAll(async () => {
  await db.close()
})

describe(`AngieService (mock)`, () => {
  it(`answers free text in English by default and persists both turns`, async () => {
    const res = await AngieService.chat(db, USER, `Hello Angie`)
    expect(res.via).toBe(`mock`)
    expect(res.reply).toContain(`You said: "Hello Angie"`)
    expect(db.memory.list(USER).length).toBe(2)
  })

  it(`answers free text in Indonesian when lang is id`, async () => {
    const res = await AngieService.chat(db, USER, `Halo Angie`, `id`)
    expect(res.via).toBe(`mock`)
    expect(res.reply).toContain(`Kamu bilang: "Halo Angie"`)
    expect(db.memory.list(USER).length).toBe(2)
  })

  it(`remembers a like across turns (Indonesian)`, async () => {
    await AngieService.chat(db, USER, `Aku suka kopi tubruk`, `id`)
    const res = await AngieService.chat(db, USER, `Apa yang aku suka?`, `id`)
    expect(res.reply).toContain(`kopi tubruk`)
  })

  it(`remembers a like across turns (English)`, async () => {
    await AngieService.chat(db, USER, `I like black coffee`, `en`)
    const res = await AngieService.chat(db, USER, `What do I like?`, `en`)
    expect(res.reply).toContain(`black coffee`)
  })

  it(`uses the real LMDB task tool for task questions`, async () => {
    await db.tasks.add(USER, `Beli susu`)
    const res = await AngieService.chat(db, USER, `Apa saja tugasku?`, `id`)
    expect(res.toolsUsed).toContain(`get_tasks`)
    expect(res.reply).toContain(`[1] Beli susu`)
  })

  it(`uses the real LMDB contact tool for contact questions`, async () => {
    await db.contacts.add(USER, {name: `Budi`, email: `budi@mail.com`})
    const res = await AngieService.chat(db, USER, `Berapa nomor kontak Budi?`, `id`)
    expect(res.toolsUsed).toContain(`get_contacts`)
    expect(res.reply).toContain(`Budi`)
    expect(res.reply).toContain(`budi@mail.com`)
  })

  it(`does not invent Google data: email/calendar tools say not connected (English default)`, async () => {
    const email = await AngieService.chat(db, USER, `Any emails?`)
    expect(email.toolsUsed).toContain(`get_email`)
    expect(email.reply).toContain(`Google is not connected`)
    const cal = await AngieService.chat(db, USER, `What is my schedule tomorrow?`)
    expect(cal.toolsUsed).toContain(`get_calendar`)
    expect(cal.reply).toContain(`Google is not connected`)
  })

  it(`does not invent Google data: email/calendar tools say not connected (Indonesian)`, async () => {
    const email = await AngieService.chat(db, USER, `Ada email apa?`, `id`)
    expect(email.toolsUsed).toContain(`get_email`)
    expect(email.reply).toContain(`Google belum terhubung`)
    const cal = await AngieService.chat(db, USER, `Apa jadwalku besok?`, `id`)
    expect(cal.toolsUsed).toContain(`get_calendar`)
    expect(cal.reply).toContain(`Google belum terhubung`)
  })

  it(`caps memory at 10 turns`, async () => {
    for (let i = 0; i < 7; i++) {
      await AngieService.chat(db, USER, `pesan ${i}`)
    }
    expect(db.memory.list(USER).length).toBe(10)
  })
})
