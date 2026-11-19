import type {ValueOf} from "@gramstax/lmdb"
import {LmdbSchema, t} from "@gramstax/lmdb"

export type IVMemory = ValueOf<typeof MemorySchema>

/**
 * Memori percakapan Angie — pengganti Window Buffer Memory n8n yang
 * volatile. Satu baris per userId, berisi max 10 turn terakhir (user +
 * assistant) sebagai JSON. Persisten di LMDB, jadi konteks tidak hilang
 * saat proses restart — ini improvement dari flow n8n asli.
 */
export class MemorySchema extends LmdbSchema {
  static db = `memory`
  static key = t.number()
  static value = {
    turnsJson: t.string(),
    updatedAt: t.date().$defaultFn(() => new Date()),
  }
}
