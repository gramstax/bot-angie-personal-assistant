import {PageBase} from "~/base/page"
import {EmailPage} from "../email"
import {HelpPage} from "../help"
import {SchedulePage} from "../schedule"
import {ContactPage} from "../contact"
import {LanguagePage} from "../language"
import {TasksPage} from "../tasks"

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
        keyboard: this.inlineKeyboardT([TasksPage, ContactPage, EmailPage, SchedulePage, LanguagePage, HelpPage], `2`),
        data: {userName: this.from?.username ?? this.from?.first_name ?? `you`},
      })
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-description>Introduction and main menu</g-description>
      <g-description lang="id">Perkenalan dan menu utama</g-description>
      ${this.kbk.mainMenu()}
      <g-message>
        <b>👋 Hello {{userName}}, I'm Angie!</b>

        Your personal assistant on Telegram. Just tell me what you need — by text or voice note, both work.

        <b>What I can help with:</b>
        • Summarize your unread emails
        • Check your calendar events
        • Remind you of your tasks
        • Look up contact info

        Send me any message directly, or use the commands below.

        <b>Commands:</b>
        /tasks — see your tasks
        /addtask &lt;text&gt; — add a task
        /done &lt;id&gt; — mark a task done
        /contact — find a contact
        /email — today's unread emails
        /schedule — today's events
        /language — switch language (English / Indonesia)
        /forget — erase my memory of this chat
        /help — full help
      </g-message>
      <g-message lang="id">
        <b>👋 Halo {{userName}}, aku Angie!</b>

        Asisten pribadimu di Telegram. Ceritakan saja apa yang kamu butuhkan — lewat teks atau voice note, dua-duanya bisa.

        <b>Yang bisa kubantu:</b>
        • Ringkas email unread kamu
        • Cek jadwal &amp; acara di kalender
        • Ingatkan tugas-tugasmu
        • Cari info kontak

        Kirim pesan apa pun langsung ke aku, atau pakai perintah di bawah.

        <b>Perintah:</b>
        /tasks — lihat tugasmu
        /addtask &lt;teks&gt; — tambah tugas
        /done &lt;id&gt; — tandai tugas selesai
        /contact — cari kontak
        /email — email unread hari ini
        /schedule — acara hari ini
        /language — ganti bahasa (English / Indonesia)
        /forget — hapus ingatanku tentang obrolan ini
        /help — bantuan lengkap
      </g-message>
    </g-base>
  `
}
