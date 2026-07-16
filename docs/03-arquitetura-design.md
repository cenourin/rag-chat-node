# 3. Arquitetura e Design

## 3.1 Visão Geral

```
                         ┌─────────────────────────────────────────────┐
                         │                 Express App                  │
                         │                                               │
  HTTP  ───────────────▶ │  routes/            (controllers HTTP)       │
                         │   documents.route.ts  chat.route.ts           │
                         │   history.route.ts                            │
                         │        │                                      │
                         │        ▼                                      │
                         │  schemas/          (validação Zod)            │
                         │        │                                      │
                         │        ▼                                      │
                         │  services/          (regras de negócio)       │
                         │   document.service.ts   chat.service.ts       │
                         │   history.service.ts    chunking.service.ts   │
                         │   embedding.service.ts  claude.service.ts     │
                         │   vectorStore.service.ts                      │
                         │        │                    │                 │
                         │        ▼                    ▼                 │
                         │  utils/               middlewares/            │
                         │   cosineSimilarity.ts   error-handler.ts      │
                         └─────────────────────────────────────────────┘
                                    │                        │
                                    ▼                        ▼
                     ┌───────────────────────┐   ┌───────────────────────┐
                     │  Xenova/transformers    │   │   Claude API           │
                     │  (embeddings locais,     │   │   (Anthropic, opcional │
                     │  em processo)             │   │   via ANTHROPIC_API_KEY)│
                     └───────────────────────┘   └───────────────────────┘
```

A aplicação segue uma **arquitetura em camadas** (layered architecture) clássica de
APIs Express: `routes` (HTTP) → `schemas` (validação de entrada) → `services` (regras
de negócio) → `utils`/integrações externas. Cada camada só conhece a camada
imediatamente abaixo, o que mantém as rotas finas (thin controllers) e as regras de
negócio testáveis isoladamente do framework HTTP — os testes de `chunking.service`,
`cosineSimilarity` e `vectorStore.service` (ver
[`04-plano-de-testes.md`](04-plano-de-testes.md)) não sobem um servidor HTTP.

## 3.2 Decisões de Arquitetura (ADRs)

### ADR-01: Vector store em memória com busca por força bruta (Repository Pattern)

**Contexto.** O escopo do projeto é uma demonstração de portfólio, não um sistema em
produção com milhões de documentos. Um banco vetorial dedicado (Pinecone, Qdrant,
pgvector) adicionaria uma dependência de infraestrutura externa sem necessidade real
neste volume de dados, além de esconder o funcionamento do algoritmo por trás de uma
API de terceiros.

**Decisão.** `InMemoryVectorStore` ([`vectorStore.service.ts`](../rag-chat-node/src/services/vectorStore.service.ts))
guarda os chunks embedded em um array e calcula similaridade de cosseno contra a
consulta em O(n) por busca. A classe expõe uma interface pequena (`add`, `search`,
`removeByDocumentId`, `count`, `clear`) — um **Repository Pattern**: o resto da
aplicação depende apenas dessa interface, não da estrutura de armazenamento por trás
dela.

**Consequências.** Simplicidade total (zero dependências externas, zero configuração
de infraestrutura) e o algoritmo de busca fica auditável em ~20 linhas de código. Em
contrapartida, os dados não sobrevivem a um restart do processo e a busca deixa de ser
O(n) viável a partir de dezenas de milhares de chunks — trocar para um banco vetorial
no futuro significa reimplementar apenas esta classe, sem tocar em rotas ou serviços
que a consomem.

### ADR-02: Motor duplo (Claude + heurístico) para geração de resposta

**Contexto.** Uma chave de API paga não deve ser um requisito para demonstrar/testar o
projeto (RNF04), mas o objetivo central do projeto é justamente integrar com o Claude.

**Decisão.** `claude.service.ts` verifica `isClaudeConfigured()` (presença de
`ANTHROPIC_API_KEY`). Com a chave presente, monta o prompt com o contexto recuperado e
chama `anthropic.messages.create(...)`. Sem a chave, `fallbackAnswer(...)` gera uma
resposta determinística a partir do chunk mais similar, com um prefixo explícito
(`[Resposta heurística ...]`) indicando o modo. **Ambos os caminhos retornam o mesmo
contrato de saída** (RN03) — o consumidor da API (e os testes de integração) não
precisam tratar dois formatos diferentes de resposta.

**Consequências.** O projeto fica 100% demonstrável e testável sem custo (inclusive em
CI, sem segredos), e passa a usar IA real assim que uma chave é adicionada ao `.env`,
sem qualquer alteração de código. O custo é que a "qualidade" da resposta no modo
heurístico é claramente inferior — o que é aceitável e sinalizado explicitamente ao
usuário, e não o comportamento padrão em um ambiente com a chave configurada.

### ADR-03: Embeddings locais via `@xenova/transformers` (Lazy Singleton)

**Contexto.** Gerar embeddings via API paga (ex.: OpenAI `text-embedding-3-small`)
adicionaria uma segunda dependência de API externa e custo, para uma etapa do pipeline
(vetorização) que roda perfeitamente bem localmente em um modelo pequeno.

**Decisão.** `embedding.service.ts` usa `Xenova/all-MiniLM-L6-v2` (384 dimensões)
rodando dentro do próprio processo Node.js via ONNX runtime. O carregamento do modelo
(download na primeira execução + inicialização do runtime) é custoso o suficiente para
justificar um **singleton preguiçoso**: a `Promise` do pipeline é armazenada em módulo
(não o valor resolvido), de forma que chamadas concorrentes durante o carregamento
aguardem a mesma instância em vez de disparar múltiplas inicializações.

**Consequências.** Zero custo de API para embeddings e zero segredo adicional exigido.
Em contrapartida, o processo consome mais memória (modelo carregado em RAM) e a
primeira requisição após o boot é mais lenta (download/inicialização do modelo) —
mitigado em Docker por um volume nomeado que persiste o cache do modelo entre
restarts do container (ver [`docker-compose.yml`](../rag-chat-node/docker-compose.yml)).

### ADR-04: Validação de entrada centralizada com Zod + middleware de erro único

**Contexto.** Validar manualmente cada campo em cada rota (`if (!body.title) ...`)
espalha regras de validação pelo código e produz mensagens de erro inconsistentes
entre endpoints.

**Decisão.** Cada rota que recebe corpo (`documents`, `chat`) declara um schema Zod
(`schemas/documents.schema.ts`, `schemas/chat.schema.ts`) e chama `.parse(req.body)`.
Erros de validação (`ZodError`) e erros de negócio (`HttpError`) são capturados por um
único middleware (`middlewares/error-handler.ts`), que decide o status HTTP e o
formato da resposta de erro (RNF01, RNF02).

**Consequências.** Contrato de validação e contrato de erro consistentes em toda a
API, sem duplicação de `try/catch` em cada rota — as rotas só chamam `next(err)` e o
middleware central decide o resto.

### ADR-05: Sem autenticação/autorização no MVP

**Contexto.** O escopo do projeto (ver [`01-requisitos.md`](01-requisitos.md#16-restrições-técnicas))
é demonstrar o pipeline RAG e a integração com o Claude, não um sistema multiusuário.

**Decisão.** Todos os endpoints são públicos nesta versão. Essa restrição é
documentada explicitamente (não é um esquecimento) para não gerar falsa expectativa de
segurança em um ambiente exposto publicamente.

**Consequências.** Simplifica o MVP e os testes de integração (não é preciso simular
login). Como trabalho futuro natural, autenticação por API key ou JWT seria adicionada
como um middleware Express aplicado antes das rotas, sem exigir mudança nas camadas de
serviço.
