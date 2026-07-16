import { config } from "../config";
import { embedText } from "./embedding.service";
import { vectorStore } from "./vectorStore.service";
import { generateAnswer } from "./claude.service";
import { recordHistory } from "./history.service";
import type { ChatHistoryItem } from "../types";

export async function askQuestion(question: string): Promise<ChatHistoryItem> {
  const queryEmbedding = await embedText(question);
  const retrieved = vectorStore.search(queryEmbedding, config.retrievalTopK);
  const answer = await generateAnswer(question, retrieved);

  return recordHistory(
    question,
    answer,
    retrieved.map((item) => item.chunk.id),
  );
}
