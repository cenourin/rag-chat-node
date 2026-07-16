import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server";
import { clearDocuments } from "../src/services/document.service";
import { clearHistory } from "../src/services/history.service";

describe("POST /chat", () => {
  beforeEach(() => {
    clearDocuments();
    clearHistory();
  });

  it("responde usando o modo heurístico quando não há ANTHROPIC_API_KEY configurada", async () => {
    const app = createApp();
    await request(app)
      .post("/documents")
      .send({ title: "Férias", text: "Funcionários têm direito a 30 dias de férias por ano." });

    const res = await request(app).post("/chat").send({ question: "Quantos dias de férias eu tenho?" });

    expect(res.status).toBe(200);
    expect(res.body.question).toBe("Quantos dias de férias eu tenho?");
    expect(res.body.answer).toContain("Resposta heurística");
    expect(res.body.retrievedChunkIds.length).toBeGreaterThan(0);
  }, 30000);

  it("retorna 400 quando a pergunta está vazia", async () => {
    const app = createApp();
    const res = await request(app).post("/chat").send({ question: "" });
    expect(res.status).toBe(400);
  });

  it("responde mesmo sem nenhum documento ingerido", async () => {
    const app = createApp();
    const res = await request(app).post("/chat").send({ question: "Existe algum documento?" });

    expect(res.status).toBe(200);
    expect(res.body.retrievedChunkIds).toEqual([]);
  }, 30000);
});
