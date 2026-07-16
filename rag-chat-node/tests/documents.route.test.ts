import request from "supertest";
import { beforeEach, describe, expect, it } from "vitest";
import { createApp } from "../src/server";
import { clearDocuments } from "../src/services/document.service";

describe("POST /documents", () => {
  beforeEach(() => {
    clearDocuments();
  });

  it("ingere um documento e retorna seus metadados", async () => {
    const app = createApp();

    const res = await request(app)
      .post("/documents")
      .send({ title: "Manual", text: "Este é um documento de teste sobre políticas de férias da empresa." });

    expect(res.status).toBe(201);
    expect(res.body).toMatchObject({ title: "Manual", chunkCount: 1 });
    expect(res.body.id).toBeTruthy();
  }, 30000);

  it("retorna 400 quando o texto está vazio", async () => {
    const app = createApp();

    const res = await request(app).post("/documents").send({ title: "Vazio", text: "" });

    expect(res.status).toBe(400);
  });

  it("lista os documentos ingeridos em GET /documents", async () => {
    const app = createApp();
    await request(app).post("/documents").send({ title: "Doc 1", text: "conteúdo do primeiro documento" });

    const res = await request(app).get("/documents");

    expect(res.status).toBe(200);
    expect(res.body).toHaveLength(1);
    expect(res.body[0].title).toBe("Doc 1");
  }, 30000);
});
