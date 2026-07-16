import { beforeEach, describe, expect, it } from "vitest";
import { InMemoryVectorStore } from "../src/services/vectorStore.service";
import type { EmbeddedChunk } from "../src/types";

function makeChunk(id: string, documentId: string, embedding: number[]): EmbeddedChunk {
  return { id, documentId, text: `texto ${id}`, index: 0, embedding };
}

describe("InMemoryVectorStore", () => {
  let store: InMemoryVectorStore;

  beforeEach(() => {
    store = new InMemoryVectorStore();
  });

  it("armazena e conta chunks", () => {
    store.add([makeChunk("c1", "doc1", [1, 0]), makeChunk("c2", "doc1", [0, 1])]);
    expect(store.count()).toBe(2);
  });

  it("retorna os chunks mais similares em ordem decrescente de score", () => {
    store.add([
      makeChunk("c1", "doc1", [1, 0]),
      makeChunk("c2", "doc1", [0, 1]),
      makeChunk("c3", "doc1", [0.9, 0.1]),
    ]);

    const results = store.search([1, 0], 2);

    expect(results).toHaveLength(2);
    expect(results[0].chunk.id).toBe("c1");
    expect(results[1].chunk.id).toBe("c3");
    expect(results[0].score).toBeGreaterThan(results[1].score);
  });

  it("remove chunks por documentId e retorna a contagem removida", () => {
    store.add([
      makeChunk("c1", "doc1", [1, 0]),
      makeChunk("c2", "doc2", [0, 1]),
    ]);

    const removed = store.removeByDocumentId("doc1");

    expect(removed).toBe(1);
    expect(store.count()).toBe(1);
    expect(store.countByDocumentId("doc2")).toBe(1);
  });

  it("limpa todos os chunks", () => {
    store.add([makeChunk("c1", "doc1", [1, 0])]);
    store.clear();
    expect(store.count()).toBe(0);
  });
});
