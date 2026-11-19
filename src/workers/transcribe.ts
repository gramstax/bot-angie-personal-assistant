import {WorkerThreadExport, WorkerThreadInit} from "@gramstax/worker-thread"
import {LogHe} from "~/helpers/log"
import type {ITranscribeResult} from "~/types/transcribe"

/**
 * Worker transkripsi voice Angie.
 *
 * Pekerjaan berat/async (download sudah dilakukan main thread, lalu
 * bytes audio + panggilan Whisper) dipindah ke worker thread supaya
 * handler Telegram utama tidak tersumbat — ini peran @gramstax/worker-thread
 * di bot ini, menggantikan node Speech-to-Text di n8n.
 *
 * `mtd*` adalah surface RPC yang bisa dipanggil main thread. Worker TIDAK
 * mengimpor ~/db atau ~/lib/angie: ia hanya menerima bytes (base64) dan
 * mengembalikan teks, supaya file worker tetap bisa di-launch mandiri.
 *
 * Mode mock (ANGIE_MOCK_AI=1 atau tanpa OPENAI_API_KEY): TIDAK ada panggilan
 * jaringan — mengembalikan teks stub deterministik supaya e2e bisa
 * membuktikan jalur voice end-to-end tanpa kunci API. Teks stub ini
 * sengaja berupa pertanyaan jadwal, supaya balasan Angie-nya bermakna.
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
    if (!apiKey) throw new Error(`OPENAI_API_KEY belum diisi`)
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
