import type {ValueOf} from "@gramstax/lmdb"
import {LmdbSchema, t} from "@gramstax/lmdb"

export type IVContact = ValueOf<typeof ContactSchema>

/**
 * One row per userId: the contact list as JSON + a monotonic nextId.
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
