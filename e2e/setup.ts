import {join} from "node:path"
import {TemplateManager} from "gramstax"
import {BotCore} from "../src/core/bot"

// Env e2e — WAJIB sebelum `new BotCore` (field `db` BotCore membaca
// DB_PATH saat konstruksi). Mock AI aktif supaya tidak ada panggilan
// OpenAI/Google live; Google token kosong = tool menjawab "belum terhubung".
process.env.DB_PATH = `./data-e2e`
process.env.ANGIE_MOCK_AI = `1`
process.env.OPENAI_API_KEY = ``
process.env.GOOGLE_ACCESS_TOKEN = ``
process.env.ANGIE_ALLOWED_IDS = ``

export type {IE2eApiCall, IE2eUpdateOptions} from "gramstax"

export const bot = new BotCore({
  deploy: `test`,
  token: `test`,
  log: false,
  autoRetry: true,
  templateManager: new TemplateManager({
    path: [join(import.meta.dir, `../src/pages`)],
  }),
})
export const e2e = bot.e2e!

// Satu blok user.id UNIK per file tes — instance bot + session store hidup
// di module scope dan dipakai bersama seluruh file dalam satu run (skill
// e2e-setup). Fixture tanpa username sengaja menguji bot tanpa guard username.
export const startUser = {user: {id: 9001, username: `angieuser`, language_code: `id`}}
export const helpUser = {user: {id: 4601, username: `helpuser`, language_code: `id`}}
export const angieUser = {user: {id: 4401, username: `angiechat`, language_code: `id`}}
export const angieMemoryUser = {user: {id: 4402, username: `angiemem`, language_code: `id`}}
export const angieVoiceUser = {user: {id: 4403, username: `angievoice`, language_code: `id`}}
export const tasksUser = {user: {id: 4301, username: `tasksuser`, language_code: `id`}}
export const addTaskUser = {user: {id: 4302, username: `addtaskuser`, language_code: `id`}}
export const doneTaskUser = {user: {id: 4303, username: `donetaskuser`, language_code: `id`}}
export const kontakUser = {user: {id: 4701, username: `kontakuser`, language_code: `id`}}
export const addKontakUser = {user: {id: 4702, username: `addkontakuser`, language_code: `id`}}
export const emailUser = {user: {id: 4801, username: `emailuser`, language_code: `id`}}
export const jadwalUser = {user: {id: 4802, username: `jadwaluser`, language_code: `id`}}
export const lupakanUser = {user: {id: 4901, username: `lupakanuser`, language_code: `id`}}
export const languageUser = {user: {id: 4902, username: `languser`, language_code: `en`}}
export const languageDefaultUser = {user: {id: 4903, username: `langdefault`, language_code: `en`}}
export const statusUser = {user: {id: 4951, username: `statususer`, language_code: `id`}}
export const coverageUser = {user: {id: 4952, username: `coverageuser`, language_code: `id`}}
export const deniedUser = {user: {id: 4999, username: `denieduser`, language_code: `id`}}
export const noUsernameUser = {user: {id: 4202, language_code: `id`}}
export const dbUser = {user: {id: 4101, username: `dbuser`, language_code: `id`}}

const FIXTURE_IDS = [
  9001, 4601, 4401, 4402, 4403, 4301, 4302, 4303, 4701, 4702, 4801, 4802, 4901, 4902, 4903, 4951, 4952, 4999, 4202, 4101,
]

/** Bersihkan state persisten fixture (memori, tugas, kontak) per tes. */
export async function resetEnv(): Promise<void> {
  for (const id of FIXTURE_IDS) {
    await bot.db.memory.clear(id)
    await bot.db.tasks.clear(id)
    await bot.db.contacts.clear(id)
  }
}
