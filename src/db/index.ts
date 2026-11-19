import {LmdbEnv, LmdbJobRun} from "@gramstax/lmdb"
import {LogHe} from "~/helpers/log"
import {ContactRepository} from "./repositories/contact"
import {MemoryRepository} from "./repositories/memory"
import {TaskRepository} from "./repositories/task"
import {UserRepository} from "./repositories/user"
import {ContactSchema} from "./schema/contact"
import {MemorySchema} from "./schema/memory"
import {TaskSchema} from "./schema/task"
import {UserSchema} from "./schema/user"

// Pola gramstax-youtube-bot: Db adalah class biasa yang dimiliki BotCore
// sebagai field instance (`bot.db`), disuntikkan ke ctx lewat createCtx.
// TIDAK ada lagi singleton statis (open/get/ensure/start/stop) — satu
// BotCore = satu env, dan tes yang membangun BotCore sendiri otomatis
// mendapat env-nya sendiri tanpa berbagi state global.
export class Db extends LmdbEnv {
  /**
   * `maxDbs` is a slot budget, not a database count: every schema, every
   * `.unique()`/`.index()`, and the `__job_run` bookkeeping sub each take one.
   * The package reports through `onWarn` once fewer than 32 slots remain.
   */
  static readonly MAX_DBS = 32

  readonly user: UserRepository
  readonly memory: MemoryRepository
  readonly tasks: TaskRepository
  readonly contacts: ContactRepository
  readonly jobRun: LmdbJobRun

  constructor(storePath: string) {
    super({
      path: storePath,
      maxDbs: Db.MAX_DBS,
      compression: true,
      encoding: `msgpack`,
      // @gramstax/lmdb writes nothing to console — it reports here instead, so
      // the application decides where diagnostics end up. With no listener
      // attached they are dropped, which is why a real app wires one up.
      onWarn: (message) => LogHe.warn(`[db] ${message}`),
    })
    this.user = new UserRepository(this.register(UserSchema))
    this.memory = new MemoryRepository(this.register(MemorySchema))
    this.tasks = new TaskRepository(this.register(TaskSchema))
    this.contacts = new ContactRepository(this.register(ContactSchema))
    // Takes its `__job_run` slot eagerly, so construct it only because
    // something below actually schedules a job.
    this.jobRun = new LmdbJobRun(this)
  }

  /** Map pressure, for health checks and the status page. */
  usage() {
    return this.getMapSizeUsed()
  }
}
