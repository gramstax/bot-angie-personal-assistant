import {PageBase} from "~/base/page"

/** /lupakan — hapus memori percakapan (window buffer) milik user itu dari LMDB. */
export class LupakanPage extends PageBase {
  static data = this.buildData()

  async handleCommandText() {
    await this.gdefault.show()
  }

  helper = {}

  gdefault = {
    show: async () => {
      const userId = this.from?.id
      if (userId === undefined) return
      await this.db.memory.clear(userId)
      await this.renderText({data: {reply: `Sudah kulupakan. Obrolan kita mulai dari nol lagi — ceritakan apa pun dari awal, nanti kuingat lagi.`}})
    },
    process: () => {},
  }

  static template = `
    <g-base>
      <g-message>{{reply}}</g-message>
    </g-base>
  `
}
