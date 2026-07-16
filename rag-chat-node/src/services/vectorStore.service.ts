import type { EmbeddedChunk, RetrievedChunk } from "../types";
import { cosineSimilarity } from "../utils/cosineSimilarity";

/**
 * Repository Pattern: encapsula o armazenamento e a busca de chunks
 * embedded atrás de uma interface simples (add/search/list), isolando o
 * resto da aplicação da estrutura de armazenamento real.
 *
 * A implementação atual guarda tudo em um array em memória e faz busca por
 * força bruta (O(n) por consulta), decisão deliberada para manter o projeto
 * sem dependências externas (ver docs/03-arquitetura-design.md). Trocar por
 * um banco vetorial no futuro significa reimplementar apenas esta classe.
 */
export class InMemoryVectorStore {
  private chunks: EmbeddedChunk[] = [];

  add(chunks: EmbeddedChunk[]): void {
    this.chunks.push(...chunks);
  }

  search(queryEmbedding: number[], topK: number): RetrievedChunk[] {
    return this.chunks
      .map((chunk) => ({ chunk, score: cosineSimilarity(queryEmbedding, chunk.embedding) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, topK);
  }

  removeByDocumentId(documentId: string): number {
    const before = this.chunks.length;
    this.chunks = this.chunks.filter((chunk) => chunk.documentId !== documentId);
    return before - this.chunks.length;
  }

  count(): number {
    return this.chunks.length;
  }

  countByDocumentId(documentId: string): number {
    return this.chunks.filter((chunk) => chunk.documentId === documentId).length;
  }

  clear(): void {
    this.chunks = [];
  }
}

export const vectorStore = new InMemoryVectorStore();
