export type Gender = "male" | "female" | "neutral";
export type Difficulty = 1 | 2 | 3;
export type GameMode = "classic" | "genderBattle";

export interface DictionaryWord { id: string; word: string; normalizedWord: string; difficulty: Difficulty; hint?: string | null; gender: Gender; }
export interface DictionaryMeta { id: string; title: string; description?: string; wordsCount: number; createdAt: string; updatedAt: string; source: "system" | "upload"; }
export interface Dictionary extends DictionaryMeta { words: DictionaryWord[]; }
export interface Team { id: string; name: string; color: string; score: number; order: number; side?: "maleTeam" | "femaleTeam" | null; }
export interface WordResult { wordId: string; word: string; result: "guessed" | "skipped"; points: number; hintUsed: boolean; }
export interface ImportPreview { importToken: string; format: "txt" | "csv"; totalRows: number; validRows: number; duplicates: number; invalidRows: number; errors: Array<{ row: number; field: string; value: string; message: string }>; preview: DictionaryWord[]; }
