# 5. Documentação da API

A especificação completa da API está em [`../rag-chat-node/openapi.yaml`](../rag-chat-node/openapi.yaml)
(OpenAPI 3.0) e é servida interativamente pela própria aplicação em **`GET /docs`**
(Swagger UI), assim que o serviço está no ar:

```bash
docker compose up --build
# http://localhost:3000/docs
```

Este documento traz um resumo com exemplos de `curl` prontos para uso manual.

## 5.1 `GET /health`

Verificação simples de disponibilidade.

```bash
curl http://localhost:3000/health
```

```json
{ "status": "ok" }
```

## 5.2 `POST /documents` — ingerir um documento

Recebe `title` e `text`, faz chunking + embeddings e guarda no vector store.

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{
    "title": "Política de Férias",
    "text": "Funcionários têm direito a 30 dias corridos de férias por ano trabalhado, a serem agendados com pelo menos 30 dias de antecedência junto ao RH."
  }'
```

Resposta `201 Created`:

```json
{
  "id": "d290f1ee-6c54-4b01-90e6-d701748f0851",
  "title": "Política de Férias",
  "createdAt": "2026-07-15T23:40:00.000Z",
  "chunkCount": 1
}
```

Se `title` ou `text` estiverem ausentes/vazios, a API responde `400 Bad Request` com o
detalhamento da validação (via Zod).

## 5.3 `GET /documents` — listar documentos ingeridos

```bash
curl http://localhost:3000/documents
```

```json
[
  { "id": "...", "title": "Política de Férias", "createdAt": "...", "chunkCount": 1 }
]
```

## 5.4 `POST /chat` — perguntar com base nos documentos

```bash
curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{ "question": "Quantos dias de férias eu tenho por ano?" }'
```

Resposta `200 OK`:

```json
{
  "id": "5f8d3c2a-...",
  "question": "Quantos dias de férias eu tenho por ano?",
  "answer": "De acordo com a política de férias, você tem direito a 30 dias corridos por ano trabalhado.",
  "retrievedChunkIds": ["a1b2c3..."],
  "createdAt": "2026-07-15T23:41:00.000Z"
}
```

> Sem `ANTHROPIC_API_KEY` configurada, o campo `answer` é preenchido por um modo
> heurístico determinístico (prefixo `[Resposta heurística ...]`), para que a API
> continue 100% demonstrável sem custo. Ver decisão de arquitetura em
> [`03-arquitetura-design.md`](03-arquitetura-design.md).

## 5.5 `GET /history` — histórico de perguntas e respostas

```bash
curl http://localhost:3000/history
```

```json
[
  {
    "id": "5f8d3c2a-...",
    "question": "Quantos dias de férias eu tenho por ano?",
    "answer": "...",
    "retrievedChunkIds": ["a1b2c3..."],
    "createdAt": "2026-07-15T23:41:00.000Z"
  }
]
```

Itens mais recentes primeiro; a lista é limitada a `HISTORY_MAX_ITEMS` (padrão: 50).

## 5.6 Códigos de erro

| Código | Quando ocorre |
|---|---|
| `400 Bad Request` | Corpo da requisição não passa na validação Zod (`title`/`text`/`question` ausente ou vazio) |
| `500 Internal Server Error` | Falha inesperada (ex.: erro na chamada à API do Claude) |
