import {PageBase} from "~/base/page"
import {I18n} from "~/lib/i18n"

/** /forget (EN) / /lupakan (ID) — clear this user's conversation memory (window buffer) from LMDB. */
export class LupakanPage extends PageBase {
  static data = this.buildData({intentCommandText: {default: `forget`, id: `lupakan`}})

  async handleCommandText() {
    await this.gdefault.show()
  }

  helper = {}

  gdefault = {
    show: async () => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.db.memory.clear(userId)
      await this.renderText({data: {reply: I18n.t(this.lang(), `forgotten`)}})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
