# Angie — Personal AI Assistant (Telegram)

Repo: **`gramstax/bot-angie-personal-assistant`** (private).

Recreate **n8n workflow 2462 "Angie, personal AI assistant with Telegram
voice and text"** — TANPA n8n, murni **Gramstax 6.1.0 + TypeScript + Bun**.
File JSON n8n aslinya ada di `assets/n8n-2462-angie-personal-ai-assistant.json`.

Alur asli yang direplikasi: Trigger Telegram (teks/voice) → IF voice/text →
voice: Get Voice File → OpenAI Speech-to-Text → AI Assistant "Angie"
(GPT-4o-mini + Simple Memory, `memoryBufferWindow`, 10 turn, keyed by
Telegram user ID) → tools → balasan Markdown ke Telegram.

## Pemetaan n8n → Gramstax

| n8n | Bot ini |
| --- | --- |
| Telegram Trigger | `src/pages/angie.ts` — `handleFreeText` + `handleFreeVoice` |
| IF voice/text | Branch di page yang sama (voice → transkripsi dulu) |
| OpenAI Speech-to-Text | `src/workers/transcribe.ts` + `src/lib/transcribe-pool.ts` — Whisper via **@gramstax/worker-thread pool (2 worker, round-robin)** |
| AI Agent GPT-4o-mini | `src/lib/angie.ts` + `src/lib/openai.ts` — chat completions + function calling |
| Window Buffer Memory (volatile, keyed by user ID) | `src/db/schema/memory.ts` — **LMDB persisten, max 10 turn terakhir per user (improvement: konteks tidak hilang saat restart)** |
| Get Email (Gmail API) | `src/lib/google.ts` — Gmail REST `is:unread in:inbox -category:promotions`, filter tanggal |
| Get Calendar (Google Calendar) | `src/lib/google.ts` — Calendar REST per tanggal |
| Get Tasks (Baserow) | `src/db/schema/task.ts` + `src/pages/tugas.ts` — **@gramstax/lmdb** (bukan Baserow) |
| Get Contacts (Baserow) | `src/db/schema/contact.ts` + `src/pages/kontak.ts` — **@gramstax/lmdb** |
| Balasan Markdown | Template Gramstax (`{{reply}}`) berbahasa Indonesia |

## Perintah

- `/start` — perkenalan Angie + menu (Tugas, Kontak, Email, Jadwal, Bantuan)
- `/help` — bantuan lengkap
- Teks bebas apa pun — ngobrol dengan Angie (ingat 10 pesan terakhir)
- Voice note — ditranskripsi (Whisper), transkrip ditampilkan, lalu dijawab Angie
- `/tugas` — daftar tugas · `/tambahtugas <teks>` · `/selesai <id>`
- `/kontak [nama]` · `/tambahkontak <nama> | <email> | <telepon>`
- `/email` — email unread hari ini (bukan promo)
- `/jadwal [tanggal]` — acara hari itu (`/jadwal`, `/jadwal besok`, `/jadwal 2026-12-25`)
- `/lupakan` — hapus memori percakapan user itu

## Cara jalan

```bash
bun install
cp .env.example .env   # isi token (lihat bawah)
bun run dev            # atau: bun start
```

Verifikasi:

```bash
bun run typecheck      # tsc --noEmit
bun test test/         # 17 unit test
bun run test:e2e       # 51 e2e test (mock AI, tanpa kunci live)
bun run test:e2e:check # mirror + ledger COVERAGE.md
bun run test:all       # semua di atas (68 test)
bun run build:gramstax # 12 page, 12 route
```

## Token yang dibutuhkan (live)

| Token | Untuk | Bila kosong |
| --- | --- | --- |
| `BOT_TOKEN` (@BotFather) | Bot Telegram itu sendiri | Bot tidak bisa start |
| `OPENAI_API_KEY` | Jawaban AI gpt-4o-mini + Whisper | Bot tetap jalan, jawaban mode mock (sederhana, dari data LMDB) |
| `GOOGLE_ACCESS_TOKEN` | Gmail + Google Calendar (OAuth2, scope `gmail.readonly` + `calendar.readonly`) | Tool email/kalender menjawab jujur "belum terhubung" — **tidak ada data palsu** |
| `ANGIE_ALLOWED_IDS` | AllowList (ID Telegram, koma). Kosong = semua diizinkan (dev) | Semua diizinkan + peringatan log |

## Batasan yang sudah diverifikasi

- **Jalur live (OpenAI + Google) belum dites** — belum ada `BOT_TOKEN`,
  `OPENAI_API_KEY`, maupun Google OAuth dari Damar. Yang terbukti lewat tes
  adalah: scaffold Gramstax 6.1.0, LMDB (user/memory/task/contact), worker
  pool 2 thread (round-robin, mock transcribe), mock AI + tool routing,
  dan semua command/page via e2e harness. Jangan klaim live berfungsi
  sebelum token diisi dan dites dengan bot sungguhan.
- **Worker pool launch harus sekuensial, bukan `Promise.all`**: launch
  paralel berebut state export — terbukti di probe hanya 1 thread yang
  hidup; sekuensial menghasilkan 2 thread (lihat `src/lib/transcribe-pool.ts`).
- **Nama file page = nama route/command**: `src/pages/tasks.ts` akan
  menghasilkan `/tasks`, bukan `/tugas` — makanya file tugas bernama
  `tugas.ts` (insiden saat pengembangan, sudah diperbaiki).
- **Render dari pesan memakai `sendMessage`**, bukan `sendRichMessage`,
  pada Gramstax 6.1.0 — tes e2e menyesuaikan ini.
- **Google access token bisa kedaluwarsa**: adapter memakai Bearer token
  dari env apa adanya; belum ada auto-refresh (refresh token opsional,
  belum diimplementasikan — isi access token segar bila kedaluwarsa).
- Voice note live diunduh via `api.telegram.org/file/bot<token>/...`
  lalu dikirim ke Whisper sebagai OGG; ukuran file Telegram dibatasi
  Bot API (20 MB).
- Memori window: 10 turn terakhir per user; `/lupakan` menghapusnya.
- AllowList: bila `ANGIE_ALLOWED_IDS` diisi, user di luar daftar mendapat
  pesan penolakan dan update-nya ditolak di `hookBeforeRoute`.
