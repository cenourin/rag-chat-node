import { Router } from "express";
import { createDocumentSchema } from "../schemas/documents.schema";
import { ingestDocument, listDocuments } from "../services/document.service";

export const documentsRouter = Router();

documentsRouter.post("/", async (req, res, next) => {
  try {
    const input = createDocumentSchema.parse(req.body);
    const document = await ingestDocument(input.title, input.text);
    res.status(201).json(document);
  } catch (err) {
    next(err);
  }
});

documentsRouter.get("/", (_req, res) => {
  res.json(listDocuments());
});
