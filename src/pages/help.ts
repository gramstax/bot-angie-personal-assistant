import {PageBase} from "~/base/page"
import {StartPage} from "./start"

export class HelpPage extends PageBase {
  static data = this.buildData()

  async handleCallbackQueryData() {
    await this.gdefault.show()
  }

  async handleCommandText() {
    await this.gdefault.show()
  }

  helper = {}
  gdefault = {
    show: async () => {
      await this.renderText({mode: `auto`, keyboard: this.inlineKeyboardT([StartPage])})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>Full help and command list</g-description>
      <g-description lang="id">Bantuan lengkap dan daftar perintah</g-description>
      ${this.kbk.back()}
      <g-message>
        <b>🆘 Help — Angie</b>

        <b>Chat directly</b>
        Send any text, or send a voice note — I will answer as Angie.
        I remember the last 10 messages of our chat, so context is kept
        even if the bot restarts.

        <b>Commands</b>
        Every command works in English and Indonesian — both spellings
        open the same page (e.g. /tasks and /tugas).
        /start — introduction &amp; main menu
        /tasks — your task list (also /tugas)
        /addtask &lt;text&gt; — add a new task (also /tambahtugas)
        /done &lt;id&gt; — mark a task done (also /selesai)
        /contact [name] — find a contact (also /kontak)
        /addcontact &lt;name&gt; | &lt;email&gt; | &lt;phone&gt; — add a contact (also /tambahkontak)
        /email — today's unread emails (not promotions)
        /schedule [date] — events for that day (example: /schedule tomorrow)
        /language — switch language (English / Indonesia)
        /forget — erase my memory of this chat (also /lupakan)
        /help — this page

        <b>What to set up so every feature works</b>
        • OPENAI_API_KEY — for AI answers &amp; voice transcription.
          Without it I still run, but answers are in simple mode.
        • GOOGLE_ACCESS_TOKEN — for Google email &amp; calendar.
          Without it I will honestly say I am not connected yet.
      </g-message>
      <g-message lang="id">
        <b>🆘 Bantuan — Angie</b>

        <b>Ngobrol langsung</b>
        Kirim teks apa pun, atau kirim voice note — aku akan menjawab
        sebagai Angie. Aku mengingat 10 pesan terakhir obrolan kita,
        jadi konteksnya tidak hilang walau bot restart.

        <b>Perintah</b>
        Setiap perintah bisa dipakai dalam bahasa Inggris dan Indonesia —
        kedua ejaannya membuka halaman yang sama (mis. /tugas dan /tasks).
        /start — perkenalan &amp; menu utama
        /tugas — daftar tugasmu (juga /tasks)
        /tambahtugas &lt;teks&gt; — tambah tugas baru (juga /addtask)
        /selesai &lt;id&gt; — tandai tugas selesai (juga /done)
        /kontak [nama] — cari kontak (juga /contact)
        /tambahkontak &lt;nama&gt; | &lt;email&gt; | &lt;telepon&gt; — tambah kontak (juga /addcontact)
        /email — email unread hari ini (bukan promo)
        /jadwal [tanggal] — acara hari itu (contoh: /jadwal besok)
        /language — ganti bahasa (English / Indonesia)
        /lupakan — hapus ingatanku tentang obrolan ini (juga /forget)
        /help — halaman ini

        <b>Yang perlu disiapkan supaya semua fitur jalan</b>
        • OPENAI_API_KEY — untuk jawaban AI &amp; transkripsi voice.
          Tanpa ini aku tetap jalan, tapi jawabannya mode sederhana.
        • GOOGLE_ACCESS_TOKEN — untuk email &amp; kalender Google.
          Tanpa ini aku akan bilang terus terang kalau belum terhubung.
      </g-message>
    </g-base>
  `
}
