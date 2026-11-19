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
