import type { Dictionary, DictionaryMeta, ImportPreview, Team, Difficulty, GameMode, WordResult } from "../types";

const API_BASE = import.meta.env.VITE_API_BASE_URL ?? "";
let token: string | null = localStorage.getItem("alias-token");

export const setToken = (value: string) => { token = value; localStorage.setItem("alias-token", value); };
const headers = (): Record<string, string> => token ? { Authorization: `Bearer ${token}` } : {};

async function parse<T>(response: Response): Promise<T> {
  if (!response.ok) throw new Error((await response.text()) || response.statusText);
  return response.json() as Promise<T>;
}

export const api = {
  async auth(initData: string) {
    const data = await parse<{ token: string; user: { telegramUserId: string; firstName: string } }>(await fetch(`${API_BASE}/api/auth/telegram`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ initData }) }));
    setToken(data.token); return data;
  },
  dictionaries: async () => parse<DictionaryMeta[]>(await fetch(`${API_BASE}/api/dictionaries`)),
  dictionary: async (id: string) => parse<Dictionary>(await fetch(`${API_BASE}/api/dictionaries/${id}`)),
  async preview(file: File) { const fd = new FormData(); fd.append("file", file); return parse<ImportPreview>(await fetch(`${API_BASE}/api/dictionaries/import/preview`, { method: "POST", headers: headers(), body: fd })); },
  async commit(importToken: string, title: string, description: string) { return parse<Dictionary>(await fetch(`${API_BASE}/api/dictionaries/import/commit`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify({ importToken, title, description }) })); },
  async createGame(payload: { mode: GameMode; dictionaryIds: string[]; difficulties: Difficulty[]; targetScore: number; roundDuration: number; skipPenalty: number; lastWordEnabled: boolean; hintsEnabled: boolean; teams: Team[]; includeNeutral: boolean; clientRequestId: string }) { return parse<{ id: string }>(await fetch(`${API_BASE}/api/games`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(payload) })); },
  async syncRound(gameId: string, payload: { clientRoundId: string; teamId: string; roundIndex: number; words: WordResult[]; scoreDelta: number; finishedAt: string }) { return parse<unknown>(await fetch(`${API_BASE}/api/games/${gameId}/rounds`, { method: "POST", headers: { ...headers(), "Content-Type": "application/json" }, body: JSON.stringify(payload) })); }
};
