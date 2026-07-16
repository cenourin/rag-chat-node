import Anthropic from "@anthropic-ai/sdk";
import { config, isClaudeConfigured } from "../config";
import type { RetrievedChunk } from "../types";

let client: Anthropic | null = null;

function getClient(): Anthropic {
  if (!client) {
    client = new Anthropic({ apiKey: config.anthropicApiKey });
  }
  return client;
}

function buildPrompt(question: string, context: RetrievedChunk[]): string {
  const contextBlock = context
    .map((item, i) => `[Trecho ${i + 1}]\n${item.chunk.text}`)
    .join("\n\n");

  return [
    "Você é um assistente que responde perguntas usando SOMENTE o contexto fornecido abaixo.",
    "Se a resposta não estiver no contexto, diga que não encontrou essa informação nos documentos.",
    "",
    "Contexto:",
    contextBlock || "(nenhum trecho relevante encontrado)",
    "",
    `Pergunta: ${question}`,
  ].join("\n");
}

/**
 * Motor duplo: com ANTHROPIC_API_KEY configurada, usa o Claude de verdade;
 * sem ela, cai em um resumo determinístico dos trechos recuperados. Mesma
 * interface de saída nos dois casos — o projeto fica 100% demonstrável sem
 * exigir credenciais pagas, e passa a usar IA real assim que uma chave é
 * adicionada ao `.env`, sem alteração de código.
 */
export async function generateAnswer(question: string, context: RetrievedChunk[]): Promise<string> {
  if (!isClaudeConfigured()) {
    return fallbackAnswer(question, context);
  }

  const anthropic = getClient();
  const message = await anthropic.messages.create({
    model: config.claudeModel,
    max_tokens: 1024,
    messages: [{ role: "user", content: buildPrompt(question, context) }],
  });

  const textBlock = message.content.find((block) => block.type === "text");
  return textBlock && textBlock.type === "text" ? textBlock.text : "";
}

function fallbackAnswer(question: string, context: RetrievedChunk[]): string {
  if (context.length === 0) {
    return `Não encontrei documentos relevantes para responder: "${question}".`;
  }

  const bestSnippet = context[0].chunk.text.slice(0, 300);
  return (
    `[Resposta heurística - configure ANTHROPIC_API_KEY para respostas geradas pelo Claude]\n` +
    `Com base no trecho mais relevante encontrado: "${bestSnippet}${bestSnippet.length === 300 ? "..." : ""}"`
  );
}
