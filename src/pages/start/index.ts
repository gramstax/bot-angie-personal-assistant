import {PageBase} from "~/base/page"
import {EmailPage} from "../email"
import {HelpPage} from "../help"
import {JadwalPage} from "../jadwal"
import {KontakPage} from "../kontak"
import {TugasPage} from "../tugas"

export class StartPage extends PageBase {
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
      await this.clearSession()
      await this.renderText({
        mode: `auto`,
        keyboard: this.inlineKeyboardT([TugasPage, KontakPage, EmailPage, JadwalPage, HelpPage], `2`),
        data: {userName: this.from?.username ?? this.from?.first_name ?? `kamu`},
      })
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-keyboard type="inline">📋 Tugas, 👤 Kontak, ✉️ Email, 📅 Jadwal, 🆘 Bantuan</g-keyboard>
      <g-message>
        <b>👋 Halo {{userName}}, aku Angie!</b>

        Asisten pribadimu di Telegram. Ceritakan saja apa yang kamu butuhkan — lewat teks atau voice note, dua-duanya bisa.

        <b>Yang bisa kubantu:</b>
        • Ringkas email unread kamu
        • Cek jadwal &amp; acara di kalender
        • Ingatkan tugas-tugasmu
        • Cari info kontak

        Kirim pesan apa pun langsung ke aku, atau pakai perintah di bawah.

        <b>Perintah:</b>
        /tugas — lihat tugasmu
        /tambahtugas &lt;teks&gt; — tambah tugas
        /selesai &lt;id&gt; — tandai tugas selesai
        /kontak — cari kontak
        /email — email unread hari ini
        /jadwal — acara hari ini
        /lupakan — hapus ingatanku tentang obrolan ini
        /help — bantuan lengkap
      </g-message>
    </g-base>
  `
}
