# 4. Plano de Testes

## 4.1 Estratégia

Dois níveis de teste automatizado, ambos com Vitest:

- **Testes unitários** — módulos determinísticos e puros, sem I/O: `chunking.service`,
  `cosineSimilarity`, `vectorStore.service`. Rodam em milissegundos e não dependem de
  rede nem do modelo de embeddings.
- **Testes de integração** — endpoints HTTP completos (`supertest` sobre a `app`
  criada por `createApp()`), exercitando o pipeline real de principio a fim: chunking →
  embedding local (modelo real, baixado uma vez e cacheado) → vector store → resposta
  (modo heurístico, já que os testes não configuram `ANTHROPIC_API_KEY`).

Não há mocks do modelo de embeddings: os testes de integração usam o modelo real
`Xenova/all-MiniLM-L6-v2`, o que valida o pipeline de ponta a ponta ao custo de alguns
segundos por teste na primeira execução (download do modelo, cacheado localmente nas
execuções seguintes).

## 4.2 Casos de Teste

| ID | Caso de teste | Arquivo | Requisito(s) coberto(s) |
|---|---|---|---|
| CT01 | `chunkText` retorna array vazio para texto vazio/em branco | `tests/chunking.test.ts` | RN01 |
| CT02 | `chunkText` retorna um único chunk quando o texto é menor que `chunkSize` | `tests/chunking.test.ts` | RF02 |
| CT03 | `chunkText` divide texto longo em múltiplos chunks respeitando o overlap | `tests/chunking.test.ts` | RF02 |
| CT04 | `chunkText` gera ids únicos por chunk | `tests/chunking.test.ts` | RF02 |
| CT05 | `chunkText` lança erro quando `chunkOverlap >= chunkSize` | `tests/chunking.test.ts` | RN02 |
| CT06 | `chunkText` lança erro quando `chunkSize <= 0` | `tests/chunking.test.ts` | RN02 |
| CT07 | `cosineSimilarity` retorna 1 para vetores idênticos | `tests/cosineSimilarity.test.ts` | RF07 |
| CT08 | `cosineSimilarity` retorna 0 para vetores ortogonais | `tests/cosineSimilarity.test.ts` | RF07 |
| CT09 | `cosineSimilarity` retorna -1 para vetores opostos | `tests/cosineSimilarity.test.ts` | RF07 |
| CT10 | `cosineSimilarity` retorna 0 quando algum vetor é nulo (evita divisão por zero) | `tests/cosineSimilarity.test.ts` | RF07 |
| CT11 | `cosineSimilarity` lança erro para vetores de dimensões diferentes | `tests/cosineSimilarity.test.ts` | RF07 |
| CT12 | `InMemoryVectorStore` armazena e conta chunks | `tests/vectorStore.test.ts` | RF04 |
| CT13 | `InMemoryVectorStore.search` retorna os chunks mais similares em ordem decrescente | `tests/vectorStore.test.ts` | RF07 |
| CT14 | `InMemoryVectorStore.removeByDocumentId` remove e retorna a contagem removida | `tests/vectorStore.test.ts` | RF04 |
| CT15 | `InMemoryVectorStore.clear` limpa todos os chunks | `tests/vectorStore.test.ts` | RF04 |
| CT16 | `POST /documents` ingere documento e retorna metadados (`201`) | `tests/documents.route.test.ts` | RF01, RF02, RF03, RF04, UC01 |
| CT17 | `POST /documents` retorna `400` quando `text` está vazio | `tests/documents.route.test.ts` | RNF01, UC01-A1 |
| CT18 | `GET /documents` lista os documentos ingeridos | `tests/documents.route.test.ts` | RF05, UC02 |
| CT19 | `POST /chat` responde em modo heurístico sem `ANTHROPIC_API_KEY` | `tests/chat.route.test.ts` | RF06, RF09, UC03, UC03-A2 |
| CT20 | `POST /chat` retorna `400` quando `question` está vazia | `tests/chat.route.test.ts` | RNF01, UC03-A1 |
| CT21 | `POST /chat` responde mesmo sem nenhum documento ingerido (contexto vazio) | `tests/chat.route.test.ts` | RN04, UC03-A3 |
| CT22 | `GET /history` retorna lista vazia quando nenhuma pergunta foi feita | `tests/history.route.test.ts` | UC04-A1 |
| CT23 | `GET /history` retorna perguntas em ordem mais recente primeiro | `tests/history.route.test.ts` | RF10, RF11, UC04 |

## 4.3 Execução

```bash
cd rag-chat-node
npm test                 # roda a suíte completa uma vez
npm run test:coverage    # com relatório de cobertura (v8)
npm run lint              # checagem estática de tipos (tsc --noEmit)

# ou, dentro do container:
docker compose run --rm api npm test
```

## 4.4 Cobertura observada

Suíte completa: **23/23 testes passando** (6 arquivos de teste), cobrindo os três
módulos determinísticos puros (chunking, similaridade de cosseno, vector store) e os
quatro endpoints HTTP (`/documents` POST+GET, `/chat` POST, `/history` GET). O único
caminho não exercitado automaticamente é a integração real com a API do Claude (CT19
cobre o caminho heurístico) — testá-lo exigiria uma chave de API paga em CI, trade-off
documentado no [ADR-02](03-arquitetura-design.md#adr-02-motor-duplo-claude--heurístico-para-geração-de-resposta).

## 4.5 Definition of Done

Uma funcionalidade é considerada concluída quando:

1. O requisito funcional correspondente (ver [`01-requisitos.md`](01-requisitos.md))
   está implementado e o caso de uso associado (ver
   [`02-casos-de-uso.md`](02-casos-de-uso.md)) funciona ponta a ponta via `curl`/Swagger UI.
2. Existe pelo menos um teste automatizado cobrindo o fluxo principal e, quando
   aplicável, os fluxos alternativos/exceção do caso de uso.
3. `npm test` e `npm run lint` (typecheck) passam sem erros.
4. A build Docker (`docker compose up --build`) sobe a API com sucesso e os endpoints
   respondem dentro do container (não só em `npm run dev`).
5. O endpoint está documentado no `openapi.yaml` e refletido no Swagger UI (`/docs`).
6. Mudanças de comportamento relevantes estão registradas neste plano de testes ou nos
   ADRs de arquitetura, quando alteram uma decisão já documentada.
