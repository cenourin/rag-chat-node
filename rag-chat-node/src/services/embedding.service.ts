import type { FeatureExtractionPipeline } from "@xenova/transformers";

const MODEL_NAME = "Xenova/all-MiniLM-L6-v2";

/**
 * Singleton preguiçoso (lazy singleton) do pipeline de embeddings.
 *
 * O carregamento do modelo (download + inicialização do ONNX runtime) custa
 * ~1-2s e consome memória; instanciar um `FeatureExtractionPipeline` por
 * requisição seria desperdício. Guardamos a Promise (não o valor resolvido)
 * em módulo para que chamadas concorrentes durante o carregamento aguardem
 * a mesma instância em vez de disparar múltiplos downloads/inicializações.
 */
let pipelinePromise: Promise<FeatureExtractionPipeline> | null = null;

async function getPipeline(): Promise<FeatureExtractionPipeline> {
  if (!pipelinePromise) {
    pipelinePromise = import("@xenova/transformers").then(({ pipeline }) =>
      pipeline("feature-extraction", MODEL_NAME),
    );
  }
  return pipelinePromise;
}

export async function embedText(text: string): Promise<number[]> {
  const extractor = await getPipeline();
  const output = await extractor(text, { pooling: "mean", normalize: true });
  return Array.from(output.data as Float32Array);
}

export async function embedBatch(texts: string[]): Promise<number[][]> {
  const extractor = await getPipeline();
  const embeddings: number[][] = [];

  for (const text of texts) {
    const output = await extractor(text, { pooling: "mean", normalize: true });
    embeddings.push(Array.from(output.data as Float32Array));
  }

  return embeddings;
}
