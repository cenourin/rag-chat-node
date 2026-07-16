import { randomUUID } from "node:crypto";
import type { Chunk, ChunkingOptions } from "../types";

/**
 * Divide um texto em pedaços (chunks) de tamanho aproximado `chunkSize`,
 * com sobreposição `chunkOverlap` entre pedaços consecutivos para preservar
 * contexto que atravesse a fronteira de um chunk.
 */
export function chunkText(
  documentId: string,
  text: string,
  options: ChunkingOptions,
): Chunk[] {
  const { chunkSize, chunkOverlap } = options;

  if (chunkSize <= 0) {
    throw new Error("chunkSize deve ser maior que zero");
  }
  if (chunkOverlap < 0 || chunkOverlap >= chunkSize) {
    throw new Error("chunkOverlap deve estar entre 0 e chunkSize - 1");
  }

  const normalized = text.trim();
  if (normalized.length === 0) {
    return [];
  }

  const chunks: Chunk[] = [];
  const stride = chunkSize - chunkOverlap;
  let start = 0;
  let index = 0;

  while (start < normalized.length) {
    const end = Math.min(start + chunkSize, normalized.length);
    const slice = normalized.slice(start, end).trim();

    if (slice.length > 0) {
      chunks.push({
        id: randomUUID(),
        documentId,
        text: slice,
        index,
      });
      index += 1;
    }

    if (end === normalized.length) {
      break;
    }
    start += stride;
  }

  return chunks;
}
