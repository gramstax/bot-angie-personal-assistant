import {afterAll, beforeEach, describe, expect, it} from "bun:test"
import {bot, cmdEnUser, cmdIdUser, cmdStoredUser, e2e, resetEnv} from "./setup"
import {TranscribePool} from "../src/lib/transcribe-pool"

// Bilingual command text (skill e2e-coverage, "Intent variants"):
// every mapped intent in `intentCommandTextMap` is sent with a fixture
// carrying that language_code, and must reach the SAME page.
// EN (default) <-> ID map, declared in each page's buildData:
//   tasks/tugas, addtask/tambahtugas, done/selesai, contact/kontak,
//   addcontact/tambahkontak, schedule/jadwal, forget/lupakan.
// Commands identical in both languages (start/help/email/language/status)
// keep the buildData() default — the intent falls back to the page name.

beforeEach(async () => {
  e2e.clearCalls()
  await resetEnv()
  // Fresh stored-language state for the stored-choice user.
  await bot.db.user.setBotLang(cmdStoredUser.user.id, `en`, {
    username: cmdStoredUser.user.username,
    firstName: `Stored`,
    languageCode: `en`,
  })
})

afterAll(async () => {
  await TranscribePool.shutdown()
})

describe(`E2E: bilingual commands — same page, EN + ID`, () => {
  it(`tugas: /tasks (en) and /tugas (id) both list tasks`, async () => {
    const en = await e2e.sendText(`/tasks`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`You have no tasks yet`)
    e2e.clearCalls()
    const id = await e2e.sendText(`/tugas`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Kamu belum punya tugas`)
  })

  it(`tambahtugas: /addtask (en) and /tambahtugas (id) both add a task`, async () => {
    const en = await e2e.sendText(`/addtask Buy milk`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Task added: [1] Buy milk`)
    expect(bot.db.tasks.list(4961).length).toBe(1)
    e2e.clearCalls()
    const id = await e2e.sendText(`/tambahtugas Beli susu`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Tugas ditambahkan: [1] Beli susu`)
    expect(bot.db.tasks.list(4962).length).toBe(1)
  })

  it(`selesai: /done (en) and /selesai (id) both mark a task done`, async () => {
    await bot.db.tasks.add(4961, `Buy milk`)
    await bot.db.tasks.add(4962, `Beli susu`)
    const en = await e2e.sendText(`/done 1`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Task [1] done`)
    expect(bot.db.tasks.list(4961)[0]!.done).toBe(true)
    e2e.clearCalls()
    const id = await e2e.sendText(`/selesai 1`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Tugas [1] selesai`)
    expect(bot.db.tasks.list(4962)[0]!.done).toBe(true)
  })

  it(`kontak: /contact (en) and /kontak (id) both list contacts`, async () => {
    const en = await e2e.sendText(`/contact`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`You have not saved any contacts yet`)
    e2e.clearCalls()
    const id = await e2e.sendText(`/kontak`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Kamu belum menyimpan kontak`)
  })

  it(`tambahkontak: /addcontact (en) and /tambahkontak (id) both save a contact`, async () => {
    const en = await e2e.sendText(`/addcontact Budi | budi@mail.com`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Contact saved: Budi`)
    expect(bot.db.contacts.search(4961, `Budi`).length).toBe(1)
    e2e.clearCalls()
    const id = await e2e.sendText(`/tambahkontak Sari | sari@mail.com`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Kontak disimpan: Sari`)
    expect(bot.db.contacts.search(4962, `Sari`).length).toBe(1)
  })

  it(`jadwal: /schedule (en) and /jadwal (id) both show the calendar page`, async () => {
    const en = await e2e.sendText(`/schedule`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Without that token I cannot read your calendar`)
    e2e.clearCalls()
    const id = await e2e.sendText(`/jadwal`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Tanpa token itu aku tidak bisa membaca kalendermu`)
  })

  it(`lupakan: /forget (en) and /lupakan (id) both clear memory`, async () => {
    await e2e.sendText(`I like tea`, cmdEnUser)
    await e2e.sendText(`Aku suka teh`, cmdIdUser)
    e2e.clearCalls()
    const en = await e2e.sendText(`/forget`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Forgotten.`)
    expect(bot.db.memory.list(4961).length).toBe(0)
    e2e.clearCalls()
    const id = await e2e.sendText(`/lupakan`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Sudah kulupakan.`)
    expect(bot.db.memory.list(4962).length).toBe(0)
  })

  it(`stored botLang 'id' renders Indonesian even when the Telegram language_code is 'en'`, async () => {
    await bot.db.user.setBotLang(cmdStoredUser.user.id, `id`, {
      username: cmdStoredUser.user.username,
      firstName: `Stored`,
      languageCode: `en`,
    })
    // Both aliases route to the same page; the stored choice — not the
    // Telegram language_code — selects the render language.
    const idAlias = await e2e.sendText(`/kontak`, cmdStoredUser)
    expect(idAlias.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Kamu belum menyimpan kontak`)
    e2e.clearCalls()
    const enAlias = await e2e.sendText(`/contact`, cmdStoredUser)
    expect(enAlias.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Kamu belum menyimpan kontak`)
  })
})
