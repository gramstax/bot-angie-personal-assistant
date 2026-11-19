import {WorkerThreadExport, WorkerThreadInit} from "@gramstax/worker-thread"
import {LogHe} from "~/helpers/log"
import type {ITranscribeResult} from "~/types/transcribe"

/**
 * Angie's voice transcription worker.
 *
 * Heavy/async work (the audio bytes + the Whisper call; the download
 * already happened on the main thread) moves to a worker thread so the
 * main Telegram handler never blocks — that is the role of
 * @gramstax/worker-thread in this bot.
 *
 * `mtd*` is the RPC surface the main thread can call. The worker does
 * NOT import ~/db or ~/lib/angie: it only receives bytes (base64) and
 * returns text, so the worker file can still be launched standalone.
 *
 * Mock mode (ANGIE_MOCK_AI=1 or no OPENAI_API_KEY): NO network calls —
 * returns a deterministic stub text so e2e can prove the voice path
 * end-to-end without API keys. The stub is deliberately a schedule
 * question, so Angie's reply is meaningful.
 */
export class Worker extends WorkerThreadInit {
  async mtdPing() {
    return {ok: true, threadId: this.id}
  }

  async mtdTranscribeAudio(audioBase64: string, fileName: string, mock: boolean): Promise<ITranscribeResult> {
    if (mock || !audioBase64) {
      return {text: `Apa jadwalku besok?`, via: `mock`, threadId: this.id}
    }
    const apiKey = process.env.OPENAI_API_KEY ?? ``
    if (!apiKey) throw new Error(`OPENAI_API_KEY is not set`)
    const bytes = Buffer.from(audioBase64, `base64`)
    const form = new FormData()
    form.append(`file`, new Blob([bytes], {type: `audio/ogg`}), fileName || `voice.ogg`)
    form.append(`model`, `whisper-1`)
    form.append(`language`, `id`)
    const res = await fetch(`https://api.openai.com/v1/audio/transcriptions`, {
      method: `POST`,
      headers: {Authorization: `Bearer ${apiKey}`},
      body: form,
    })
    if (!res.ok) {
      const body = await res.text().catch(() => ``)
      throw new Error(`OpenAI STT ${res.status}: ${body.slice(0, 200)}`)
    }
    const data = (await res.json()) as {text?: string}
    return {text: (data.text ?? ``).trim(), via: `whisper`, threadId: this.id}
  }

  onError(err: unknown) {
    LogHe.errorMake(err, `Worker`, `thread-${this.id}`)
  }
}

/**
 * Export ini adalah surface RPC + lifecycle handle: main thread memanggil
 * `TranscribeWorker.launchWorker()` untuk start, `shutdown(ms)` untuk
 * berhenti, dan `TranscribeWorker.mtdPing()` / `mtdTranscribeAudio(...)`
 * untuk RPC. `shutdown()` melempar bila belum pernah di-launch — caller
 * wajib menangkapnya (lihat TranscribePool).
 */
export const TranscribeWorker = WorkerThreadExport.init({
  path: __filename,
  WTInit: Worker,
})
