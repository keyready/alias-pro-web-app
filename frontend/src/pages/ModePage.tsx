import { Button, Card } from "@heroui/react";
import { useNavigate } from "react-router-dom";
import { useGameStore } from "../features/game/store";
import type { GameMode } from "../shared/types";

export function ModePage() { const navigate = useNavigate(); const setMode = useGameStore((s) => s.setMode); const choose = (mode: GameMode) => { setMode(mode); navigate("/teams"); }; return <section className="flex flex-col gap-4"><h1 className="text-3xl font-bold">Выберите режим</h1><Card><Card.Header><Card.Title>Классический</Card.Title><Card.Description>Все команды играют всеми словами выбранной сложности.</Card.Description></Card.Header><Card.Footer><Button fullWidth onPress={() => choose("classic")}>Играть классику</Button></Card.Footer></Card><Card><Card.Header><Card.Title>Мальчики против девочек</Card.Title><Card.Description>Мальчики объясняют женские слова, девочки — мужские.</Card.Description></Card.Header><Card.Footer><Button fullWidth variant="secondary" onPress={() => choose("genderBattle")}>Выбрать gender battle</Button></Card.Footer></Card></section>; }
