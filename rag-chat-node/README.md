# rag-chat-node

API REST em Node.js/TypeScript que responde perguntas sobre documentos ingeridos
usando um pipeline **RAG** (Retrieval-Augmented Generation): ingestão → chunking →
embeddings locais → busca por similaridade de cosseno → geração de resposta com a
API do **Claude** (Anthropic).

Projeto de portfólio pessoal. Documentação completa de engenharia de software em
[`../docs/`](../docs):

- [`01-requisitos.md`](../docs/01-requisitos.md) — levantamento de requisitos funcionais/não funcionais e regras de negócio.
- [`02-casos-de-uso.md`](../docs/02-casos-de-uso.md) — casos de uso detalhados (UC01-UC05).
- [`03-arquitetura-design.md`](../docs/03-arquitetura-design.md) — arquitetura em camadas e ADRs.
- [`04-plano-de-testes.md`](../docs/04-plano-de-testes.md) — plano e casos de teste.
- [`05-documentacao-api.md`](../docs/05-documentacao-api.md) — exemplos de request/response por endpoint.
- [`documento-engenharia-software.pdf`](../docs/documento-engenharia-software.pdf) — relatório técnico consolidado (LaTeX/PDF).

## Como rodar

```bash
docker compose up --build
```

A API fica disponível em `http://localhost:3000`, com documentação interativa
(Swagger UI) em `http://localhost:3000/docs`.

Por padrão, sem nenhuma configuração, o endpoint `/chat` já funciona usando um
**motor de resposta heurístico local** (sem custo, sem chave de API). Para usar o
Claude de verdade:

```bash
cp .env.example .env
# edite .env e preencha ANTHROPIC_API_KEY
docker compose up --build
```

## Exemplo de uso

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{"title": "Política de Férias", "text": "Funcionários têm direito a 30 dias corridos de férias por ano trabalhado."}'

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Quantos dias de férias eu tenho por ano?"}'

curl http://localhost:3000/history
```

Mais exemplos em [`../docs/05-documentacao-api.md`](../docs/05-documentacao-api.md).

## Rodando os testes

```bash
npm install
npm test              # suíte completa (23 testes: unitários + integração)
npm run test:coverage # com relatório de cobertura

# ou, dentro do container:
docker compose run --rm api npm test
```

## Desenvolvimento local (sem Docker)

```bash
npm install
cp .env.example .env
npm run dev   # tsx watch, recarrega a cada alteração em src/
```

## Stack

Node.js 20, TypeScript, Express, Zod, `@anthropic-ai/sdk`, `@xenova/transformers`
(embeddings locais), Vitest + Supertest, OpenAPI 3.0 + Swagger UI, Docker.
