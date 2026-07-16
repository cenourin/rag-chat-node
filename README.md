# Estágio em Desenvolvimento (Node.js / IA Generativa) — Portfólio

Projeto de portfólio pessoal voltado a vagas de **Estágio em Desenvolvimento** com
foco em Node.js/TypeScript e integração com LLMs: uma API REST que implementa um
pipeline de **RAG** (Retrieval-Augmented Generation) de ponta a ponta, containerizada
com Docker.

## Projeto

### [`rag-chat-node`](rag-chat-node)

API que ingere documentos textuais, divide em *chunks*, gera embeddings localmente
(sem custo de API externa), busca por similaridade de cosseno e usa a API do
**Claude** (Anthropic) para responder perguntas em linguagem natural fundamentadas
nesses documentos. Roda em `http://localhost:3000`, com documentação interativa em
`http://localhost:3000/docs`.

```bash
cd rag-chat-node
docker compose up --build
```

Por padrão, sem nenhuma configuração, o `/chat` já funciona em modo heurístico local
(sem custo, sem chave de API). Para usar o Claude de verdade: `cp .env.example .env`
e preencha `ANTHROPIC_API_KEY` antes de subir o container.

## Endpoints

| Método | Rota | Descrição |
|---|---|---|
| `POST` | `/documents` | Ingere um documento (`title` + `text`): chunking → embeddings locais → vector store. Retorna `201` com os metadados do documento. |
| `GET` | `/documents` | Lista os documentos ingeridos (`id`, `title`, `createdAt`, `chunkCount`). |
| `POST` | `/chat` | Recebe uma `question`, recupera os chunks mais similares e retorna a resposta gerada (Claude ou fallback heurístico). |
| `GET` | `/history` | Lista o histórico de perguntas/respostas, mais recentes primeiro. |
| `GET` | `/health` | Verificação de disponibilidade. |
| `GET` | `/docs` | Swagger UI interativo, gerado a partir de [`rag-chat-node/openapi.yaml`](rag-chat-node/openapi.yaml). |

Exemplo completo:

```bash
curl -X POST http://localhost:3000/documents \
  -H "Content-Type: application/json" \
  -d '{"title": "Política de Férias", "text": "Funcionários têm direito a 30 dias corridos de férias por ano trabalhado."}'

curl -X POST http://localhost:3000/chat \
  -H "Content-Type: application/json" \
  -d '{"question": "Quantos dias de férias eu tenho por ano?"}'

curl http://localhost:3000/history
```

Mais exemplos de request/response (incluindo casos de erro) em
[`docs/05-documentacao-api.md`](docs/05-documentacao-api.md).

## Requisitos

**Atores:** Usuário da API (consumidor HTTP, sem diferenciação de perfis nesta
versão); Claude (Anthropic API, gera a resposta final); Modelo de Embeddings Local
(`@xenova/transformers`, roda dentro do próprio processo).

**Principais requisitos funcionais:**

| ID | Descrição |
|---|---|
| RF01–RF04 | Ingerir documento (`POST /documents`): dividir em chunks com overlap, gerar embedding local por chunk, armazenar em vector store buscável. |
| RF05 | Listar documentos ingeridos (`GET /documents`). |
| RF06–RF08 | Responder pergunta (`POST /chat`): embedding da pergunta, recuperação dos top-K chunks mais similares (cosseno), prompt com contexto enviado ao Claude. |
| RF09 | Sem `ANTHROPIC_API_KEY`, gerar resposta heurística com o mesmo contrato de saída. |
| RF10–RF12 | Registrar e consultar histórico de perguntas/respostas (`GET /history`), limitado a `HISTORY_MAX_ITEMS`. |
| RF13–RF14 | `GET /health` e documentação interativa (`GET /docs`). |

**Principais requisitos não funcionais:** validação de entrada com erro `400`
detalhado (Zod); erros inesperados tratados centralizadamente (`500`, sem derrubar o
processo); subida com um único comando Docker; embeddings sem custo de API;
TypeScript `strict`; cobertura de testes automatizados; documentação OpenAPI 3.0;
corpo de requisição limitado a 5MB.

**Regras de negócio:** documento vazio não pode ser ingerido; `chunkOverlap` sempre
menor que `chunkSize`; `/chat` sempre retorna o mesmo formato de resposta, com ou sem
Claude configurado; perguntas sem documentos ingeridos são respondidas normalmente
(contexto vazio), não retornam erro.

Levantamento completo (com prioridades e categorias) em
[`docs/01-requisitos.md`](docs/01-requisitos.md).

## Casos de uso

| Caso de uso | Resumo |
|---|---|
| **UC01 — Ingerir Documento** | Usuário envia `title`+`text` → chunking → embeddings → armazenamento → `201` com metadados. Falha (`400`) se o texto estiver vazio; falha (`500`) se a geração de embeddings der erro, sem persistir dado parcial. |
| **UC02 — Listar Documentos** | `GET /documents` → lista ordenada por data; `200` com array vazio se não houver nenhum. |
| **UC03 — Fazer Pergunta (Chat RAG)** | Pergunta → embedding → top-K chunks mais similares → prompt com contexto → Claude (ou heurístico sem chave) → registra no histórico → retorna resposta. Funciona mesmo sem documentos ingeridos (contexto vazio) e sem chave do Claude (resposta heurística, mesmo contrato). |
| **UC04 — Consultar Histórico** | `GET /history` → itens mais recentes primeiro, limitados a `HISTORY_MAX_ITEMS`. |
| **UC05 — Verificar Disponibilidade** | `GET /health` → `200` sem depender de nenhum recurso externo. |

Especificação completa (pré-condições, fluxos alternativos/exceção, pós-condições e
diagrama de casos de uso) em [`docs/02-casos-de-uso.md`](docs/02-casos-de-uso.md).

## Arquitetura

Arquitetura em camadas clássica de APIs Express — cada camada só conhece a
imediatamente abaixo, mantendo as rotas finas e as regras de negócio testáveis
isoladamente do framework HTTP:

```
Cliente HTTP
   -> routes/        controllers Express (documents, chat, history)
   -> schemas/        validação de entrada (Zod)
   -> services/        regras de negócio (chunking, embedding, vectorStore,
                        document, claude, history, chat)
   -> utils/           cosineSimilarity
   -> integrações      modelo local (@xenova/transformers) + Claude API (Anthropic)
```

Erros de qualquer camada são propagados via `next(err)` até um middleware único
(`error-handler.ts`), que decide o status HTTP e o formato da resposta.

**Decisões de arquitetura (resumo — contexto e justificativa completos em
[`docs/03-arquitetura-design.md`](docs/03-arquitetura-design.md)):**

- **Vector store em memória (Repository Pattern).** Escopo de portfólio, não milhões
  de documentos: um banco vetorial externo (Pinecone, Qdrant) adicionaria
  infraestrutura sem necessidade real. `InMemoryVectorStore` expõe uma interface
  pequena (`add`/`search`/`clear`) que isola o resto da aplicação da estrutura de
  armazenamento — trocar por um banco vetorial no futuro significa reimplementar
  apenas essa classe.
- **Motor duplo — Claude + heurístico.** Uma chave paga não deve ser requisito para
  testar o projeto. Sem `ANTHROPIC_API_KEY`, o sistema cai em uma resposta
  heurística determinística, com o mesmo contrato de saída — o projeto fica 100%
  demonstrável sem custo e passa a usar IA real assim que a chave é configurada,
  sem alteração de código.
- **Embeddings locais (Lazy Singleton).** Evita uma segunda dependência de API paga
  só para vetorização. O modelo (`Xenova/all-MiniLM-L6-v2`) roda no próprio
  processo via ONNX runtime; o pipeline é carregado uma única vez (Promise
  guardada em módulo), evitando inicializações concorrentes.
- **Validação centralizada (Zod + middleware único).** Cada rota declara um schema
  Zod; erros de validação e de negócio são tratados por um único middleware,
  garantindo contrato de erro consistente entre endpoints.
- **Sem autenticação no MVP.** Escopo é demonstrar o pipeline RAG, não um sistema
  multiusuário — restrição documentada explicitamente, não um esquecimento;
  autenticação por API key seria adicionada como middleware Express, sem alterar a
  camada de serviços.

**Docker:** imagem multi-stage (`build` compila TypeScript, `runtime` só instala
dependências de produção). Base `node:20-slim` (Debian/glibc), não Alpine — os
binários nativos do `onnxruntime-node` (usado para embeddings) dependem de glibc e
não funcionam sobre musl. Um volume nomeado persiste o cache do modelo de embeddings
entre reinícios do container.

## Testes

```bash
cd rag-chat-node
npm install
npm test              # suíte completa
npm run test:coverage # com relatório de cobertura
```

**23/23 testes automatizados passando** (6 arquivos), combinando dois níveis:

- **Unitários** (sem I/O, milissegundos): `chunking.service` (6 casos: texto vazio,
  chunk único, overlap, ids únicos, parâmetros inválidos), `cosineSimilarity`
  (5 casos: vetores idênticos/ortogonais/opostos/nulos/dimensões diferentes),
  `vectorStore.service` (4 casos: armazenar, buscar top-K ordenado, remover, limpar).
- **Integração** (Supertest, sobre a app Express real): `POST/GET /documents`
  (3 casos, incluindo `400` para texto vazio), `POST /chat` (3 casos, incluindo
  resposta heurística e pergunta sem documentos ingeridos), `GET /history`
  (2 casos, incluindo ordenação por mais recente). Sem mocks do modelo de
  embeddings — os testes de integração usam o modelo real, validando o pipeline
  de ponta a ponta.

Validado manualmente também dentro da imagem Docker real (não só em `npm run dev`):
build multi-stage, `GET /health`, ingestão de documento, pergunta em modo
heurístico e `GET /docs` respondendo corretamente dentro do container.

Casos de teste detalhados e *definition of done* em
[`docs/04-plano-de-testes.md`](docs/04-plano-de-testes.md).

## Documentação completa

| Documento | Conteúdo |
|---|---|
| [`docs/01-requisitos.md`](docs/01-requisitos.md) | Levantamento de requisitos funcionais/não funcionais e regras de negócio, com prioridades e categorias. |
| [`docs/02-casos-de-uso.md`](docs/02-casos-de-uso.md) | Casos de uso (UC01–UC05) com pré-condições, fluxos alternativos/exceção, pós-condições e diagrama. |
| [`docs/03-arquitetura-design.md`](docs/03-arquitetura-design.md) | Arquitetura em camadas e ADRs completos (contexto, decisão, consequências). |
| [`docs/04-plano-de-testes.md`](docs/04-plano-de-testes.md) | Estratégia de testes, tabela de casos de teste e *definition of done*. |
| [`docs/05-documentacao-api.md`](docs/05-documentacao-api.md) | Exemplos de request/response por endpoint, incluindo códigos de erro. |
| [`docs/documento-engenharia-software.pdf`](docs/documento-engenharia-software.pdf) | Relatório técnico único consolidando os cinco documentos acima, com diagramas (LaTeX/PDF) — útil para leitura offline/impressão; todo o conteúdo já está nas seções acima e nos arquivos individuais. |

## Versionamento

Repositório versionado seguindo **Git Flow** (`main`/`develop`/`feature/*`) com
**Conventional Commits**; release `v1.0.0` taggeada em `main`.
