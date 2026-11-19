import {WorkerThreadPool} from "@gramstax/worker-thread"
import {LogHe} from "~/helpers/log"
import type {ITranscribeResult} from "~/types/transcribe"
import {TranscribeWorker, type Worker as TranscribeWorkerClass} from "~/workers/transcribe"

type TranscribePoolType = WorkerThreadPool<TranscribeWorkerClass>

/**
 * Pool transkripsi voice — 2 worker thread, dispatch round-robin
 * (WorkerThreadPool, skill worker-thread-best-practices pool-dispatch).
 *
 * Lazy: pool baru di-launch saat voice pertama masuk (ensure), supaya boot
 * bot dan e2e yang tidak menyentuh voice tidak membayar biaya thread.
 * `shutdown()` aman dipanggil berkali-kali dan saat pool belum pernah
 * di-launch (dipakai BotCore.stop()).
 */
export class TranscribePool {
  private static _pool: TranscribePoolType | undefined
  private static _starting: Promise<TranscribePoolType> | undefined
  private static _launchedCount = 0

  static get launchedCount(): number {
    return TranscribePool._launchedCount
  }

  static get threadCount(): number {
    return TranscribePool._pool?.threadCount ?? 0
  }

  static async ensure(): Promise<TranscribePoolType> {
    if (TranscribePool._pool) return TranscribePool._pool
    if (!TranscribePool._starting) {
      TranscribePool._starting = (async () => {
        // SEQUENTIAL, bukan Promise.all: launch paralel berebut state
        // export (launch kedua menggantikan yang pertama sebelum sempat
        // terdaftar — terbukti di probe: Promise.all hanya menghasilkan
        // 1 thread, sequential menghasilkan 2 thread dengan threadId 1+2).
        const w1 = await TranscribeWorker.launchWorker()
        const w2 = await TranscribeWorker.launchWorker()
        const handles = [w1, w2]
        TranscribePool._launchedCount += handles.length
        const pool = new WorkerThreadPool(handles)
        TranscribePool._pool = pool
        return pool
      })()
    }
    return TranscribePool._starting
  }

  static async ping(): Promise<{ok: boolean; threadId: number}[]> {
    const pool = await TranscribePool.ensure()
    const results = await pool.mtdPing({mode: `settled`})
    const out: {ok: boolean; threadId: number}[] = []
    for (const r of results) {
      if (r.ok && r.result) out.push(r.result)
    }
    return out
  }

  static async transcribe(audioBase64: string, fileName: string, mock: boolean): Promise<ITranscribeResult> {
    const pool = await TranscribePool.ensure()
    // Round-robin (tanpa options): satu worker per panggilan.
    return pool.mtdTranscribeAudio(audioBase64, fileName, mock)
  }

  static async shutdown(): Promise<void> {
    const pool = TranscribePool._pool
    TranscribePool._pool = undefined
    TranscribePool._starting = undefined
    if (!pool) return
    try {
      await pool.killAll()
    } catch (err) {
      LogHe.errorMake(err, `TranscribePool`, `shutdown`)
    }
    try {
      await TranscribeWorker.shutdown(1_000)
    } catch {
      // Belum pernah di-launch lewat export ini — bukan kegagalan.
    }
  }
}
