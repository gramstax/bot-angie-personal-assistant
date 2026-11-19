/**
 * Bot language for DYNAMIC / logic strings: English (default) + Indonesian.
 *
 * Scope rule (strict, Damar 2026-11-19): the built-in Gramstax
 * multi-lang object is for STATIC TEMPLATE content messages only —
 * `<g-message>` / `<g-keyboard>` blocks with a `lang="id"` variant plus
 * the English default, selected by the user's `language_code`
 * (skill gramstax-best-practices, `template-i18n.md`; docs:
 * gramstax.mintlify.site). Static template text NEVER goes through this
 * class. This dictionary covers only strings the template system cannot
 * render: tool results, runtime errors, and other logic-built replies.
 * The per-user choice lives in LMDB (`UserSchema.botLang`, set via
 * /language) and is applied in `hookBeforeRoute` by overriding
 * `from.language_code`.
 *
 * Mapping rule: only `id` becomes Indonesian; any other code (en, en-US,
 * ...) falls back to English. This is deliberate — the bot supports
 * exactly two languages.
 */
export type Lang = `en` | `id`

type Dict = Record<string, {en: string; id: string}>

export class I18n {
  private static readonly dict: Dict = {
    // Language
    langChangedEn: {
      en: `Language set to English.`,
      id: `Bahasa diubah ke Inggris.`,
    },
    langChangedId: {
      en: `Language set to Indonesian.`,
      id: `Bahasa diubah ke Indonesia.`,
    },
    // Access control (AllowList, hookBeforeRoute)
    denyNotAllowed: {
      en: `Sorry, this Angie bot only serves allowed users.`,
      id: `Maaf, bot Angie ini hanya melayani pengguna yang diizinkan.`,
    },
    // Angie chat page (free text + voice)
    angieError: {
      en: `Sorry, something went wrong while I was processing your message. Please try again in a moment.`,
      id: `Maaf, ada yang salah saat aku memproses pesanmu. Coba lagi sebentar lagi ya.`,
    },
    angieVoiceEmpty: {
      en: `Sorry, I could not hear anything in that voice note. Please send it again or just type your message.`,
      id: `Maaf, aku tidak bisa mendengar isi voice note itu. Coba kirim lagi atau ketik saja pesannya.`,
    },
    angieVoiceFail: {
      en: `Sorry, transcribing that voice note failed. Please send it again or just type your message.`,
      id: `Maaf, transkripsi voice note gagal. Coba kirim lagi atau ketik saja pesannya.`,
    },
    angieVoicePrefix: {
      en: `🎙️ You said: "{text}"`,
      id: `🎙️ Kamu bilang: "{text}"`,
    },
    angieExhausted: {
      en: `I checked the data, but I ran out of steps to summarize it. Please ask again, more specifically.`,
      id: `Sudah kuperiksa datanya, tapi aku kehabisan langkah untuk merangkumnya. Coba tanya lagi dengan lebih spesifik ya.`,
    },
    angieNoAnswer: {
      en: `Sorry, I cannot answer that right now.`,
      id: `Maaf, aku tidak bisa menjawab itu sekarang.`,
    },
    // Angie mock replies (no OpenAI key / ANGIE_MOCK_AI=1)
    mockEcho: {
      en: `Noted. You said: "{text}". We have exchanged {turns} messages — anything else I can help with?`,
      id: `Baik, dicatat. Kamu bilang: "{text}". Kita sudah ngobrol {turns} pesan — ada lagi yang bisa kubantu?`,
    },
    mockLikeFound: {
      en: `You like {liked} — that is what you told me earlier.`,
      id: `Kamu suka {liked} — itu yang kamu bilang sebelumnya.`,
    },
    mockLikeNone: {
      en: `You have not told me about your likes yet. Tell me, and I will remember it.`,
      id: `Kamu belum pernah cerita soal kesukaanmu ke aku. Coba ceritakan, nanti kuingat.`,
    },
    mockLabelEmail: {
      en: `Here is a summary of your email:`,
      id: `Ini ringkasan emailmu:`,
    },
    mockLabelCalendar: {
      en: `Here is the schedule I found:`,
      id: `Ini jadwalku yang kutemukan:`,
    },
    mockLabelTasks: {
      en: `Here is your task list:`,
      id: `Ini daftar tugasmu:`,
    },
    mockLabelContacts: {
      en: `Here are the contacts I found:`,
      id: `Ini kontak yang kutemukan:`,
    },
    // Tool results (shared by live + mock)
    toolNoEmail: {
      en: `No unread emails today.`,
      id: `Tidak ada email unread hari ini.`,
    },
    toolNoEvents: {
      en: `No events on {date}.`,
      id: `Tidak ada acara pada {date}.`,
    },
    toolNoTasks: {
      en: `No tasks yet. Add one with /tambahtugas <text>.`,
      id: `Belum ada tugas. Tambah dengan /tambahtugas <teks>.`,
    },
    toolNoContacts: {
      en: `No contacts yet. Add one with /tambahkontak <name> | <email> | <phone>.`,
      id: `Belum ada kontak. Tambah dengan /tambahkontak <nama> | <email> | <telepon>.`,
    },
    toolNoContactsQuery: {
      en: `No contacts match "{query}".`,
      id: `Tidak ada kontak yang cocok dengan "{query}".`,
    },
    toolUnknown: {
      en: `Unknown tool: {name}`,
      id: `Tool tidak dikenal: {name}`,
    },
    // Google adapter (never fake data)
    googleNotConnected: {
      en: `Google is not connected — set GOOGLE_ACCESS_TOKEN in .env`,
      id: `Google belum terhubung — isi GOOGLE_ACCESS_TOKEN di .env`,
    },
    googleGmailError: {
      en: `Gmail error {status} — the token may have expired`,
      id: `Gmail error {status} — token mungkin kedaluwarsa`,
    },
    googleCalendarError: {
      en: `Google Calendar error {status} — the token may have expired`,
      id: `Google Calendar error {status} — token mungkin kedaluwarsa`,
    },
    // /email
    emailNotConnectedNote: {
      en: `Without that token I cannot read your email — and I will not make up its contents.`,
      id: `Tanpa token itu aku tidak bisa membaca emailmu — dan aku tidak akan mengarang isinya.`,
    },
    emailClean: {
      en: `✉️ Inbox clear — no unread emails today.`,
      id: `✉️ Inbox bersih — tidak ada email unread hari ini.`,
    },
    emailHeader: {
      en: `✉️ Unread emails today ({count}):`,
      id: `✉️ Email unread hari ini ({count}):`,
    },
    // /jadwal
    jadwalNotConnectedNote: {
      en: `Without that token I cannot read your calendar — and I will not make up its events.`,
      id: `Tanpa token itu aku tidak bisa membaca kalendermu — dan aku tidak akan mengarang acaranya.`,
    },
    jadwalNoEvents: {
      en: `📅 No events on {label}. Enjoy the free day.`,
      id: `📅 Tidak ada acara pada {label}. Harimu kosong, silakan dinikmati.`,
    },
    jadwalHeader: {
      en: `📅 Schedule for {label} ({count} events):`,
      id: `📅 Jadwal {label} ({count} acara):`,
    },
    jadwalToday: {
      en: `today`,
      id: `hari ini`,
    },
    // /tugas
    tugasEmpty: {
      en: `You have no tasks yet. Add one with /tambahtugas <text> — example: /tambahtugas Buy milk.`,
      id: `Kamu belum punya tugas. Tambah dengan /tambahtugas <teks> — contoh: /tambahtugas Beli susu.`,
    },
    tugasNoMatch: {
      en: `No tasks match "{filter}".`,
      id: `Tidak ada tugas yang cocok dengan "{filter}".`,
    },
    tugasHeader: {
      en: `📋 Your tasks ({done}/{total} done):`,
      id: `📋 Tugasmu ({done}/{total} selesai):`,
    },
    tugasDoneHint: {
      en: `Mark one done with /selesai <id> — example: /selesai 1.`,
      id: `Selesaikan dengan /selesai <id> — contoh: /selesai 1.`,
    },
    // /kontak
    kontakEmpty: {
      en: `You have not saved any contacts yet. Add one with /tambahkontak <name> | <email> | <phone> — example: /tambahkontak Budi | budi@mail.com | 08123456789.`,
      id: `Kamu belum menyimpan kontak. Tambah dengan /tambahkontak <nama> | <email> | <telepon> — contoh: /tambahkontak Budi | budi@mail.com | 08123456789.`,
    },
    kontakNoMatch: {
      en: `No contacts match "{query}". Add one with /tambahkontak <name> | <email> | <phone>.`,
      id: `Tidak ada kontak yang cocok dengan "{query}". Tambah dengan /tambahkontak <nama> | <email> | <telepon>.`,
    },
    kontakHeader: {
      en: `👤 Contacts ({count}):`,
      id: `👤 Kontak ({count}):`,
    },
    kontakHeaderQuery: {
      en: `👤 Contacts for "{query}" ({count}):`,
      id: `👤 Kontak untuk "{query}" ({count}):`,
    },
    // /tambahtugas
    addTaskPrompt: {
      en: `Write the task after the command — example: /tambahtugas Buy milk at the store.`,
      id: `Tulis tugasnya setelah perintah — contoh: /tambahtugas Beli susu di warung.`,
    },
    addTaskFull: {
      en: `You have reached the task limit (100). Finish a few first with /selesai <id>.`,
      id: `Tugasmu sudah mencapai batas (100). Selesaikan dulu beberapa dengan /selesai <id>.`,
    },
    addTaskAdded: {
      en: `✅ Task added: [{id}] {title}\n\nSee them all with /tugas.`,
      id: `✅ Tugas ditambahkan: [{id}] {title}\n\nLihat semuanya dengan /tugas.`,
    },
    // /tambahkontak
    addContactPrompt: {
      en: `The format is: /tambahkontak <name> | <email> | <phone>\nExample: /tambahkontak Budi | budi@mail.com | 08123456789\nEmail and phone may be left empty, but the name is required.`,
      id: `Formatnya: /tambahkontak <nama> | <email> | <telepon>\nContoh: /tambahkontak Budi | budi@mail.com | 08123456789\nEmail dan telepon boleh dikosongkan, tapi nama wajib ada.`,
    },
    addContactFull: {
      en: `You have reached the contact limit (200).`,
      id: `Kontakmu sudah mencapai batas (200).`,
    },
    addContactNoName: {
      en: `The name is missing. The format is: /tambahkontak <name> | <email> | <phone>.`,
      id: `Namanya belum ada. Formatnya: /tambahkontak <nama> | <email> | <telepon>.`,
    },
    addContactSaved: {
      en: `✅ Contact saved: {name}{extra}\n\nFind it with /kontak {name}.`,
      id: `✅ Kontak disimpan: {name}{extra}\n\nCari dengan /kontak {name}.`,
    },
    // /selesai
    donePrompt: {
      en: `Write the task number — example: /selesai 1. See the numbers with /tugas.`,
      id: `Tulis nomor tugasnya — contoh: /selesai 1. Lihat nomornya di /tugas.`,
    },
    doneInvalid: {
      en: `That task number is not valid: "{raw}". See the numbers with /tugas, then /selesai <id>.`,
      id: `Nomor tugasnya tidak valid: "{raw}". Lihat nomornya di /tugas, lalu /selesai <id>.`,
    },
    doneOk: {
      en: `✅ Task [{id}] done. Nice work!`,
      id: `✅ Tugas [{id}] selesai. Kerja bagus!`,
    },
    doneAlready: {
      en: `Task [{id}] was already done before.`,
      id: `Tugas [{id}] memang sudah selesai sebelumnya.`,
    },
    doneNotFound: {
      en: `There is no task with number [{id}]. See the list with /tugas.`,
      id: `Tidak ada tugas dengan nomor [{id}]. Lihat daftarnya di /tugas.`,
    },
    // /lupakan
    forgotten: {
      en: `Forgotten. Our chat starts from zero again — tell me anything from the beginning, and I will remember it again.`,
      id: `Sudah kulupakan. Obrolan kita mulai dari nol lagi — ceritakan apa pun dari awal, nanti kuingat lagi.`,
    },
  }

  static langOf(opts: {botLang?: unknown; telegramLang?: unknown}): Lang {
    // The typeof guard is REQUIRED, not paranoia: LMDB encoding is
    // positional, so a legacy row written before the botLang field existed
    // can read back as a non-string (e.g. a Date) — and calling
    // toLowerCase() on it throws a TypeError. A non-string value always
    // falls back to English and never crashes.
    const pick = (v?: unknown) => (typeof v === `string` && v.toLowerCase().startsWith(`id`) ? `id` : `en`)
    if (opts.botLang !== undefined) return pick(opts.botLang)
    return pick(opts.telegramLang)
  }

  static t(lang: Lang, key: keyof typeof I18n.dict, vars: Record<string, string | number> = {}): string {
    const entry = I18n.dict[key]
    let out = entry ? entry[lang] : key
    for (const [k, v] of Object.entries(vars)) out = out.split(`{${k}}`).join(String(v))
    return out
  }
}
