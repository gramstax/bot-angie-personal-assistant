import {afterAll, beforeEach, describe, expect, it} from "bun:test"
import {bot, cmdEnUser, cmdIdUser, cmdStoredUser, e2e, resetEnv} from "./setup"
import {TranscribePool} from "../src/lib/transcribe-pool"

// Commands are ENGLISH ONLY (Damar, 2026-11-19 ~15:22 WIB — the bilingual
// command rule of 14:30 WIB was revoked so no multi-lang command is ever
// missed). There is no `intentCommandText` in any page's buildData();
// the command is the page name. The seven commands:
//   /tasks, /addtask, /done, /contact, /addcontact, /schedule, /forget
// (+ /start, /help, /email, /language, /status — identical in both
// languages). Indonesian spellings (/tugas, /tambahtugas, /selesai,
// /kontak, /tambahkontak, /jadwal, /lupakan) do NOT route: they hit the
// Route Not Found page.
//
// Message CONTENT is still bilingual (EN default + ID via static
// template) — an English command from an Indonesian user renders in
// Indonesian. Every test below sends the EN command with both the `en`
// and the `id` fixture and asserts the matching render language.

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

describe(`E2E: English-only commands — same page, EN + ID render`, () => {
  it(`tasks: /tasks lists tasks, EN for the en user, ID for the id user`, async () => {
    const en = await e2e.sendText(`/tasks`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`You have no tasks yet`)
    e2e.clearCalls()
    const id = await e2e.sendText(`/tasks`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Kamu belum punya tugas`)
  })

  it(`addtask: /addtask adds a task, EN for the en user, ID for the id user`, async () => {
    const en = await e2e.sendText(`/addtask Buy milk`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Task added: [1] Buy milk`)
    expect(bot.db.tasks.list(4961).length).toBe(1)
    e2e.clearCalls()
    const id = await e2e.sendText(`/addtask Beli susu`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Tugas ditambahkan: [1] Beli susu`)
    expect(bot.db.tasks.list(4962).length).toBe(1)
  })

  it(`done: /done marks a task done, EN for the en user, ID for the id user`, async () => {
    await bot.db.tasks.add(4961, `Buy milk`)
    await bot.db.tasks.add(4962, `Beli susu`)
    const en = await e2e.sendText(`/done 1`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Task [1] done`)
    expect(bot.db.tasks.list(4961)[0]!.done).toBe(true)
    e2e.clearCalls()
    const id = await e2e.sendText(`/done 1`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Tugas [1] selesai`)
    expect(bot.db.tasks.list(4962)[0]!.done).toBe(true)
  })

  it(`contact: /contact lists contacts, EN for the en user, ID for the id user`, async () => {
    const en = await e2e.sendText(`/contact`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`You have not saved any contacts yet`)
    e2e.clearCalls()
    const id = await e2e.sendText(`/contact`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Kamu belum menyimpan kontak`)
  })

  it(`addcontact: /addcontact saves a contact, EN for the en user, ID for the id user`, async () => {
    const en = await e2e.sendText(`/addcontact Budi | budi@mail.com`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Contact saved: Budi`)
    expect(bot.db.contacts.search(4961, `Budi`).length).toBe(1)
    e2e.clearCalls()
    const id = await e2e.sendText(`/addcontact Sari | sari@mail.com`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`✅ Kontak disimpan: Sari`)
    expect(bot.db.contacts.search(4962, `Sari`).length).toBe(1)
  })

  it(`schedule: /schedule shows the calendar page, EN for the en user, ID for the id user`, async () => {
    const en = await e2e.sendText(`/schedule`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Without that token I cannot read your calendar`)
    e2e.clearCalls()
    const id = await e2e.sendText(`/schedule`, cmdIdUser)
    expect(id.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Tanpa token itu aku tidak bisa membaca kalendermu`)
  })

  it(`forget: /forget clears memory, EN for the en user, ID for the id user`, async () => {
    await e2e.sendText(`I like tea`, cmdEnUser)
    await e2e.sendText(`Aku suka teh`, cmdIdUser)
    e2e.clearCalls()
    const en = await e2e.sendText(`/forget`, cmdEnUser)
    expect(en.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Forgotten.`)
    expect(bot.db.memory.list(4961).length).toBe(0)
    e2e.clearCalls()
    const id = await e2e.sendText(`/forget`, cmdIdUser)
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
    // The English command routes; the stored choice — not the Telegram
    // language_code — selects the render language.
    const res = await e2e.sendText(`/contact`, cmdStoredUser)
    expect(res.length).toBeGreaterThan(0)
    expect(e2e.extractText(e2e.lastCall(`sendMessage`)!)).toContain(`Kamu belum menyimpan kontak`)
  })

  // Indonesian spellings must NOT route — each must land on the Route
  // Not Found page (probe 2026-11-19: /tugas → "Rute Tidak Ditemukan"),
  // never on the page the English command opens.
  const dead: [string, string, string][] = [
    [`/tugas`, `You have no tasks yet`, `Kamu belum punya tugas`],
    [`/tambahtugas Beli susu`, `Task added`, `Tugas ditambahkan`],
    [`/selesai 1`, `Task [1] done`, `Tugas [1] selesai`],
    [`/kontak`, `You have not saved any contacts yet`, `Kamu belum menyimpan kontak`],
    [`/tambahkontak Sari | sari@mail.com`, `Contact saved`, `Kontak disimpan`],
    [`/jadwal`, `Without that token I cannot read your calendar`, `Tanpa token itu aku tidak bisa membaca kalendermu`],
    [`/lupakan`, `Forgotten.`, `Sudah kulupakan.`],
  ]
  for (const [cmd, enPage, idPage] of dead) {
    it(`Indonesian command ${cmd} does NOT route (Route Not Found)`, async () => {
      for (const user of [cmdEnUser, cmdIdUser]) {
        e2e.clearCalls()
        const res = await e2e.sendText(cmd, user)
        expect(res.length).toBeGreaterThan(0)
        const text = e2e.extractText(e2e.lastCall(`sendMessage`)!)
        expect(text).not.toContain(enPage)
        expect(text).not.toContain(idPage)
        expect(text).toMatch(/Route Not Found|Rute Tidak Ditemukan/)
      }
    })
  }
})
