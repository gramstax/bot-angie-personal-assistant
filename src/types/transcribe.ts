/** Hasil transkripsi voice dari worker thread. */
export interface ITranscribeResult {
  text: string
  /** `mock` = stub tanpa jaringan (mode ANGIE_MOCK_AI), `whisper` = OpenAI Whisper live. */
  via: `mock` | `whisper`
  threadId: number
}
