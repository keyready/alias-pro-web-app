import { create } from "zustand";
import type { DictionaryWord, Difficulty, GameMode, Team, WordResult } from "../../shared/types";

type Status = "idle" | "setup" | "handoff" | "playing" | "lastWord" | "roundResult" | "finished";

const MIN_PLAYABLE_WORDS = 20;

interface GameState {
  mode: GameMode;
  teams: Team[];
  dictionaryId: string;
  difficulties: Difficulty[];
  includeNeutral: boolean;
  /** Active, already filtered deck for the team currently taking a turn. */
  deck: DictionaryWord[];
  /** Source dictionary words used only to build future team-specific playable decks. */
  sourceDeck: DictionaryWord[];
  currentTeamIndex: number;
  currentWordIndex: number;
  targetScore: number;
  roundDuration: number;
  skipPenalty: -1 | 0;
  hintsEnabled: boolean;
  lastWordEnabled: boolean;
  status: Status;
  roundWords: WordResult[];
  roundIndex: number;
  serverGameId?: string;
  lastGameConfig?: Partial<GameState>;
}

interface Actions {
  setMode(mode: GameMode): void;
  setTeams(teams: Team[]): void;
  setDictionary(id: string): void;
  setDifficulties(values: Difficulty[]): void;
  setIncludeNeutral(value: boolean): void;
  configure(values: Partial<Pick<GameState, "targetScore" | "roundDuration" | "skipPenalty" | "hintsEnabled" | "lastWordEnabled">>): void;
  start(snapshot: GameStartSnapshot, serverGameId?: string): void;
  mark(result: "guessed" | "skipped", hintUsed: boolean): void;
  endRound(): void;
  nextRound(): void;
  rematch(): void;
  reset(): void;
}

export interface GameStartSnapshot {
  mode: GameMode;
  teams: Team[];
  dictionaryId: string;
  difficulties: Difficulty[];
  includeNeutral: boolean;
  targetScore: number;
  roundDuration: number;
  skipPenalty: -1 | 0;
  hintsEnabled: boolean;
  lastWordEnabled: boolean;
  sourceDeck: DictionaryWord[];
  firstDeck: DictionaryWord[];
}

const colors = ["pink", "purple", "blue", "cyan", "green", "orange", "red", "yellow"];

export const defaultTeams = (mode: GameMode): Team[] => mode === "genderBattle"
  ? [
      { id: "boys", name: "Мальчики", color: "blue", score: 0, order: 0, side: "maleTeam" },
      { id: "girls", name: "Девочки", color: "pink", score: 0, order: 1, side: "femaleTeam" },
    ]
  : [0, 1].map((i) => ({
      id: `team-${i + 1}`,
      name: ["Победители пиццы", "Диванные эксперты"][i],
      color: colors[i],
      score: 0,
      order: i,
    }));

const initial: GameState = {
  mode: "classic",
  teams: defaultTeams("classic"),
  dictionaryId: "classic",
  difficulties: [1, 2],
  includeNeutral: false,
  deck: [],
  sourceDeck: [],
  currentTeamIndex: 0,
  currentWordIndex: 0,
  targetScore: 50,
  roundDuration: 60,
  skipPenalty: -1,
  hintsEnabled: true,
  lastWordEnabled: true,
  status: "idle",
  roundWords: [],
  roundIndex: 0,
};

export const useGameStore = create<GameState & Actions>((set) => ({
  ...initial,
  setMode: (mode) => set({ mode, teams: defaultTeams(mode), deck: [], sourceDeck: [] }),
  setTeams: (teams) => set({ teams, deck: [] }),
  setDictionary: (dictionaryId) => set({ dictionaryId, deck: [], sourceDeck: [] }),
  setDifficulties: (difficulties) => set({ difficulties, deck: [] }),
  setIncludeNeutral: (includeNeutral) => set({ includeNeutral, deck: [] }),
  configure: (values) => set(values),
  start: (snapshot, serverGameId) => set(() => {
    return {
      mode: snapshot.mode,
      teams: snapshot.teams.map((t) => ({ ...t, score: 0 })),
      dictionaryId: snapshot.dictionaryId,
      difficulties: [...snapshot.difficulties],
      includeNeutral: snapshot.includeNeutral,
      targetScore: snapshot.targetScore,
      roundDuration: snapshot.roundDuration,
      skipPenalty: snapshot.skipPenalty,
      hintsEnabled: snapshot.hintsEnabled,
      lastWordEnabled: snapshot.lastWordEnabled,
      deck: [...snapshot.firstDeck],
      sourceDeck: [...snapshot.sourceDeck],
      serverGameId,
      status: "handoff",
      currentWordIndex: 0,
      currentTeamIndex: 0,
      roundWords: [],
      roundIndex: 0,
      lastGameConfig: {
        mode: snapshot.mode,
        teams: snapshot.teams.map((t) => ({ ...t })),
        dictionaryId: snapshot.dictionaryId,
        difficulties: [...snapshot.difficulties],
        includeNeutral: snapshot.includeNeutral,
        targetScore: snapshot.targetScore,
        roundDuration: snapshot.roundDuration,
        skipPenalty: snapshot.skipPenalty,
        hintsEnabled: snapshot.hintsEnabled,
        lastWordEnabled: snapshot.lastWordEnabled,
      },
    };
  }),
  mark: (result, hintUsed) => set((s) => {
    if (s.deck.length === 0) return {};
    const word = s.deck[s.currentWordIndex % s.deck.length];
    const points = result === "guessed" ? 1 : s.skipPenalty;
    return {
      currentWordIndex: s.currentWordIndex + 1,
      roundWords: [...s.roundWords, { wordId: word.id, word: word.word, result, points, hintUsed }],
    };
  }),
  endRound: () => set((s) => {
    const delta = s.roundWords.reduce((sum, word) => sum + word.points, 0);
    const teams = s.teams.map((team, index) => index === s.currentTeamIndex ? { ...team, score: team.score + delta } : team);
    const circleComplete = s.currentTeamIndex === s.teams.length - 1;
    const hasWinner = circleComplete && teams.some((team) => team.score >= s.targetScore);
    return { teams, status: hasWinner ? "finished" : "roundResult" };
  }),
  nextRound: () => set((s) => {
    const currentTeamIndex = (s.currentTeamIndex + 1) % s.teams.length;
    return {
      status: "handoff",
      currentTeamIndex,
      currentWordIndex: 0,
      deck: buildDeck(s.sourceDeck, s, s.teams[currentTeamIndex]),
      roundWords: [],
      roundIndex: s.roundIndex + 1,
    };
  }),
  rematch: () => set((s) => ({
    ...initial,
    ...s.lastGameConfig,
    teams: (s.lastGameConfig?.teams ?? s.teams).map((t) => ({ ...t, score: 0 })),
    status: "setup",
  })),
  reset: () => set(initial),
}));

export function buildDeck(
  words: DictionaryWord[],
  state: Pick<GameState, "mode" | "difficulties" | "includeNeutral" | "teams">,
  team?: Team,
) {
  const sideGender = state.mode === "genderBattle" && team?.side === "maleTeam"
    ? "female"
    : state.mode === "genderBattle" && team?.side === "femaleTeam"
      ? "male"
      : null;
  const filtered = words
    .filter((w) => state.difficulties.includes(w.difficulty))
    .filter((w) => !sideGender || w.gender === sideGender || (state.includeNeutral && w.gender === "neutral"));
  return shuffle([...new Map(filtered.map((w) => [w.normalizedWord, w])).values()]);
}

export function validatePlayableDecks(
  words: DictionaryWord[],
  state: Pick<GameState, "mode" | "difficulties" | "includeNeutral" | "teams">,
): { ok: true; deck: DictionaryWord[] } | { ok: false; message: string } {
  const firstDeck = buildDeck(words, state, state.teams[0]);
  if (firstDeck.length < MIN_PLAYABLE_WORDS) {
    return { ok: false, message: `Недостаточно слов для выбранных настроек: нужно минимум ${MIN_PLAYABLE_WORDS}.` };
  }
  if (state.mode === "genderBattle") {
    const missingTeam = state.teams.find((team) => buildDeck(words, state, team).length < MIN_PLAYABLE_WORDS);
    if (missingTeam) {
      return { ok: false, message: `Для гендерной битвы нужно минимум ${MIN_PLAYABLE_WORDS} слов на каждую сторону.` };
    }
  }
  return { ok: true, deck: firstDeck };
}

function shuffle<T>(items: T[]): T[] {
  for (let i = items.length - 1; i > 0; i -= 1) {
    const j = Math.floor(Math.random() * (i + 1));
    [items[i], items[j]] = [items[j], items[i]];
  }
  return items;
}
