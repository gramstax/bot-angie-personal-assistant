/** Konfigurasi runtime Angie — semua rahasia hanya dari env, tidak pernah di-hardcode. */
export interface AppConfigData {
  openaiApiKey: string
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

  /**
   * Mock aktif bila ANGIE_MOCK_AI=1 ATAU tidak ada OPENAI_API_KEY.
   * Membaca env LANGSUNG (bukan cache load-time): e2e setup mengeset env
   * setelah modul diimpor, jadi cache akan ketinggalan.
   */
  static isMock(env: NodeJS.ProcessEnv = process.env): boolean {
    if (env.ANGIE_MOCK_AI === `1` || env.ANGIE_MOCK_AI === `true`) return true
    return (env.OPENAI_API_KEY ?? ``).trim() === ``
  }
}
