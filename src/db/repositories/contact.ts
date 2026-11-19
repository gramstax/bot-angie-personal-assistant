import type {LmdbEnvSub} from "@gramstax/lmdb"
import type {IContact} from "~/types/angie"
import type {IVContact, ContactSchema} from "../schema/contact"

export type AddContactResult = {ok: true; contact: IContact} | {ok: false; reason: `empty-name` | `full`}

export const CONTACT_MAX = 200

export class ContactRepository {
  constructor(private readonly _sub: LmdbEnvSub<typeof ContactSchema>) {}

  list(userId: number): IContact[] {
    const row = this._sub.get(userId)
    if (!row) return []
    try {
      const parsed = JSON.parse(row.contactsJson) as IContact[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  search(userId: number, query: string): IContact[] {
    const q = query.trim().toLowerCase()
    if (!q) return this.list(userId)
    return this.list(userId).filter((c) =>
      c.name.toLowerCase().includes(q) ||
      (c.email ?? ``).toLowerCase().includes(q) ||
      (c.phone ?? ``).toLowerCase().includes(q),
    )
  }

  async add(userId: number, contact: Omit<IContact, `id` | `createdAt`>): Promise<AddContactResult> {
    const name = contact.name.trim()
    if (!name) return {ok: false, reason: `empty-name`}
    return this._sub.owner.transaction(() => {
      const contacts = this.list(userId)
      if (contacts.length >= CONTACT_MAX) return {ok: false, reason: `full`} as const
      const row = this._sub.get(userId)
      const id = (row?.nextId ?? 1)
      const full: IContact = {...contact, name, id, createdAt: Date.now()}
      contacts.push(full)
      this.saveSync(userId, contacts, id + 1)
      return {ok: true, contact: full} as const
    })
  }

  async clear(userId: number): Promise<void> {
    await this._sub.owner.transaction(() => {
      this.saveSync(userId, [], 1)
    })
  }

  private saveSync(userId: number, contacts: IContact[], nextId: number): void {
    const row = {contactsJson: JSON.stringify(contacts), nextId, updatedAt: new Date()} as IVContact
    this._sub.putSync(userId, row)
  }
}
