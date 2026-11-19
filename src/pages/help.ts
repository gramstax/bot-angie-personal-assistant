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
      ${this.kbk.back()}
      <g-message>
        <b>🆘 Help — Angie</b>

        <b>Chat directly</b>
        Send any text, or send a voice note — I will answer as Angie.
        I remember the last 10 messages of our chat, so context is kept
        even if the bot restarts.

        <b>Commands</b>
        /start — introduction &amp; main menu
        /tugas — your task list
        /tambahtugas &lt;text&gt; — add a new task
        /selesai &lt;id&gt; — mark a task done
        /kontak [name] — find a contact
        /tambahkontak &lt;name&gt; | &lt;email&gt; | &lt;phone&gt; — add a contact
        /email — today's unread emails (not promotions)
        /jadwal [date] — events for that day (example: /jadwal tomorrow)
        /language — switch language (English / Indonesia)
        /lupakan — erase my memory of this chat
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
        /start — perkenalan &amp; menu utama
        /tugas — daftar tugasmu
        /tambahtugas &lt;teks&gt; — tambah tugas baru
        /selesai &lt;id&gt; — tandai tugas selesai
        /kontak [nama] — cari kontak
        /tambahkontak &lt;nama&gt; | &lt;email&gt; | &lt;telepon&gt; — tambah kontak
        /email — email unread hari ini (bukan promo)
        /jadwal [tanggal] — acara hari itu (contoh: /jadwal besok)
        /language — ganti bahasa (English / Indonesia)
        /lupakan — hapus ingatanku tentang obrolan ini
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
