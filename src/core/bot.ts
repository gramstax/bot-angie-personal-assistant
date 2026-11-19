import {Gramstax} from "gramstax"
import {Db} from "~/db"
import {LogHe} from "~/helpers/log"
import {AppConfig} from "~/lib/config"
import {TranscribePool} from "~/lib/transcribe-pool"
import {StatusPage} from "~/pages/status"
import type {IErrorPageData} from "~/types/page"
import {CtxCore} from "./ctx"

// BotCore — pola gramstax-youtube-bot:
// - Db dimiliki sebagai field instance (`bot.db`), disuntikkan ke ctx.
// - hookBeforeRoute: registrasi user best-effort (TANPA guard username —
//   banyak pengguna Telegram tidak punya username dan tetap harus dilayani)
//   + AllowList ANGIE_ALLOWED_IDS. Bila env kosong, semua diizinkan (dev)
//   dengan peringatan log sekali.
// - hookAfterStart: jadwal nightly-report restart-safe (LmdbJobRun).
//   Worker transkripsi TIDAK di-launch di sini — pool bersifat lazy dan
//   baru di-launch saat voice pertama masuk, supaya boot tetap ringan dan
//   e2e yang tidak menyentuh voice tidak membayar biaya thread.
export class BotCore extends Gramstax {
  db = new Db(process.env.DB_PATH ?? `./data`)

  private _job: {stop: () => void} | undefined
  private _allowWarned = false

  createCtx(ct: Parameters<Gramstax[`createCtx`]>[0]) {
    return new CtxCore(this.buildCtxParams(ct, {db: this.db}))
  }

  async hookAfterStart() {
    const db = this.db
    const handle = db.jobRun.start(`nightly-report`, {
      pattern: `0 3 * * *`,
      timezone: `Asia/Jakarta`,
      task: async () => {
        const usage = db.usage()
        LogHe.info(`[job] nightly-report users=${db.user.count()} map=${usage.used}/${usage.total}`)
      },
      onError: (err) => LogHe.errorMake(err, `Db`, `nightly-report`),
    })
    this._job = handle as unknown as {stop: () => void}
  }

  async hookBeforeRoute(ctx: CtxCore) {
    const from = ctx.from
    if (!from?.id) return true
    try {
      await ctx.db.user.createIfNotExists(from.id, {
        username: from.username ?? ``,
        firstName: from.first_name ?? ``,
        lastName: from.last_name,
        languageCode: from.language_code,
      })
    } catch {
      // Registrasi gagal tidak boleh menggagalkan route pengguna.
    }
    const allowed = AppConfig.allowedIds()
    if (allowed.size === 0) {
      if (!this._allowWarned) {
        this._allowWarned = true
        LogHe.warn(`[angie] ANGIE_ALLOWED_IDS kosong — semua pengguna diizinkan (mode dev)`)
      }
      return true
    }
    if (!allowed.has(from.id)) {
      try {
        const chatId = ctx.chat?.id ?? from.id
        await ctx.api.sendMessage(chatId, `Maaf, bot Angie ini hanya melayani pengguna yang diizinkan.`)
      } catch {
        // Gagal kirim penolakan — tetap tolak update-nya.
      }
      return false
    }
    return true
  }

  async hookErrorPage(ctx: CtxCore, data: IErrorPageData) {
    await new StatusPage(ctx).gerror.show(`${data.listenerName}:hookErrorPage`, data.error)
  }

  async hookNotFoundPage(ctx: CtxCore) {
    await new StatusPage(ctx).gnotFound.show()
  }

  async stop() {
    try {
      await super.stop()
    } finally {
      try {
        await TranscribePool.shutdown()
      } catch {
        // Pool belum pernah di-launch — bukan kegagalan.
      }
      this._job?.stop()
      this._job = undefined
      await this.db.close()
    }
  }
}
