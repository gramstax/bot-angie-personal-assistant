import type {LmdbEnvSub} from "@gramstax/lmdb"
import type {ITask} from "~/types/angie"
import type {IVTask, TaskSchema} from "../schema/task"

export type AddTaskResult = {ok: true; task: ITask} | {ok: false; reason: `empty` | `full`}

export const TASK_MAX = 100

export class TaskRepository {
  constructor(private readonly _sub: LmdbEnvSub<typeof TaskSchema>) {}

  list(userId: number): ITask[] {
    const row = this._sub.get(userId)
    if (!row) return []
    try {
      const parsed = JSON.parse(row.tasksJson) as ITask[]
      return Array.isArray(parsed) ? parsed : []
    } catch {
      return []
    }
  }

  async add(userId: number, title: string): Promise<AddTaskResult> {
    const clean = title.trim()
    if (!clean) return {ok: false, reason: `empty`}
    return this._sub.owner.transaction(() => {
      const tasks = this.list(userId)
      if (tasks.length >= TASK_MAX) return {ok: false, reason: `full`} as const
      const row = this._sub.get(userId)
      const id = (row?.nextId ?? 1)
      const task: ITask = {id, title: clean, done: false, createdAt: Date.now()}
      tasks.push(task)
      this.saveSync(userId, tasks, id + 1)
      return {ok: true, task} as const
    })
  }

  async complete(userId: number, id: number): Promise<`ok` | `not-found` | `already-done`> {
    return this._sub.owner.transaction(() => {
      const tasks = this.list(userId)
      const task = tasks.find((t) => t.id === id)
      if (!task) return `not-found` as const
      if (task.done) return `already-done` as const
      task.done = true
      task.doneAt = Date.now()
      this.saveSync(userId, tasks, this._sub.get(userId)?.nextId ?? 1)
      return `ok` as const
    })
  }

  async remove(userId: number, id: number): Promise<boolean> {
    return this._sub.owner.transaction(() => {
      const tasks = this.list(userId)
      const next = tasks.filter((t) => t.id !== id)
      if (next.length === tasks.length) return false
      this.saveSync(userId, next, this._sub.get(userId)?.nextId ?? 1)
      return true
    })
  }

  async clear(userId: number): Promise<void> {
    await this._sub.owner.transaction(() => {
      this.saveSync(userId, [], 1)
    })
  }

  private saveSync(userId: number, tasks: ITask[], nextId: number): void {
    const row = {tasksJson: JSON.stringify(tasks), nextId, updatedAt: new Date()} as IVTask
    this._sub.putSync(userId, row)
  }
}
