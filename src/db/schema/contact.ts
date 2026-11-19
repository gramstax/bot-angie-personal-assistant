import type {ValueOf} from "@gramstax/lmdb"
import {LmdbSchema, t} from "@gramstax/lmdb"

export type IVContact = ValueOf<typeof ContactSchema>

/**
 * Kontak pengguna — pengganti tabel Contacts Baserow di n8n.
 * Satu baris per userId: daftar kontak sebagai JSON + nextId monotonik.
 */
export class ContactSchema extends LmdbSchema {
  static db = `contacts`
  static key = t.number()
  static value = {
    contactsJson: t.string(),
    nextId: t.number(),
    updatedAt: t.date().$defaultFn(() => new Date()),
  }
}
