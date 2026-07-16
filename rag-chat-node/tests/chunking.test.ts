import { describe, expect, it } from "vitest";
import { chunkText } from "../src/services/chunking.service";

describe("chunkText", () => {
  it("retorna array vazio para texto vazio", () => {
    expect(chunkText("doc-1", "   ", { chunkSize: 100, chunkOverlap: 10 })).toEqual([]);
  });

  it("retorna um único chunk quando o texto é menor que chunkSize", () => {
    const chunks = chunkText("doc-1", "olá mundo", { chunkSize: 100, chunkOverlap: 10 });
    expect(chunks).toHaveLength(1);
    expect(chunks[0].text).toBe("olá mundo");
    expect(chunks[0].index).toBe(0);
    expect(chunks[0].documentId).toBe("doc-1");
  });

  it("divide texto longo em múltiplos chunks respeitando o overlap", () => {
    const text = "a".repeat(250);
    const chunks = chunkText("doc-1", text, { chunkSize: 100, chunkOverlap: 20 });

    expect(chunks.length).toBeGreaterThan(1);
    chunks.forEach((chunk, i) => expect(chunk.index).toBe(i));

    const totalCovered = chunks[chunks.length - 1].index * (100 - 20) + chunks[chunks.length - 1].text.length;
    expect(totalCovered).toBeGreaterThanOrEqual(text.length);
  });

  it("gera ids únicos por chunk", () => {
    const chunks = chunkText("doc-1", "a".repeat(500), { chunkSize: 100, chunkOverlap: 10 });
    const ids = new Set(chunks.map((c) => c.id));
    expect(ids.size).toBe(chunks.length);
  });

  it("lança erro quando chunkOverlap >= chunkSize", () => {
    expect(() => chunkText("doc-1", "texto", { chunkSize: 50, chunkOverlap: 50 })).toThrow();
  });

  it("lança erro quando chunkSize <= 0", () => {
    expect(() => chunkText("doc-1", "texto", { chunkSize: 0, chunkOverlap: 0 })).toThrow();
  });
});
