import type {ValueOf} from "@gramstax/lmdb"
import {LmdbSchema, t} from "@gramstax/lmdb"

export type IVTask = ValueOf<typeof TaskSchema>

/**
 * Tugas pengguna — pengganti tabel Tasks Baserow di n8n.
 * Satu baris per userId (pola History gramstax-youtube-bot): daftar tugas
 * sebagai JSON + nextId monotonik untuk penomoran stabil.
 */
export class TaskSchema extends LmdbSchema {
  static db = `tasks`
  static key = t.number()
  static value = {
    tasksJson: t.string(),
    nextId: t.number(),
    updatedAt: t.date().$defaultFn(() => new Date()),
  }
}
