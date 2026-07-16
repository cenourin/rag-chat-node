import { randomUUID } from "node:crypto";
import { config } from "../config";
import type { ChatHistoryItem } from "../types";

/**
 * Buffer circular simples em memória: mantém no máximo `historyMaxItems`
 * itens, descartando os mais antigos. Evita crescimento ilimitado de
 * memória em uma demo de longa duração sem precisar de um banco de dados.
 */
const history: ChatHistoryItem[] = [];

export function recordHistory(question: string, answer: string, retrievedChunkIds: string[]): ChatHistoryItem {
  const item: ChatHistoryItem = {
    id: randomUUID(),
    question,
    answer,
    retrievedChunkIds,
    createdAt: new Date().toISOString(),
  };

  history.push(item);
  if (history.length > config.historyMaxItems) {
    history.splice(0, history.length - config.historyMaxItems);
  }

  return item;
}

export function listHistory(): ChatHistoryItem[] {
  return [...history].reverse();
}

export function clearHistory(): void {
  history.length = 0;
}
