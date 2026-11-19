# assets/

File `.json` n8n asli yang direcreate oleh bot ini — wajib ada di setiap
project recreate (aturan Damar 2026-11-19).

## `n8n-2462-angie-personal-ai-assistant.json`

- Sumber: template n8n 2462, "Angie, personal AI assistant with Telegram
  voice and text" — https://n8n.io/workflows/2462-angie-personal-ai-assistant-with-telegram-voice-and-text/
- Diambil: 2026-11-19 via API template publik
  https://api.n8n.io/workflows/templates/2462 (halaman n8n.io sendiri tidak
  menyediakan link download file — hanya tombol "Copy template to
  clipboard (JSON)").
- Isi terverifikasi: 15 node, koneksi lengkap.
  - Trigger: `Listen for incoming events` (Telegram Trigger, message)
  - `AllowList` (Set, `<chat id>`) → `If1` (cek `from.id == allow`)
  - `Voice or Text` (Set) → `If` (teks kosong = voice)
  - Voice: `Get Voice File` (Telegram file) → `Speech to Text`
    (OpenAI transcribe)
  - Agent: `Angie, AI Assistant` (system message: "You are a helpful
    assistant", tanggal `{{ $now }}`, filter email promo, ringkasan
    email Sender/tanggal/subject, default tanggal = hari ini,
    tugas via Baserow, kalender hanya event yang relevan)
  - Model: `OpenAI Chat Model` · Memori: `Simple Memory`
    (`memoryBufferWindow`, `sessionKey: angie_session_default`,
    `contextWindowLength: 10`) — **bukan** Window Buffer Memory seperti
    yang ditulis beberapa mirror; ini koreksi dari JSON aslinya.
  - Tools: `Tasks` (Baserow table 372174), `Contacts` (Baserow table
    372177), `Google Calendar` (getAll event), `Get many messages in
    Gmail` (getAll message)
  - Output: `Telegram` (sendMessage, parse_mode Markdown,
    `{{ $json.output }}`)
- Yang ada di file ini HANYA referensi ID kredensial n8n
  (`telegramApi`, `openAiApi`, `baserowApi`, `googleCalendarOAuth2Api`,
  `gmailOAuth2`) — **bukan** token/kunci asli. Jangan isi kredensial
  apa pun ke file ini.
- File ini adalah arsip referensi. Bot Gramstax di repo ini TIDAK
  membaca file ini saat runtime; pemetaan n8n → Gramstax ada di
  `README.md` utama.
