import {beforeEach, describe, expect, it} from "bun:test"
import {bot, e2e} from "./setup"

/**
 * `<g-description>` sync: every command page declares its BotFather
 * description in its OWN template's default `<g-base>` (EN default +
 * `lang="id"`). On bot start the framework calls
 * `executeSyncBlocksDescription` (BotCore overrides it to dedupe — see
 * src/core/bot.ts), which resolves each command through
 * `getGDescription` and syncs via `setMyCommands` per language.
 *
 * NOTE (framework finding, 2026-11-19): descriptions CANNOT be
 * centralized in start/index.ts — the sync reads
 * `getGDescription("<page-name>", "default", lang, scope)`, so a
 * description placed in start's template would only ever sync /start.
 * Each page carries its own block; this test proves the sync sees all 11.
 */
const EN: Record<string, string> = {
  addcontact: `Add a contact`,
  addtask: `Add a new task`,
  contact: `Find a contact`,
  done: `Mark a task done`,
  email: `Today's unread emails`,
  forget: `Erase my memory of this chat`,
  help: `Full help and command list`,
  language: `Switch language (English / Indonesia)`,
  schedule: `See events for a day`,
  start: `Introduction and main menu`,
  tasks: `See your tasks`,
}

const ID: Record<string, string> = {
  addcontact: `Tambah kontak`,
  addtask: `Tambah tugas baru`,
  contact: `Cari kontak`,
  done: `Tandai tugas selesai`,
  email: `Email unread hari ini`,
  forget: `Hapus ingatanku tentang obrolan ini`,
  help: `Bantuan lengkap dan daftar perintah`,
  language: `Ganti bahasa (English / Indonesia)`,
  schedule: `Lihat acara hari itu`,
  start: `Perkenalan dan menu utama`,
  tasks: `Lihat daftar tugasmu`,
}

function commandsOf(call: {body?: {commands?: {command: string; description: string}[]}}): {command: string; description: string}[] {
  return call.body?.commands ?? []
}

describe(`E2E: <g-description> sync (BotFather command list)`, () => {
  beforeEach(() => {
    e2e.clearCalls()
  })

  it(`syncs exactly 11 commands, once each, in English (default) and Indonesian`, async () => {
    await bot.executeSyncBlocksDescription(bot.pages)
    const calls = e2e.calls.filter((c) => c.method === `setMyCommands`)
    expect(calls.length).toBe(2)

    const def = calls.find((c) => (c as {body?: {language_code?: string}}).body?.language_code === undefined)!
    const id = calls.find((c) => (c as {body?: {language_code?: string}}).body?.language_code === `id`)!
    expect(def).toBeDefined()
    expect(id).toBeDefined()

    // One entry per command — the bilingual intentCommandTextMap must NOT
    // duplicate a command in the menu (see the BotCore override).
    const enCommands = commandsOf(def as never)
    const idCommands = commandsOf(id as never)
    expect(enCommands.length).toBe(11)
    expect(idCommands.length).toBe(11)
    expect(new Set(enCommands.map((c) => c.command)).size).toBe(11)
    expect(new Set(idCommands.map((c) => c.command)).size).toBe(11)

    const byName = (list: {command: string; description: string}[]) =>
      Object.fromEntries(list.map((c) => [c.command, c.description]))
    expect(byName(enCommands)).toEqual(EN)
    expect(byName(idCommands)).toEqual(ID)
  })

  it(`resolves every description through the template manager directly`, async () => {
    const tm = (bot as unknown as {templateManager: {getGDescription: (key: string, base: string, lang: string) => {text: string}}}).templateManager
    for (const [command, text] of Object.entries(EN)) {
      expect(tm.getGDescription(command, `default`, `en`).text).toBe(text)
    }
    for (const [command, text] of Object.entries(ID)) {
      expect(tm.getGDescription(command, `default`, `id`).text).toBe(text)
    }
  })
})
