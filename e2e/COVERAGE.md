# Coverage ledger — gramstax-angie-bot

Skill gramstax-best-practices 6.1.0, `e2e-coverage.md`: satu baris per
handler dan per state interaktif. Baris tanpa nama file tes adalah
KEGAGALAN, bukan TODO. `Asserts` mencatat method + payload konkret.
Dicek mesin oleh `scripts/check-e2e-mirror.ts` (lapisan 1: mirror +
orphan) dan `scripts/check-e2e-handlers.ts` (lapisan 2: setiap `handle*`
di `src/pages` punya baris, setiap baris menamai file tes yang ada,
setiap file tes dirujuk minimal satu baris).

Semua template bilingual: blok default berbahasa Inggris + varian
lang="id" (multi-lang object bawaan Gramstax untuk konten statis
template). String dinamis/logika lewat kamus `src/lib/i18n.ts`
(English default, Indonesian per user via `/language`).
StatusPage tidak punya `handle*` sendiri — ia dirender lewat hook
(lihat baris hook di bawah).

| Page | Handler / state | Trigger | Test | Asserts |
| --- | --- | --- | --- | --- |
| start | handleCommandText | `/start` | e2e/start/index.test.ts | sendMessage + teks "Halo ..., aku Angie!" + gkb(start, default, inline) |
| start | handleCallbackQueryData | tombol Start (callback) | e2e/start/index.test.ts | editMessageText + gmsg(start, default, {userName}) + gkb |
| start | tombol Tasks dari /start | callback `tugas` | e2e/start/index.test.ts | editMessageText + daftar tugas tampil |
| help | handleCommandText | `/help` | e2e/help.test.ts | sendMessage + gmsg(help, default) + gkb |
| help | handleCallbackQueryData | tombol Help dari /start | e2e/help.test.ts | editMessageText + gmsg(help, default) + gkb |
| angie | handleFreeText | teks bebas "Halo Angie" | e2e/angie.test.ts | sendMessage + gmsg(angie, default, {reply mock}) + memory 2 baris |
| angie | handleFreeText (memori) | "Aku suka kopi tubruk" lalu "Apa yang aku suka?" | e2e/angie.test.ts | balasan "Kamu suka kopi tubruk" + memory 4 baris |
| angie | handleFreeText (tool tugas) | "Apa saja tugasku?" | e2e/angie.test.ts | balasan memuat "[1] Beli susu" dari LMDB |
| angie | handleFreeText (tool email, Google off) | "Ada email apa hari ini?" | e2e/angie.test.ts | balasan memuat "Google belum terhubung" |
| angie | handleFreeText (typing) | teks bebas | e2e/angie.test.ts | calls memuat sendChatAction sebelum balasan |
| angie | handleFreeVoice | voice note | e2e/angie.test.ts | transkrip "Apa jadwalku besok?" + balasan jadwal + threadCount pool 2 + memory 2 baris |
| tugas | handleCommandText | `/tugas` kosong | e2e/tugas.test.ts | sendMessage + gmsg(tugas, default, {reply kosong}) |
| tugas | handleCommandText (isi) | `/tugas` dengan 2 tugas, 1 selesai | e2e/tugas.test.ts | "(1/2 selesai)" + ✅ [1] + ⬜ [2] |
| tugas | handleCommandArgsText | `/tugas susu` | e2e/tugas.test.ts | hanya tugas yang cocok tampil |
| tugas | handleCallbackQueryData | tombol Tugas dari /start | e2e/tugas.test.ts | editMessageText + "[1] Beli susu" |
| tambahtugas | handleCommandArgsText | `/tambahtugas Beli susu di warung` | e2e/tambahtugas.test.ts | gmsg(tambahtugas, default, {reply "[1]..."}) + DB 1 tugas |
| tambahtugas | handleCommandText | `/tambahtugas` tanpa argumen | e2e/tambahtugas.test.ts | prompt "Tulis tugasnya setelah perintah" + DB tetap 0 |
| tambahtugas | handleCommandArgsText (id naik) | tugas kedua | e2e/tambahtugas.test.ts | balasan memuat "[2] Dua" |
| selesai | handleCommandArgsText | `/selesai 1` | e2e/selesai.test.ts | gmsg(selesai, default, {reply selesai}) + DB done=true |
| selesai | handleCommandArgsText (id tak ada) | `/selesai 99` | e2e/selesai.test.ts | "Tidak ada tugas dengan nomor [99]" |
| selesai | handleCommandArgsText (sudah selesai) | `/selesai 1` kedua kali | e2e/selesai.test.ts | "sudah selesai sebelumnya" |
| selesai | handleCommandArgsText (bukan angka) | `/selesai abc` | e2e/selesai.test.ts | "Nomor tugasnya tidak valid" |
| selesai | handleCommandText | `/selesai` tanpa argumen | e2e/selesai.test.ts | prompt "Tulis nomor tugasnya" |
| kontak | handleCallbackQueryData | tombol Kontak dari /start | e2e/kontak.test.ts | editMessageText + "👤 Budi" |
| kontak | handleCommandText | `/kontak` kosong | e2e/kontak.test.ts | balasan memuat "belum menyimpan kontak" + /tambahkontak |
| kontak | handleCommandText (isi) | `/kontak` dengan 1 kontak | e2e/kontak.test.ts | "👤 Budi" + email + telepon |
| kontak | handleCommandArgsText | `/kontak sari` | e2e/kontak.test.ts | hanya Sari tampil, Budi tidak |
| kontak | handleCommandArgsText (tak cocok) | `/kontak zzz` | e2e/kontak.test.ts | 'Tidak ada kontak yang cocok dengan "zzz"' |
| tambahkontak | handleCommandArgsText | `/tambahkontak Budi` + email + telepon | e2e/tambahkontak.test.ts | gmsg(tambahkontak, default, {reply tersimpan}) + DB email benar |
| tambahkontak | handleCommandArgsText (nama saja) | `/tambahkontak Sari` | e2e/tambahkontak.test.ts | "✅ Kontak disimpan: Sari" + phone undefined |
| tambahkontak | handleCommandText | `/tambahkontak` tanpa argumen | e2e/tambahkontak.test.ts | prompt "Formatnya: /tambahkontak" + DB tetap 0 |
| email | handleCommandText | `/email` tanpa token Google | e2e/email.test.ts | balasan memuat "Google belum terhubung" + "tidak akan mengarang isinya" |
| email | handleCallbackQueryData | tombol Email dari /start | e2e/email.test.ts | editMessageText + "Google belum terhubung" |
| jadwal | handleCommandText | `/jadwal` tanpa token Google | e2e/jadwal.test.ts | balasan memuat "Google belum terhubung" + "tidak akan mengarang acaranya" |
| jadwal | handleCommandArgsText | `/jadwal besok` tanpa token | e2e/jadwal.test.ts | balasan memuat "Google belum terhubung" |
| jadwal | handleCallbackQueryData | tombol Jadwal dari /start | e2e/jadwal.test.ts | editMessageText + "Google belum terhubung" |
| lupakan | handleCommandText | `/lupakan` setelah 1 turn | e2e/lupakan.test.ts | gmsg(lupakan, default, {reply "Sudah kulupakan"}) + memory 0 baris |
| lupakan | handleCommandText (lupa permanen) | "Apa yang aku suka?" setelah /lupakan | e2e/lupakan.test.ts | balasan "belum pernah cerita soal kesukaanmu" |
| language | handleCommandText | `/language` (user EN) | e2e/language.test.ts | sendMessage + gmsg(language, show, {}, en) + keyboard [🇬🇧 English, 🇮🇩 Indonesia, ⬅️ Back] |
| language | handleCommandText (varian id) | `/language` (user id) | e2e/language.test.ts | sendMessage + gmsg(language, show, {}, id) |
| language | handleCallbackQueryData | tombol Language dari /start | e2e/language.test.ts | editMessageText + gmsg(language, show, {}, en) |
| language | handleArgsCallbackQueryData (lang-id) | callback `lang-id` | e2e/language.test.ts | editMessageText + gmsg(language, done, {lang: Indonesia}, id) + /start berikutnya berbahasa Indonesia |
| language | handleArgsCallbackQueryData (lang-en) | callback `lang-en` setelah id | e2e/language.test.ts | editMessageText + gmsg(language, done, {lang: English}, en) + /start berikutnya berbahasa Inggris |
| language | handleArgsCallbackQueryData (balasan Angie ikut bahasa) | teks bebas setelah pilih id | e2e/language.test.ts | balasan mock 'Kamu bilang: "halo"' (Indonesia) |
| language | handleCommandText (default EN, user baru) | teks bebas tanpa pilihan bahasa | e2e/language.test.ts | balasan mock 'You said: "hello"' (English default) |
| tugas | handleCommandText (intent EN) | `/tasks` (user en) | e2e/commands-i18n.test.ts | sendMessage "You have no tasks yet" |
| tugas | handleCommandText (intent ID) | `/tugas` (user id) | e2e/commands-i18n.test.ts | sendMessage "Kamu belum punya tugas" |
| tambahtugas | handleCommandArgsText (intent EN) | `/addtask Buy milk` (user en) | e2e/commands-i18n.test.ts | sendMessage "✅ Task added: [1] Buy milk" + DB 1 tugas |
| tambahtugas | handleCommandArgsText (intent ID) | `/tambahtugas Beli susu` (user id) | e2e/commands-i18n.test.ts | sendMessage "✅ Tugas ditambahkan: [1] Beli susu" + DB 1 tugas |
| selesai | handleCommandArgsText (intent EN) | `/done 1` (user en) | e2e/commands-i18n.test.ts | sendMessage "✅ Task [1] done" + DB done=true |
| selesai | handleCommandArgsText (intent ID) | `/selesai 1` (user id) | e2e/commands-i18n.test.ts | sendMessage "✅ Tugas [1] selesai" + DB done=true |
| kontak | handleCommandText (intent EN) | `/contact` (user en) | e2e/commands-i18n.test.ts | sendMessage "You have not saved any contacts yet" |
| kontak | handleCommandText (intent ID) | `/kontak` (user id) | e2e/commands-i18n.test.ts | sendMessage "Kamu belum menyimpan kontak" |
| tambahkontak | handleCommandArgsText (intent EN) | `/addcontact Budi` + email (user en) | e2e/commands-i18n.test.ts | sendMessage "✅ Contact saved: Budi" + DB 1 kontak |
| tambahkontak | handleCommandArgsText (intent ID) | `/tambahkontak Sari` + email (user id) | e2e/commands-i18n.test.ts | sendMessage "✅ Kontak disimpan: Sari" + DB 1 kontak |
| jadwal | handleCommandText (intent EN) | `/schedule` (user en) | e2e/commands-i18n.test.ts | sendMessage "Without that token I cannot read your calendar" |
| jadwal | handleCommandText (intent ID) | `/jadwal` (user id) | e2e/commands-i18n.test.ts | sendMessage "Tanpa token itu aku tidak bisa membaca kalendermu" |
| lupakan | handleCommandText (intent EN) | `/forget` (user en) | e2e/commands-i18n.test.ts | sendMessage "Forgotten." + memory 0 baris |
| lupakan | handleCommandText (intent ID) | `/lupakan` (user id) | e2e/commands-i18n.test.ts | sendMessage "Sudah kulupakan." + memory 0 baris |
| kontak | handleCommandText (botLang tersimpan) | `/kontak` + `/contact` (language_code en, botLang id) | e2e/commands-i18n.test.ts | kedua alias routing ke halaman yang sama + render bahasa Indonesia |
| status | hookNotFoundPage (callback tak dikenal) | callback `nonexistent-callback-data` | e2e/status.test.ts | editMessageText + gmsg(status, nf) |
| status | hookNotFoundPage (command tak dikenal) | `/does-not-exist` | e2e/status.test.ts | sendMessage + gmsg(status, nf) |
| status | handleFreeText (teks bebas = Angie) | teks "halo angie" | e2e/status.test.ts | sendMessage balasan Angie, BUKAN gmsg(status, nf) |
| core | hookBeforeRoute (AllowList deny) | `/start` sebagai user di luar ANGIE_ALLOWED_IDS | e2e/coverage.test.ts | sendMessage "hanya melayani pengguna yang diizinkan", tanpa render start |
| core | hookBeforeRoute (AllowList allow) | `/start` sebagai user di ANGIE_ALLOWED_IDS | e2e/coverage.test.ts | sendMessage "aku Angie" |
| core | hookBeforeRoute (tanpa username) | `/start` tanpa username | e2e/coverage.test.ts | sendMessage "aku Angie" (guard username TIDAK dipakai) |
| core | hookBeforeRoute (registrasi user) | update apa pun sebagai user baru | e2e/db-lmdb.test.ts | createIfNotExists idempotent + count >= 1 |
| core | memory window cap | 12 turn ditulis langsung ke DB | e2e/coverage.test.ts | list 10 turn, pertama "turn 3", terakhir "turn 12" |
| core | worker pool health | TranscribePool.ping() | e2e/coverage.test.ts | 2 ping ok, 2 threadId berbeda |
| core | repositories | DB langsung (task/contact/memory) | e2e/db-lmdb.test.ts | add/complete/remove/search/clear + usage.total > 0 |

## Guards — AllowList di hookBeforeRoute

Tidak ada page yang extends GuardBase/PageAdminBase (keduanya tetap ada
di `src/base/` sebagai tool scaffold, bukan gate aktif). Gate yang aktif
adalah bot-level AllowList di `BotCore.hookBeforeRoute`: bila
`ANGIE_ALLOWED_IDS` tidak kosong dan id pengguna tidak ada di dalamnya,
hook merender penolakan lewat `ctx.api.sendMessage` lalu return false.
Bila env kosong, semua diizinkan (mode dev) dengan peringatan log sekali.
Kedua arah (allow/deny) diuji di `e2e/coverage.test.ts`.
