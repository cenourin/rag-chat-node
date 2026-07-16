export interface Chunk {
  id: string;
  documentId: string;
  text: string;
  index: number;
}

export interface EmbeddedChunk extends Chunk {
  embedding: number[];
}

export interface Document {
  id: string;
  title: string;
  createdAt: string;
  chunkCount: number;
}

export interface RetrievedChunk {
  chunk: EmbeddedChunk;
  score: number;
}

export interface ChatHistoryItem {
  id: string;
  question: string;
  answer: string;
  retrievedChunkIds: string[];
  createdAt: string;
}

export interface ChunkingOptions {
  chunkSize: number;
  chunkOverlap: number;
}
