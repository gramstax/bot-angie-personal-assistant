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
  it(`echoes free text as structured data and persists both turns`, async () => {
    const res = await AngieService.chat(db, USER, `Hello Angie`)
    expect(res.via).toBe(`mock`)
    expect(res.kind).toBe(`mock-echo`)
    expect(res.text).toBe(`Hello Angie`)
    expect(res.turns).toBe(1)
    expect(db.memory.list(USER).length).toBe(2)
  })

  it(`echoes free text in Indonesian the same way (language lives in the template, not here)`, async () => {
    const res = await AngieService.chat(db, USER, `Halo Angie`, `id`)
    expect(res.via).toBe(`mock`)
    expect(res.kind).toBe(`mock-echo`)
    expect(res.text).toBe(`Halo Angie`)
    expect(db.memory.list(USER).length).toBe(2)
  })

  it(`remembers a like across turns (Indonesian)`, async () => {
    await AngieService.chat(db, USER, `Aku suka kopi tubruk`, `id`)
    const res = await AngieService.chat(db, USER, `Apa yang aku suka?`, `id`)
    expect(res.kind).toBe(`mock-like-found`)
    expect(res.liked).toContain(`kopi tubruk`)
  })

  it(`remembers a like across turns (English)`, async () => {
    await AngieService.chat(db, USER, `I like black coffee`, `en`)
    const res = await AngieService.chat(db, USER, `What do I like?`, `en`)
    expect(res.kind).toBe(`mock-like-found`)
    expect(res.liked).toContain(`black coffee`)
  })

  it(`reports no like found when memory has none`, async () => {
    const res = await AngieService.chat(db, USER, `Apa yang aku suka?`, `id`)
    expect(res.kind).toBe(`mock-like-none`)
    expect(res.liked).toBeUndefined()
  })

  it(`uses the real LMDB task tool for task questions`, async () => {
    await db.tasks.add(USER, `Beli susu`)
    const res = await AngieService.chat(db, USER, `Apa saja tugasku?`, `id`)
    expect(res.kind).toBe(`mock-tools-ok`)
    expect(res.label).toBe(`tasks`)
    expect(res.toolsUsed).toContain(`get_tasks`)
    expect(res.lines).toContain(`⬜ [1] Beli susu`)
  })

  it(`reports an empty task list as tools-empty, not as invented lines`, async () => {
    const res = await AngieService.chat(db, USER, `Apa saja tugasku?`, `id`)
    expect(res.kind).toBe(`mock-tools-empty`)
    expect(res.label).toBe(`tasks`)
    expect(res.lines).toEqual([])
  })

  it(`uses the real LMDB contact tool for contact questions`, async () => {
    await db.contacts.add(USER, {name: `Budi`, email: `budi@mail.com`})
    const res = await AngieService.chat(db, USER, `Berapa nomor kontak Budi?`, `id`)
    expect(res.kind).toBe(`mock-tools-ok`)
    expect(res.label).toBe(`contacts`)
    expect(res.toolsUsed).toContain(`get_contacts`)
    expect(res.lines[0]).toContain(`Budi`)
    expect(res.lines[0]).toContain(`budi@mail.com`)
  })

  it(`does not invent Google data: email/calendar tools report not-connected with a code`, async () => {
    const email = await AngieService.chat(db, USER, `Any emails?`)
    expect(email.kind).toBe(`mock-tools-noconnect`)
    expect(email.label).toBe(`email`)
    expect(email.code).toBe(`no-token`)
    expect(email.toolsUsed).toContain(`get_email`)
    const cal = await AngieService.chat(db, USER, `What is my schedule tomorrow?`)
    expect(cal.kind).toBe(`mock-tools-noconnect`)
    expect(cal.label).toBe(`calendar`)
    expect(cal.code).toBe(`no-token`)
    expect(cal.toolsUsed).toContain(`get_calendar`)
  })

  it(`caps memory at 10 turns`, async () => {
    for (let i = 0; i < 7; i++) {
      await AngieService.chat(db, USER, `pesan ${i}`)
    }
    expect(db.memory.list(USER).length).toBe(10)
  })
})
