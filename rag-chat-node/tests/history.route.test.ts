import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server";
import { clearDocuments } from "../src/services/document.service";
import { clearHistory } from "../src/services/history.service";

describe("GET /history", () => {
  beforeEach(() => {
    clearDocuments();
    clearHistory();
  });

  it("retorna array vazio quando nenhuma pergunta foi feita", async () => {
    const app = createApp();
    const res = await request(app).get("/history");
    expect(res.status).toBe(200);
    expect(res.body).toEqual([]);
  });

  it("retorna as perguntas feitas em ordem mais recente primeiro", async () => {
    const app = createApp();
    await request(app).post("/chat").send({ question: "Primeira pergunta" });
    await request(app).post("/chat").send({ question: "Segunda pergunta" });

    const res = await request(app).get("/history");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(2);
    expect(res.body[0].question).toBe("Segunda pergunta");
    expect(res.body[1].question).toBe("Primeira pergunta");
  }, 30000);
});
