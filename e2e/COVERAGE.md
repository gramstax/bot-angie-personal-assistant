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
template). Tidak ada kamus string di code: semua pesan user-facing
hidup di `static template` (`<g-message>` / `<g-switch>` / `<g-map>` /
`<g-ifelse>`, EN default + `lang="id"`); helper/page hanya menghitung
data (state, baris list, kode error) dan melemparkannya sebagai
variabel template. Satu-satunya pengecualian yang didokumentasikan:
system prompt LLM dan token model-facing di `src/lib/angie.ts` (bukan
pesan user-facing). Keyboard multi-bahasa didefinisikan SEKALI di
`src/blocks/g-keyboard.ts` (`KeyboardGBlock.label` + `_build`); template
tidak pernah menulis `<g-keyboard>` dua kali. Deskripsi command
(`<g-description>`, EN + ID) ada di default `<g-base>` tiap page
command dan disinkronkan ke BotFather saat bot start
(`BotCore.executeSyncBlocksDescription`, dedup per nama command).
StatusPage tidak punya `handle*` sendiri — ia dirender lewat hook
(lihat baris hook di bawah).

| Page | Handler / state | Trigger | Test | Asserts |
| --- | --- | --- | --- | --- |
| start | handleCommandText | `/start` (user id) | e2e/start/index.test.ts | sendMessage + gmsg(start, default, {userName}, id) + gkb menu ID |
| start | handleCommandText (EN) | `/start` (user en) | e2e/start/index.test.ts | sendMessage + gmsg(start, default, {userName}, en) + gkb menu EN |
| start | handleCallbackQueryData | tombol Start (callback) | e2e/start/index.test.ts | editMessageText + gmsg(start, default, {userName}, id) + gkb |
| start | tombol Tasks dari /start | callback `tasks` | e2e/start/index.test.ts | editMessageText + daftar tugas tampil ("belum punya tugas") |
| help | handleCommandText | `/help` (user id) | e2e/help.test.ts | sendMessage + gmsg(help, default, {}, id) + gkb |
| help | handleCommandText (EN) | `/help` (user en) | e2e/help.test.ts | sendMessage + gmsg(help, default, {}, en) + gkb |
| help | handleCallbackQueryData | tombol Help dari /start | e2e/help.test.ts | editMessageText + gmsg(help, default, {}, id) + gkb |
| angie | handleFreeText (echo id) | teks bebas "Halo Angie" | e2e/angie.test.ts | sendMessage + gmsg(angie, default, {kind mock-echo, text, turns 1}, id) + memory 2 baris |
| angie | handleFreeText (echo en) | teks bebas "Hello Angie" | e2e/angie.test.ts | sendMessage + gmsg(angie, default, {kind mock-echo, text, turns 1}, en) |
| angie | handleFreeText (memori) | "Aku suka kopi tubruk" lalu "Apa yang aku suka?" | e2e/angie.test.ts | gmsg(angie, default, {kind mock-like-found, liked}, id) + memory 4 baris |
| angie | handleFreeText (tool tugas) | "Apa saja tugasku?" | e2e/angie.test.ts | gmsg(angie, default, {kind mock-tools-ok, label tasks, lines [⬜ [1] Beli susu]}, id) |
| angie | handleFreeText (tool email, Google off) | "Ada email apa hari ini?" | e2e/angie.test.ts | gmsg(angie, default, {kind mock-tools-noconnect, label email, code no-token}, id) |
| angie | handleFreeText (typing) | teks bebas | e2e/angie.test.ts | calls memuat sendChatAction sebelum balasan |
| angie | handleFreeVoice | voice note | e2e/angie.test.ts | transkrip "Apa jadwalku besok?" + balasan jadwal + threadCount pool 2 + memory 2 baris |
| tasks | handleCommandText (kosong id) | `/tugas` kosong | e2e/tasks.test.ts | sendMessage + gmsg(tasks, default, {state empty}, id) |
| tasks | handleCommandText (kosong en) | `/tasks` kosong | e2e/tasks.test.ts | sendMessage + gmsg(tasks, default, {state empty}, en) |
| tasks | handleCommandText (isi) | `/tugas` dengan 2 tugas, 1 selesai | e2e/tasks.test.ts | gmsg(tasks, default, {state list, done 1, total 2, tasks [✅ [1], ⬜ [2]]}, id) |
| tasks | handleCommandArgsText | `/tugas susu` | e2e/tasks.test.ts | hanya tugas yang cocok tampil |
| tasks | handleCommandArgsText (tak cocok) | `/tugas zzz` | e2e/tasks.test.ts | gmsg(tasks, default, {state nomatch, filter zzz}, id) |
| tasks | handleCallbackQueryData | tombol Tasks dari /start | e2e/tasks.test.ts | editMessageText + "[1] Beli susu" |
| addtask | handleCommandArgsText | `/tambahtugas Beli susu di warung` | e2e/addtask.test.ts | gmsg(addtask, default, {state added, id 1}, id) + DB 1 tugas |
| addtask | handleCommandArgsText (EN) | `/addtask Buy milk` (user en) | e2e/addtask.test.ts | gmsg(addtask, default, {state added, id 1}, en) + DB 1 tugas |
| addtask | handleCommandText | `/tambahtugas` tanpa argumen | e2e/addtask.test.ts | gmsg(addtask, default, {state prompt}, id) + DB tetap 0 |
| addtask | handleCommandArgsText (id naik) | tugas kedua | e2e/addtask.test.ts | balasan memuat "[2] Dua" |
| done | handleCommandArgsText | `/selesai 1` | e2e/done.test.ts | gmsg(done, default, {state ok, id 1}, id) + DB done=true |
| done | handleCommandArgsText (EN) | `/done 1` (user en) | e2e/done.test.ts | gmsg(done, default, {state ok, id 1}, en) + DB done=true |
| done | handleCommandArgsText (id tak ada) | `/selesai 99` | e2e/done.test.ts | gmsg(done, default, {state notfound, id 99}, id) |
| done | handleCommandArgsText (sudah selesai) | `/selesai 1` kedua kali | e2e/done.test.ts | gmsg(done, default, {state already, id 1}, id) |
| done | handleCommandArgsText (bukan angka) | `/selesai abc` | e2e/done.test.ts | gmsg(done, default, {state invalid, raw abc}, id) |
| done | handleCommandText | `/selesai` tanpa argumen | e2e/done.test.ts | gmsg(done, default, {state prompt}, id) |
| contact | handleCallbackQueryData | tombol Contacts dari /start | e2e/contact.test.ts | editMessageText + "👤 Budi" |
| contact | handleCommandText | `/kontak` kosong | e2e/contact.test.ts | gmsg(contact, default, {state empty}, id) |
| contact | handleCommandText (EN) | `/contact` kosong | e2e/contact.test.ts | gmsg(contact, default, {state empty}, en) |
| contact | handleCommandText (isi) | `/kontak` dengan 1 kontak | e2e/contact.test.ts | gmsg(contact, default, {state list, contacts [Budi + email + telepon]}, id) |
| contact | handleCommandArgsText | `/kontak sari` | e2e/contact.test.ts | hanya Sari tampil, Budi tidak |
| contact | handleCommandArgsText (tak cocok) | `/kontak zzz` | e2e/contact.test.ts | gmsg(contact, default, {state nomatch, query zzz}, id) |
| addcontact | handleCommandArgsText | `/tambahkontak Budi` + email + telepon | e2e/addcontact.test.ts | gmsg(addcontact, default, {state saved, name Budi, extra}, id) + DB email benar |
| addcontact | handleCommandArgsText (EN) | `/addcontact Budi` + email + telepon (user en) | e2e/addcontact.test.ts | gmsg(addcontact, default, {state saved}, en) + DB 1 kontak |
| addcontact | handleCommandArgsText (nama saja) | `/tambahkontak Sari` | e2e/addcontact.test.ts | "✅ Kontak disimpan: Sari" + phone undefined |
| addcontact | handleCommandArgsText (tanpa nama) | `/tambahkontak` dengan nama kosong (hanya email) | e2e/addcontact.test.ts | gmsg(addcontact, default, {state noname}, id) + DB tetap 0 |
| addcontact | handleCommandText | `/tambahkontak` tanpa argumen | e2e/addcontact.test.ts | gmsg(addcontact, default, {state prompt}, id) + DB tetap 0 |
| email | handleCommandText | `/email` tanpa token Google | e2e/email.test.ts | gmsg(email, default, {state noconnect, code no-token}, id) |
| email | handleCommandText (EN) | `/email` tanpa token (user en) | e2e/email.test.ts | gmsg(email, default, {state noconnect, code no-token}, en) |
| email | handleCallbackQueryData | tombol Email dari /start | e2e/email.test.ts | editMessageText + "Google belum terhubung" |
| email | handleCommandText (isi, fetch stub) | `/email` dengan token + stub fetch 1 email | e2e/email.test.ts | gmsg(email, default, {state list, count 1, items [Rapat besok]}, id) |
| schedule | handleCommandText | `/jadwal` tanpa token Google | e2e/schedule.test.ts | gmsg(schedule, default, {state noconnect, code no-token}, id) |
| schedule | handleCommandText (EN) | `/schedule` tanpa token (user en) | e2e/schedule.test.ts | gmsg(schedule, default, {state noconnect, code no-token}, en) |
| schedule | handleCommandArgsText | `/jadwal besok` tanpa token | e2e/schedule.test.ts | balasan memuat "Google belum terhubung" |
| schedule | handleCallbackQueryData | tombol Schedule dari /start | e2e/schedule.test.ts | editMessageText + "Google belum terhubung" |
| schedule | handleCommandText (isi, fetch stub) | `/jadwal` dengan token + stub fetch 1 acara | e2e/schedule.test.ts | gmsg(schedule, default, {state list, count 1, items [09:00–10:00 Rapat tim @ Ruang A]}, id) |
| forget | handleCommandText | `/lupakan` setelah 1 turn | e2e/forget.test.ts | gmsg(forget, default, {}, id) + memory 0 baris |
| forget | handleCommandText (lupa permanen) | "Apa yang aku suka?" setelah /lupakan | e2e/forget.test.ts | balasan "belum pernah cerita soal kesukaanmu" |
| language | handleCommandText | `/language` (user EN) | e2e/language.test.ts | sendMessage + gmsg(language, show, {}, en) + keyboard [🇬🇧 English, 🇮🇩 Indonesia, ⬅️ Back] |
| language | handleCommandText (varian id) | `/language` (user id) | e2e/language.test.ts | sendMessage + gmsg(language, show, {}, id) + keyboard [🇬🇧 English, 🇮🇩 Indonesia, ⬅️ Kembali] |
| language | handleCallbackQueryData | tombol Language dari /start | e2e/language.test.ts | editMessageText + gmsg(language, show, {}, en) |
| language | handleArgsCallbackQueryData (lang-id) | callback `lang-id` | e2e/language.test.ts | editMessageText + gmsg(language, done, {lang: Indonesia}, id) + /start berikutnya berbahasa Indonesia |
| language | handleArgsCallbackQueryData (lang-en) | callback `lang-en` setelah id | e2e/language.test.ts | editMessageText + gmsg(language, done, {lang: English}, en) + /start berikutnya berbahasa Inggris |
| language | handleArgsCallbackQueryData (balasan Angie ikut bahasa) | teks bebas setelah pilih id | e2e/language.test.ts | balasan mock 'Kamu bilang: "halo"' (Indonesia) |
| language | handleCommandText (default EN, user baru) | teks bebas tanpa pilihan bahasa | e2e/language.test.ts | balasan mock 'You said: "hello"' (English default) |
| tasks | handleCommandText (intent EN) | `/tasks` (user en) | e2e/commands-lang.test.ts | sendMessage "You have no tasks yet" |
| tasks | handleCommandText (intent ID) | `/tugas` (user id) | e2e/commands-lang.test.ts | sendMessage "Kamu belum punya tugas" |
| addtask | handleCommandArgsText (intent EN) | `/addtask Buy milk` (user en) | e2e/commands-lang.test.ts | sendMessage "✅ Task added: [1] Buy milk" + DB 1 tugas |
| addtask | handleCommandArgsText (intent ID) | `/tambahtugas Beli susu` (user id) | e2e/commands-lang.test.ts | sendMessage "✅ Tugas ditambahkan: [1] Beli susu" + DB 1 tugas |
| done | handleCommandArgsText (intent EN) | `/done 1` (user en) | e2e/commands-lang.test.ts | sendMessage "✅ Task [1] done" + DB done=true |
| done | handleCommandArgsText (intent ID) | `/selesai 1` (user id) | e2e/commands-lang.test.ts | sendMessage "✅ Tugas [1] selesai" + DB done=true |
| contact | handleCommandText (intent EN) | `/contact` (user en) | e2e/commands-lang.test.ts | sendMessage "You have not saved any contacts yet" |
| contact | handleCommandText (intent ID) | `/kontak` (user id) | e2e/commands-lang.test.ts | sendMessage "Kamu belum menyimpan kontak" |
| addcontact | handleCommandArgsText (intent EN) | `/addcontact Budi` + email (user en) | e2e/commands-lang.test.ts | sendMessage "✅ Contact saved: Budi" + DB 1 kontak |
| addcontact | handleCommandArgsText (intent ID) | `/tambahkontak Sari` + email (user id) | e2e/commands-lang.test.ts | sendMessage "✅ Kontak disimpan: Sari" + DB 1 kontak |
| schedule | handleCommandText (intent EN) | `/schedule` (user en) | e2e/commands-lang.test.ts | sendMessage "Without that token I cannot read your calendar" |
| schedule | handleCommandText (intent ID) | `/jadwal` (user id) | e2e/commands-lang.test.ts | sendMessage "Tanpa token itu aku tidak bisa membaca kalendermu" |
| forget | handleCommandText (intent EN) | `/forget` (user en) | e2e/commands-lang.test.ts | sendMessage "Forgotten." + memory 0 baris |
| forget | handleCommandText (intent ID) | `/lupakan` (user id) | e2e/commands-lang.test.ts | sendMessage "Sudah kulupakan." + memory 0 baris |
| contact | handleCommandText (botLang tersimpan) | `/kontak` + `/contact` (language_code en, botLang id) | e2e/commands-lang.test.ts | kedua alias routing ke halaman yang sama + render bahasa Indonesia |
| core | executeSyncBlocksDescription (g-description) | bot start (e2e: panggil langsung) | e2e/descriptions.test.ts | 2x setMyCommands (default EN + language_code id), 11 command unik tiap bahasa, deskripsi EN/ID persis |
| core | getGDescription (template manager) | langsung via bot.templateManager | e2e/descriptions.test.ts | semua 11 deskripsi EN + ID terbaca dari template tiap page |
| status | hookNotFoundPage (callback tak dikenal) | callback `nonexistent-callback-data` | e2e/status.test.ts | editMessageText + gmsg(status, nf, {}, id) |
| status | hookNotFoundPage (command tak dikenal) | `/does-not-exist` | e2e/status.test.ts | sendMessage + gmsg(status, nf, {}, id) |
| status | hookNotFoundPage (command tak dikenal, EN) | `/does-not-exist` (user en) | e2e/status.test.ts | sendMessage + gmsg(status, nf, {}, en) |
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
hook merender penolakan lewat template `StatusPage.gdenied` (EN default +
`lang="id"`, di bahasa pengguna) lalu return false. Bila env kosong,
semua diizinkan (mode dev) dengan peringatan log sekali.
Kedua arah (allow/deny) diuji di `e2e/coverage.test.ts`.
