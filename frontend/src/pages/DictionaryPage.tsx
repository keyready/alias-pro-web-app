import { Alert, Button, Card, Chip, Spinner } from "@heroui/react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { api } from "../shared/api/client";
import { useGameStore } from "../features/game/store";

export function DictionaryPage() { const navigate = useNavigate(); const selected = useGameStore((s) => s.dictionaryId); const setDictionary = useGameStore((s) => s.setDictionary); const { data, isLoading, error } = useQuery({ queryKey: ["dictionaries"], queryFn: api.dictionaries }); return <section className="flex flex-col gap-4"><div className="flex items-center justify-between"><h1 className="text-3xl font-bold">Словари</h1><Button variant="secondary" onPress={() => navigate("/import")}>+ Загрузить</Button></div>{isLoading ? <Spinner /> : null}{error ? <Alert className="border border-[var(--danger)]">Не удалось загрузить словари</Alert> : null}{data?.map((item) => <Card key={item.id} variant={selected === item.id ? "tertiary" : "default"}><Card.Header><Card.Title>{item.title}</Card.Title><Card.Description>{item.wordsCount} слов · {item.source === "system" ? "системный" : "загруженный"}</Card.Description></Card.Header><Card.Footer className="justify-between"><Chip>{item.id}</Chip><Button onPress={() => { setDictionary(item.id); navigate("/settings"); }}>Играть</Button></Card.Footer></Card>)}</section>; }
