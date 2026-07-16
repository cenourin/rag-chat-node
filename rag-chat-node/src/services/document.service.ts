import { randomUUID } from "node:crypto";
import { config } from "../config";
import { chunkText } from "./chunking.service";
import { embedBatch } from "./embedding.service";
import { vectorStore } from "./vectorStore.service";
import type { Document, EmbeddedChunk } from "../types";

/**
 * Registro em memória dos metadados dos documentos ingeridos.
 * Os chunks/embeddings ficam no vectorStore; aqui guardamos só o que
 * identifica o documento como um todo (título, data, quantidade de chunks).
 */
const documents = new Map<string, Document>();

export async function ingestDocument(title: string, text: string): Promise<Document> {
  const documentId = randomUUID();

  const chunks = chunkText(documentId, text, {
    chunkSize: config.chunkSize,
    chunkOverlap: config.chunkOverlap,
  });

  if (chunks.length === 0) {
    throw new Error("Documento vazio após normalização do texto");
  }

  const embeddings = await embedBatch(chunks.map((chunk) => chunk.text));
  const embeddedChunks: EmbeddedChunk[] = chunks.map((chunk, i) => ({
    ...chunk,
    embedding: embeddings[i],
  }));

  vectorStore.add(embeddedChunks);

  const document: Document = {
    id: documentId,
    title,
    createdAt: new Date().toISOString(),
    chunkCount: embeddedChunks.length,
  };
  documents.set(documentId, document);

  return document;
}

export function listDocuments(): Document[] {
  return Array.from(documents.values()).sort((a, b) => a.createdAt.localeCompare(b.createdAt));
}

export function clearDocuments(): void {
  documents.clear();
  vectorStore.clear();
}
