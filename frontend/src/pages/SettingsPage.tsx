import { Alert, Button, Card, Chip, Switch } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useGameStore, validatePlayableDecks } from "../features/game/store";
import { api } from "../shared/api/client";
import type { Difficulty } from "../shared/types";

export function SettingsPage() {
  const navigate = useNavigate();
  const state = useGameStore();
  const startInFlight = useRef(false);
  const [isStarting, setIsStarting] = useState(false);
  const [startError, setStartError] = useState<string | null>(null);
  const { data } = useQuery({
    queryKey: ["dictionary", state.dictionaryId],
    queryFn: () => api.dictionary(state.dictionaryId),
  });

  const toggleDiff = (value: Difficulty) => {
    if (isStarting) return;
    state.setDifficulties(
      state.difficulties.includes(value)
        ? state.difficulties.filter((d) => d !== value)
        : [...state.difficulties, value],
    );
  };
  const validation = data && state.difficulties.length > 0 ? validatePlayableDecks(data.words, state) : null;
  const playableCount = validation?.ok ? validation.deck.length : 0;
  const validationMessage = state.difficulties.length === 0
    ? "Выберите хотя бы одну сложность."
    : validation && !validation.ok
      ? validation.message
      : null;

  const start = async () => {
    if (!data || !validation?.ok || startInFlight.current) return;

    const snapshot = {
      mode: state.mode,
      teams: state.teams.map((team) => ({ ...team })),
      dictionaryId: state.dictionaryId,
      difficulties: [...state.difficulties],
      includeNeutral: state.includeNeutral,
      targetScore: state.targetScore,
      roundDuration: state.roundDuration,
      skipPenalty: state.skipPenalty,
      hintsEnabled: state.hintsEnabled,
      lastWordEnabled: state.lastWordEnabled,
      sourceDeck: data.words.map((word) => ({ ...word })),
      firstDeck: validation.deck.map((word) => ({ ...word })),
    };

    startInFlight.current = true;
    setIsStarting(true);
    setStartError(null);
    try {
      const server = await api.createGame({
        mode: snapshot.mode,
        dictionaryIds: [snapshot.dictionaryId],
        difficulties: snapshot.difficulties,
        targetScore: snapshot.targetScore,
        roundDuration: snapshot.roundDuration,
        skipPenalty: snapshot.skipPenalty,
        lastWordEnabled: snapshot.lastWordEnabled,
        hintsEnabled: snapshot.hintsEnabled,
        teams: snapshot.teams,
        includeNeutral: snapshot.includeNeutral,
        clientRequestId: crypto.randomUUID(),
      });
      state.start(snapshot, server.id);
      navigate("/game");
    } catch (error) {
      setStartError(error instanceof Error ? error.message : "Не удалось начать игру.");
    } finally {
      startInFlight.current = false;
      setIsStarting(false);
    }
  };

  const controlsDisabled = isStarting;

  return (
    <section className="flex flex-col gap-4">
      <h1 className="text-3xl font-bold">Настройки</h1>
      <Card>
        <Card.Header>
          <Card.Title>Сложность</Card.Title>
          <Card.Description>Выберите хотя бы одну.</Card.Description>
        </Card.Header>
        <Card.Content className="flex-row gap-2">
          {([1, 2, 3] as Difficulty[]).map((d) => (
            <Button
              key={d}
              isDisabled={controlsDisabled}
              variant={state.difficulties.includes(d) ? "primary" : "secondary"}
              onPress={() => toggleDiff(d)}
            >
              {d}
            </Button>
          ))}
        </Card.Content>
      </Card>
      <Card>
        <Card.Content className="gap-3">
          <Switch
            isDisabled={controlsDisabled}
            isSelected={state.hintsEnabled}
            onChange={(v) => state.configure({ hintsEnabled: v })}
          >
            Подсказки
          </Switch>
          <Switch
            isDisabled={controlsDisabled}
            isSelected={state.lastWordEnabled}
            onChange={(v) => state.configure({ lastWordEnabled: v })}
          >
            Последнее слово
          </Switch>
          <Switch
            isDisabled={controlsDisabled}
            isSelected={state.skipPenalty === -1}
            onChange={(v) => state.configure({ skipPenalty: v ? -1 : 0 })}
          >
            Штраф за пропуск −1
          </Switch>
          {state.mode === "genderBattle" ? (
            <Switch
              isDisabled={controlsDisabled}
              isSelected={state.includeNeutral}
              onChange={state.setIncludeNeutral}
            >
              Добавлять нейтральные
            </Switch>
          ) : null}
          <div className="flex gap-2">
            <Button
              isDisabled={controlsDisabled}
              variant="secondary"
              onPress={() => state.configure({ roundDuration: Math.max(30, state.roundDuration - 15) })}
            >
              −
            </Button>
            <Chip>{state.roundDuration} сек</Chip>
            <Button
              isDisabled={controlsDisabled}
              variant="secondary"
              onPress={() => state.configure({ roundDuration: Math.min(120, state.roundDuration + 15) })}
            >
              +
            </Button>
          </div>
        </Card.Content>
      </Card>
      {validationMessage ? <Alert className="border border-[var(--danger)]">{validationMessage}</Alert> : null}
      {startError ? <Alert className="border border-[var(--danger)]">{startError}</Alert> : null}
      <Button isDisabled={!data || !validation?.ok || controlsDisabled} isPending={isStarting} onPress={() => void start()}>
        Начать игру · {playableCount} слов
      </Button>
    </section>
  );
}
