import {describe, expect, it} from "bun:test"
import {I18n} from "../src/lib/i18n"

// Keys used across pages, lib/angie.ts, lib/google.ts and the language page.
const KEYS = [
  `langChangedEn`,
  `langChangedId`,
  `denyNotAllowed`,
  `angieError`,
  `angieVoiceEmpty`,
  `angieVoiceFail`,
  `angieVoicePrefix`,
  `angieExhausted`,
  `angieNoAnswer`,
  `mockEcho`,
  `mockLikeFound`,
  `mockLikeNone`,
  `mockLabelEmail`,
  `mockLabelCalendar`,
  `mockLabelTasks`,
  `mockLabelContacts`,
  `toolNoEmail`,
  `toolNoEvents`,
  `toolNoTasks`,
  `toolNoContacts`,
  `toolNoContactsQuery`,
  `toolUnknown`,
  `googleNotConnected`,
  `googleGmailError`,
  `googleCalendarError`,
  `emailNotConnectedNote`,
  `emailClean`,
  `emailHeader`,
  `jadwalNotConnectedNote`,
  `jadwalNoEvents`,
  `jadwalHeader`,
  `jadwalToday`,
  `tugasEmpty`,
  `tugasNoMatch`,
  `tugasHeader`,
  `tugasDoneHint`,
  `kontakEmpty`,
  `kontakNoMatch`,
  `kontakHeader`,
  `kontakHeaderQuery`,
  `addTaskPrompt`,
  `addTaskFull`,
  `addTaskAdded`,
  `addContactPrompt`,
  `addContactFull`,
  `addContactNoName`,
  `addContactSaved`,
  `donePrompt`,
  `doneInvalid`,
  `doneOk`,
  `doneAlready`,
  `doneNotFound`,
  `forgotten`,
] as const

describe(`I18n — dynamic-string dictionary (English default, Indonesian per user)`, () => {
  it(`langOf accepts only 'id' as Indonesian`, () => {
    expect(I18n.langOf({botLang: `id`})).toBe(`id`)
    expect(I18n.langOf({botLang: `en`})).toBe(`en`)
    expect(I18n.langOf({botLang: undefined})).toBe(`en`)
    expect(I18n.langOf({})).toBe(`en`)
  })

  it(`langOf ignores non-string values (LMDB positional-shift guard)`, () => {
    expect(I18n.langOf({botLang: new Date()})).toBe(`en`)
    expect(I18n.langOf({botLang: 123})).toBe(`en`)
    expect(I18n.langOf({botLang: null})).toBe(`en`)
    expect(I18n.langOf({botLang: {}})).toBe(`en`)
  })

  it(`langOf falls back to Telegram language_code when no stored choice`, () => {
    expect(I18n.langOf({botLang: undefined, telegramLang: `id`})).toBe(`id`)
    expect(I18n.langOf({botLang: undefined, telegramLang: `id-ID`})).toBe(`id`)
    expect(I18n.langOf({botLang: undefined, telegramLang: `en-US`})).toBe(`en`)
    expect(I18n.langOf({botLang: undefined, telegramLang: `ru`})).toBe(`en`)
  })

  it(`stored botLang wins over Telegram language_code`, () => {
    expect(I18n.langOf({botLang: `en`, telegramLang: `id`})).toBe(`en`)
    expect(I18n.langOf({botLang: `id`, telegramLang: `en`})).toBe(`id`)
  })

  it(`t() returns English by default and Indonesian for id`, () => {
    expect(I18n.t(`en`, `denyNotAllowed`)).toContain(`only serves allowed users`)
    expect(I18n.t(`id`, `denyNotAllowed`)).toContain(`hanya melayani pengguna yang diizinkan`)
    expect(I18n.t(`en`, `mockEcho`)).toContain(`You said`)
    expect(I18n.t(`id`, `mockEcho`)).toContain(`Kamu bilang`)
    expect(I18n.t(`en`, `googleNotConnected`)).toContain(`not connected`)
    expect(I18n.t(`id`, `googleNotConnected`)).toContain(`belum terhubung`)
  })

  it(`t() interpolates variables in both languages`, () => {
    expect(I18n.t(`en`, `mockEcho`, {text: `hello`, turns: 2})).toContain(`"hello"`)
    expect(I18n.t(`id`, `mockEcho`, {text: `halo`, turns: 2})).toContain(`"halo"`)
  })

  it(`every known key has a non-empty string in both languages`, () => {
    for (const key of KEYS) {
      const en = I18n.t(`en`, key)
      const id = I18n.t(`id`, key)
      expect(typeof en).toBe(`string`)
      expect(en.length).toBeGreaterThan(0)
      expect(en).not.toBe(key)
      expect(typeof id).toBe(`string`)
      expect(id.length).toBeGreaterThan(0)
      expect(id).not.toBe(key)
    }
  })
})
