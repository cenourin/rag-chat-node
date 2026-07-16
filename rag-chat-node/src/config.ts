import "dotenv/config";

function toInt(value: string | undefined, fallback: number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export const config = {
  port: toInt(process.env.PORT, 3000),
  anthropicApiKey: process.env.ANTHROPIC_API_KEY ?? "",
  claudeModel: process.env.CLAUDE_MODEL ?? "claude-sonnet-4-5",
  chunkSize: toInt(process.env.CHUNK_SIZE, 2000),
  chunkOverlap: toInt(process.env.CHUNK_OVERLAP, 200),
  retrievalTopK: toInt(process.env.RETRIEVAL_TOP_K, 4),
  historyMaxItems: toInt(process.env.HISTORY_MAX_ITEMS, 50),
};

export const isClaudeConfigured = (): boolean => config.anthropicApiKey.length > 0;
