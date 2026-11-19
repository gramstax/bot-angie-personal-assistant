/** Satu turn percakapan Angie (user atau assistant). */
export interface ITurn {
  role: `user` | `assistant`
  text: string
  at: number
}

/** Satu tugas pengguna. */
export interface ITask {
  id: number
  title: string
  done: boolean
  createdAt: number
  doneAt?: number
}

/** Satu kontak pengguna. */
export interface IContact {
  id: number
  name: string
  email?: string
  phone?: string
  note?: string
  createdAt: number
}
