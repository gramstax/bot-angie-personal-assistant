/** Konfigurasi runtime Angie — semua rahasia hanya dari env, tidak pernah di-hardcode. */
import {OPENAI_DEFAULT_BASE_URL} from "./openai"

export interface AppConfigData {
  openaiApiKey: string
  openaiBaseUrl: string
  openaiModel: string
  googleAccessToken: string
  mockAi: boolean
  allowedIds: Set<number>
  dbPath: string
}

export class AppConfig {
  private static current: AppConfigData = AppConfig.load()

  static load(env: NodeJS.ProcessEnv = process.env): AppConfigData {
    return {
      openaiApiKey: env.OPENAI_API_KEY ?? ``,
      openaiBaseUrl: AppConfig.normalizeBaseUrl(env.OPENAI_BASE_URL ?? ``),
      openaiModel: (env.OPENAI_MODEL ?? ``).trim() || `gpt-4o-mini`,
      googleAccessToken: env.GOOGLE_ACCESS_TOKEN ?? ``,
      mockAi: env.ANGIE_MOCK_AI === `1` || env.ANGIE_MOCK_AI === `true`,
      allowedIds: AppConfig.parseIds(env.ANGIE_ALLOWED_IDS ?? ``),
      dbPath: env.DB_PATH ?? `./data`,
    }
  }

  static get(): AppConfigData {
    return AppConfig.current
  }

  static set(next: AppConfigData): void {
    AppConfig.current = next
  }

  /** Set ID Telegram yang diizinkan; kosong = semua diizinkan (mode dev). */
  static allowedIds(env: NodeJS.ProcessEnv = process.env): Set<number> {
    // Bila AppConfig.load sudah dipanggil dengan env saat ini, pakai cache;
    // bila env berubah setelah load (tes), baca ulang dari env.
    const fromEnv = AppConfig.parseIds(env.ANGIE_ALLOWED_IDS ?? ``)
    if (fromEnv.size > 0) return fromEnv
    return AppConfig.current.allowedIds
  }

  static parseIds(raw: string): Set<number> {
    const out = new Set<number>()
    for (const part of raw.split(`,`)) {
      const n = Number(part.trim())
      if (Number.isFinite(n) && n > 0) out.add(Math.floor(n))
    }
    return out
  }

  /** Trim + buang trailing slash; kosong = base URL default OpenAI. */
  static normalizeBaseUrl(raw: string): string {
    const trimmed = raw.trim().replace(/\/+$/, ``)
    return trimmed === `` ? OPENAI_DEFAULT_BASE_URL : trimmed
  }

  /** True bila OPENAI_BASE_URL menunjuk ke provider selain OpenAI default. */
  static isCustomBaseUrl(env: NodeJS.ProcessEnv = process.env): boolean {
    return AppConfig.normalizeBaseUrl(env.OPENAI_BASE_URL ?? ``) !== OPENAI_DEFAULT_BASE_URL
  }

  /**
   * Mock aktif bila ANGIE_MOCK_AI=1 ATAU tidak ada OPENAI_API_KEY DAN base
   * URL masih default. Tanpa kunci + base URL kustom (mis. Pollinations
   * gratis) = mode LIVE tanpa kunci, bukan mock.
   * Membaca env LANGSUNG (bukan cache load-time): e2e setup mengeset env
   * setelah modul diimpor, jadi cache akan ketinggalan.
   */
  static isMock(env: NodeJS.ProcessEnv = process.env): boolean {
    if (env.ANGIE_MOCK_AI === `1` || env.ANGIE_MOCK_AI === `true`) return true
    if ((env.OPENAI_API_KEY ?? ``).trim() !== ``) return false
    return !AppConfig.isCustomBaseUrl(env)
  }
}
