import { Button, Card, Chip, ProgressBar } from "@heroui/react";
import { AnimatePresence, motion, useMotionValue, useTransform } from "framer-motion";
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../shared/api/client";
import { useGameStore } from "../features/game/store";
import { telegram } from "../features/telegram/telegram";
import type { DictionaryWord } from "../shared/types";

export function GamePage() {
  const navigate = useNavigate();
  const state = useGameStore();
  const team = state.teams[state.currentTeamIndex];
  const [seconds, setSeconds] = useState(state.roundDuration);

  useEffect(() => {
    if (state.status === "playing") {
      telegram.closingConfirmation.enable();
      const id = window.setInterval(() => setSeconds((s) => Math.max(0, s - 1)), 1000);
      return () => {
        window.clearInterval(id);
        telegram.closingConfirmation.disable();
      };
    }
    return undefined;
  }, [state.status]);

  useEffect(() => {
    if (state.status === "playing" && seconds === 0) {
      telegram.haptic.warning();
      state.endRound();
    }
  }, [seconds, state]);

  if (state.status === "idle") {
    return <Card><Card.Header><Card.Title>Нет активной игры</Card.Title></Card.Header><Card.Footer><Button onPress={() => navigate("/")}>На главную</Button></Card.Footer></Card>;
  }

  if (state.status === "handoff") {
    return <section className="flex min-h-[75vh] flex-col justify-center gap-4 text-center">
      <p className="text-[var(--text-secondary)]">Ход команды</p>
      <h1 className="text-5xl font-black" style={{ color: team.color }}>{team.name}</h1>
      <p>Передайте телефон игроку команды.</p>
      <Button
        size="lg"
        isDisabled={state.deck.length === 0}
        onPress={() => {
          telegram.haptic.medium();
          setSeconds(state.roundDuration);
          useGameStore.setState({ status: "playing" });
        }}
      >
        Я готов
      </Button>
    </section>;
  }

  if (state.status === "roundResult") return <RoundResult />;
  if (state.status === "finished") return <Victory />;

  const word = state.deck[state.currentWordIndex % state.deck.length];
  if (!word) {
    return <Card><Card.Header><Card.Title>Нет слов для раунда</Card.Title></Card.Header><Card.Footer><Button onPress={() => navigate("/settings")}>Изменить настройки</Button></Card.Footer></Card>;
  }

  return <section className="flex min-h-[85vh] flex-col gap-4">
    <div className="flex items-center justify-between">
      <div>
        <b>{team.name}</b>
        <p className="text-sm text-[var(--text-secondary)]">{team.score} / {state.targetScore}</p>
      </div>
      <Chip color={seconds <= 10 ? "danger" : "default"}>{seconds}с</Chip>
    </div>
    <ProgressBar value={(seconds / state.roundDuration) * 100} />
    <div className="relative flex flex-1 items-center justify-center">
      <SwipeCard word={word} hintsEnabled={state.hintsEnabled} onAction={state.mark} />
    </div>
    <div className="grid grid-cols-2 gap-3">
      <Button variant="secondary" onPress={() => state.mark("skipped", false)}>Пропустить</Button>
      <Button onPress={() => state.mark("guessed", false)}>Угадано</Button>
    </div>
  </section>;
}

function SwipeCard({ word, hintsEnabled, onAction }: { word: DictionaryWord; hintsEnabled: boolean; onAction: (result: "guessed" | "skipped", hintUsed: boolean) => void }) {
  const [hint, setHint] = useState(false);
  const x = useMotionValue(0);
  const rotate = useTransform(x, [-180, 0, 180], [-10, 0, 10]);
  const right = useTransform(x, [40, 150], [0, 1]);
  const left = useTransform(x, [-150, -40], [1, 0]);
  return <AnimatePresence><motion.div className="absolute w-full max-w-sm touch-pan-y" style={{ x, rotate }} drag="x" dragConstraints={{ left: 0, right: 0 }} onDragEnd={(_, info) => { if (info.offset.x > 100 || info.velocity.x > 700) onAction("guessed", hint); else if (info.offset.x < -100 || info.velocity.x < -700) onAction("skipped", hint); }} initial={{ scale: .96, y: 18, opacity: 0 }} animate={{ scale: 1, y: 0, opacity: 1 }} exit={{ opacity: 0, y: -24 }} transition={{ type: "spring", stiffness: 300, damping: 24 }}><Card className="min-h-[340px] items-center justify-center text-center shadow-2xl"><motion.div style={{ opacity: right }} className="absolute right-6 top-6 rounded-xl border-2 border-[var(--success)] p-2 font-black text-[var(--success)]">УГАДАНО +1</motion.div><motion.div style={{ opacity: left }} className="absolute left-6 top-6 rounded-xl border-2 border-[var(--danger)] p-2 font-black text-[var(--danger)]">ПРОПУСК</motion.div><Card.Content className="items-center gap-6"><p className="text-4xl font-black uppercase tracking-wide">{word.word}</p>{hintsEnabled && word.hint ? <Button variant="secondary" onPress={() => setHint(true)}>Подсказка</Button> : null}{hint ? <motion.p initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="text-[var(--text-secondary)]">{word.hint}</motion.p> : null}</Card.Content></Card></motion.div></AnimatePresence>;
}

function RoundResult() { const state = useGameStore(); const team = state.teams[state.currentTeamIndex]; const delta = state.roundWords.reduce((sum, word) => sum + word.points, 0); const sync = async () => { if (state.serverGameId) await api.syncRound(state.serverGameId, { clientRoundId: crypto.randomUUID(), teamId: team.id, roundIndex: state.roundIndex, words: state.roundWords, scoreDelta: delta, finishedAt: new Date().toISOString() }); state.nextRound(); }; return <section className="flex flex-col gap-4"><h1 className="text-3xl font-bold">Раунд окончен</h1><Card><Card.Header><Card.Title>{team.name}: {delta >= 0 ? "+" : ""}{delta}</Card.Title><Card.Description>Итого {team.score} / {state.targetScore}</Card.Description></Card.Header><Card.Content>{state.roundWords.map((word) => <div key={word.wordId} className="flex justify-between border-b border-[var(--border)] py-2"><span>{word.word}</span><b>{word.points}</b></div>)}</Card.Content><Card.Footer><Button fullWidth onPress={() => void sync()}>Передать ход</Button></Card.Footer></Card></section>; }

function Victory() { const state = useGameStore(); const navigate = useNavigate(); const winner = [...state.teams].sort((a, b) => b.score - a.score)[0]; return <section className="flex min-h-[80vh] flex-col justify-center gap-4 text-center"><div className="text-7xl">🏆</div><h1 className="text-4xl font-black">{winner.name}</h1><p>{winner.score} очков</p><Card><Card.Content>{[...state.teams].sort((a, b) => b.score - a.score).map((team, i) => <div key={team.id} className="flex justify-between py-2"><span>{i + 1}. {team.name}</span><b>{team.score}</b></div>)}</Card.Content><Card.Footer className="flex-col gap-2"><Button fullWidth onPress={() => { state.rematch(); navigate("/settings"); }}>Сыграть ещё раз</Button><Button fullWidth variant="secondary" onPress={() => { state.reset(); navigate("/"); }}>На главную</Button></Card.Footer></Card></section>; }
