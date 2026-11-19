import type {ValueOf} from "@gramstax/lmdb"
import {LmdbSchema, t} from "@gramstax/lmdb"

export type IVTask = ValueOf<typeof TaskSchema>

/**
 * One row per userId (same pattern as the History store): the task
 * list as JSON + a monotonic nextId for stable numbering.
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
