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

  /**
   * Sync of BotFather command descriptions from `<g-description>` blocks.
   *
   * Overrides the framework's `executeSyncBlocksDescription` (called from
   * `_onStart`): the framework pushes ONE `{command, description}` per
   * `handleCommandText` ENTRY, and a page with a bilingual
   * `intentCommandTextMap` (EN + ID spelling) has TWO entries pointing at
   * the same page — so without dedup the synced menu lists /tasks twice
   * (verified by probe 2026-11-19: every mapped command appeared twice
   * in the mock's `setMyCommands` calls). This override follows the same
   * three passes the framework documents (collect scope/lang pairs via
   * getAGDescriptionScopes/Lang → resolve each pair's list through
   * getGDescription → diff against getMyCommands → setMyCommands only on
   * a real difference, order-insensitive, failure contained per pair),
   * but dedupes by command name first — one entry per command in the
   * BotFather menu.
   */
  async executeSyncBlocksDescription(pages: typeof Gramstax.prototype.pages): Promise<void> {
    const routeStatic = (pages as unknown as {routeStatic?: {handleCommandText?: Record<string, {name?: string}>}})?.routeStatic?.handleCommandText
    if (!routeStatic) return
    const scopes = new Map<string, Set<string>>()
    for (const [, entry] of Object.entries(routeStatic)) {
      const name = entry.name
      if (!name) continue
      for (const scope of this.templateManager.getAGDescriptionScopes(name)) {
        if (!scopes.has(scope)) scopes.set(scope, new Set())
        for (const lang of this.templateManager.getAGDescriptionLang(name, `default`, scope)) {
          scopes.get(scope)!.add(lang)
        }
      }
    }
    let synced = 0
    for (const [scope, langs] of scopes) {
      for (const lang of langs) {
        const seen = new Set<string>()
        const commands: {command: string; description: string}[] = []
        for (const [, entry] of Object.entries(routeStatic)) {
          const name = entry.name
          if (!name || seen.has(name)) continue
          const {text} = this.templateManager.getGDescription(name, `default`, lang, scope)
          if (!text) continue
          seen.add(name)
          commands.push({command: name, description: text})
        }
        if (commands.length === 0) continue
        const languageCode = lang === `default` ? undefined : lang
        // The scope/language pair the framework syncs for; typed from the
        // grammy call itself so a new template lang never breaks the build.
        const params = {scope: {type: scope}, language_code: languageCode} as Parameters<
          typeof this.bot.api.getMyCommands
        >[0]
        try {
          const current = await this.bot.api.getMyCommands(params)
          const norm = (list: {command: string; description: string}[]) =>
            JSON.stringify(
              [...list]
                .map((c) => ({command: c.command, description: c.description}))
                .sort((a, b) => a.command.localeCompare(b.command)),
            )
          if (norm(current) !== norm(commands)) {
            await this.bot.api.setMyCommands(commands, params)
            synced++
          }
        } catch (err) {
          this.log?.error?.(`Failed to sync descriptions for scope: ${scope},${languageCode ? ` lang: ${languageCode},` : ``} error: ${String(err)}`)
        }
      }
    }
    if (synced > 0) this.log?.info?.(`Synced bot descriptions for ${synced} scope(s).`)
  }

  async hookAfterStart() {    const db = this.db
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
    const profile = {
      username: from.username ?? ``,
      firstName: from.first_name ?? ``,
      lastName: from.last_name,
      languageCode: from.language_code,
    }
    try {
      const {user} = await ctx.db.user.createIfNotExists(from.id, profile)
      // Language preference: a stored botLang overrides the Telegram
      // client's language_code before templates render, so every page
      // (EN default / lang="id" variant) follows the user's choice.
      // A non-string botLang means the row was written before the field
      // existed — rewrite it with the current schema (repair), then
      // fall back to the client's language.
      const stored = user.botLang
      if (stored !== undefined && stored !== `en` && stored !== `id`) {
        await ctx.db.user.rewriteProfile(from.id, profile)
      } else if (stored === `en` || stored === `id`) {
        from.language_code = stored
      }
    } catch {
      // Registration must never fail the user's route.
    }
    const allowed = AppConfig.allowedIds()
    if (allowed.size === 0) {
      if (!this._allowWarned) {
        this._allowWarned = true
        LogHe.warn(`[angie] ANGIE_ALLOWED_IDS is empty — all users are allowed (dev mode)`)
      }
      return true
    }
    if (!allowed.has(from.id)) {
      try {
        // The denial sentence lives in the StatusPage template (EN default
        // + lang="id"), rendered in the user's language — never a hardcoded
        // string in this hook (strict rule, Damar 2026-11-19 ~14:43 WIB).
        await new StatusPage(ctx).gdenied.show()
      } catch {
        // Sending the denial failed — still reject the update.
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
