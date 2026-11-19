import {KeyboardGBlock} from "~/blocks/g-keyboard"
import {CtxCore} from "~/core/ctx"
import {I18n, type Lang} from "~/lib/i18n"

export abstract class PageBase extends CtxCore {
  static kbk = KeyboardGBlock
  static kbl = KeyboardGBlock.label

  /**
   * The user's bot language for this update: the stored /language
   * preference when set, otherwise the Telegram client's language.
   * Defaults to English; a non-string stored value (legacy LMDB row)
   * falls back to English and never crashes — see I18n.langOf.
   */
  lang(): Lang {
    const id = this.from?.id
    const stored = id !== undefined ? this.db.user.find(id)?.botLang : undefined
    return I18n.langOf({botLang: stored, telegramLang: this.from?.language_code})
  }
}
