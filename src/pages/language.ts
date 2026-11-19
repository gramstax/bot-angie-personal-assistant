import {PageBase} from "~/base/page"
import {I18n} from "~/lib/i18n"
import {StartPage} from "./start"

/**
 * LanguagePage — /language: choose English or Indonesian.
 *
 * The preference is stored per user (UserSchema.botLang) and applied in
 * hookBeforeRoute by overriding `from.language_code` before templates
 * render — so every template (EN default / lang="id") follows this
 * choice, not only the Telegram client's language.
 */
class Base {
  static done = `done`
}

export class LanguagePage extends PageBase {
  static data = this.buildData((action: string, _arg: string) => [action, _arg])

  async handleCommandText() {
    await this.glanguage.show()
  }

  async handleCallbackQueryData() {
    await this.glanguage.show()
  }

  async handleArgsCallbackQueryData() {
    const [action] = this.callbackQueryDataArgs
    await this.glanguage.process(action)
  }

  helper = {}

  glanguage = {
    show: async () => {
      await this.renderText({
        mode: `auto`,
        keyboard: this.inlineKeyboard((k, l) => {
          k.text(l[0]!, this.data.callbackQueryData(`lang-en`, `0`))
            .text(l[1]!, this.data.callbackQueryData(`lang-id`, `0`))
            .row()
            .text(l[2]!, StartPage)
          return k
        }),
      })
    },

    process: async (action?: string) => {
      const userId = this.from?.id
      if (!action || userId === undefined) return
      if (action !== `lang-en` && action !== `lang-id`) return
      const lang = action === `lang-id` ? `id` : `en`
      const from = this.from
      await this.db.user.setBotLang(
        userId,
        lang,
        {
          username: from?.username ?? ``,
          firstName: from?.first_name ?? ``,
          lastName: from?.last_name,
          languageCode: from?.language_code,
        },
      )
      // Apply immediately for this reply (the hook only runs on the next
      // update): the toast and the follow-up render use the new language,
      // and later updates already carry the stored preference. The
      // language_code override makes the done template render in the
      // newly chosen language instead of the previous one.
      if (from) from.language_code = lang
      await this.renderCallbackAnswer({
        showAlert: false,
        data: {toast: I18n.t(lang, lang === `id` ? `langChangedId` : `langChangedEn`)},
      })
      await this.renderText({
        mode: `auto`,
        AGBaseId: Base.done,
        keyboard: this.inlineKeyboardT([StartPage], `1`, `done`),
        data: {lang: lang === `id` ? `Indonesia` : `English`},
      })
    },
  }

  static template = `
    <g-base>
      <g-keyboard type="inline">🇬🇧 English, 🇮🇩 Indonesia, ⬅️ Back</g-keyboard>
      <g-keyboard type="inline" lang="id">🇬🇧 English, 🇮🇩 Indonesia, ⬅️ Kembali</g-keyboard>
      <g-message>
        <b>🌐 Choose language / Pilih bahasa</b>

        The bot currently speaks English and Indonesian.
        Tap a button to set your language.
      </g-message>
      <g-message lang="id">
        <b>🌐 Choose language / Pilih bahasa</b>

        Bot ini memakai bahasa Inggris dan Indonesia.
        Ketuk tombol untuk mengatur bahasamu.
      </g-message>
      <g-callback-answer>{{toast}}</g-callback-answer>
    </g-base>

    <g-base id="${Base.done}">
      ${this.kbk.home()}
      <g-message>
        ✅ Language set to <b>{{lang}}</b>. Use /start to continue.
      </g-message>
      <g-message lang="id">
        ✅ Bahasa diubah ke <b>{{lang}}</b>. Pakai /start untuk lanjut.
      </g-message>
      <g-callback-answer>{{toast}}</g-callback-answer>
    </g-base>
  `
}
