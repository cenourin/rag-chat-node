# 2. Casos de Uso

## 2.1 Diagrama de Casos de Uso (visão textual)

```
                        ┌───────────────────────────────┐
                        │          rag-chat-node          │
                        │                                 │
    ┌──────────────┐    │   (UC01) Ingerir Documento      │
    │              │────┼──▶                              │
    │              │    │                                 │
    │              │    │   (UC02) Listar Documentos       │
    │              │────┼──▶                              │
    │  Usuário da  │    │                                 │
    │     API      │    │   (UC03) Fazer Pergunta (Chat)   │───┐
    │              │────┼──▶                              │   │
    │              │    │                                 │   │  usa
    │              │    │   (UC04) Consultar Histórico     │   ▼
    │              │────┼──▶                        ┌──────────────┐
    │              │    │                            │  Claude API  │
    │              │    │   (UC05) Verificar Saúde   │ (Anthropic)  │
    │              │────┼──▶  da API                 └──────────────┘
    └──────────────┘    │                                 │
                        │   UC01/UC03 usam →   ┌──────────────────────┐
                        │                       │ Modelo de Embeddings  │
                        │                       │  Local (Xenova)       │
                        │                       └──────────────────────┘
                        └───────────────────────────────┘
```

`UC01` e `UC03` têm uma relação `<<include>>` implícita com a geração de embeddings
(modelo local); `UC03` tem uma relação `<<include>>` com a chamada ao Claude — ou,
na ausência de chave de API, com o gerador de resposta heurística (ver
[ADR-02](03-arquitetura-design.md#adr-02-motor-duplo-claude--heurístico-para-geração-de-resposta)).

## 2.2 UC01 — Ingerir Documento

| Campo | Descrição |
|---|---|
| **Ator principal** | Usuário da API |
| **Atores secundários** | Modelo de Embeddings Local |
| **Objetivo** | Adicionar um novo documento-fonte à base de conhecimento consultável pelo chat. |
| **Pré-condições** | Nenhuma (endpoint público, sem autenticação nesta versão). |
| **Pós-condições (sucesso)** | Documento persistido no registro de documentos; seus chunks e embeddings persistidos no vector store; API retorna os metadados do documento criado. |

**Fluxo principal**
1. O usuário envia `POST /documents` com `title` e `text`.
2. O sistema valida o corpo da requisição (RNF01).
3. O sistema divide o `text` em chunks com overlap (RF02).
4. Para cada chunk, o sistema solicita ao modelo de embeddings local o vetor correspondente (RF03).
5. O sistema armazena os chunks embedded no vector store (RF04).
6. O sistema registra os metadados do documento (id, título, data de criação, quantidade de chunks).
7. O sistema retorna `201 Created` com os metadados do documento.

**Fluxos alternativos / exceção**
- **A1 — Corpo inválido**: se `title` ou `text` estiverem ausentes ou vazios, o sistema
  retorna `400 Bad Request` com o detalhamento do campo inválido (passo 2). Caso especial: 
  texto que se torna vazio após normalização (só espaços) é tratado como RN01 e também
  resulta em erro.
- **A2 — Falha no modelo de embeddings**: se a geração de embeddings falhar (ex.: erro
  interno do runtime ONNX), o sistema retorna `500 Internal Server Error` e nenhum dado
  parcial é persistido (a etapa 5 só ocorre após todos os embeddings serem gerados com
  sucesso).

## 2.3 UC02 — Listar Documentos

| Campo | Descrição |
|---|---|
| **Ator principal** | Usuário da API |
| **Objetivo** | Consultar quais documentos já foram ingeridos, para conferência antes de perguntar. |
| **Pré-condições** | Nenhuma. |
| **Pós-condições** | Nenhuma alteração de estado (operação de leitura). |

**Fluxo principal**
1. O usuário envia `GET /documents`.
2. O sistema retorna a lista de documentos ordenada por data de criação, cada um com
   `id`, `title`, `createdAt` e `chunkCount`.

**Fluxos alternativos**
- **A1 — Nenhum documento ingerido**: o sistema retorna `200 OK` com uma lista vazia
  `[]` (não é um erro).

## 2.4 UC03 — Fazer Pergunta (Chat RAG)

| Campo | Descrição |
|---|---|
| **Ator principal** | Usuário da API |
| **Atores secundários** | Modelo de Embeddings Local, Claude API (ou gerador heurístico, na ausência de chave) |
| **Objetivo** | Obter uma resposta em linguagem natural para uma pergunta, fundamentada nos documentos ingeridos. |
| **Pré-condições** | Nenhuma — o caso de uso funciona mesmo sem documentos ingeridos (RN04), embora a qualidade da resposta dependa de haver contexto relevante. |
| **Pós-condições (sucesso)** | Um novo item é adicionado ao histórico (UC04); a resposta é retornada ao usuário. |

**Fluxo principal**
1. O usuário envia `POST /chat` com `question`.
2. O sistema valida o corpo da requisição (RNF01).
3. O sistema gera o embedding da pergunta (RF07).
4. O sistema busca no vector store os `RETRIEVAL_TOP_K` chunks mais similares por
   cosseno (RF07).
5. O sistema monta um prompt combinando a pergunta e os chunks recuperados como
   contexto (RF08).
6. **[Claude configurado]** O sistema envia o prompt à API do Claude e recebe a
   resposta gerada.
   **[Claude não configurado]** O sistema gera uma resposta heurística a partir do
   chunk mais similar (RF09, fluxo alternativo A2 abaixo).
7. O sistema registra a pergunta, a resposta e os ids dos chunks recuperados no
   histórico (RF10 → aciona UC04 internamente).
8. O sistema retorna `200 OK` com o item de histórico criado (`id`, `question`,
   `answer`, `retrievedChunkIds`, `createdAt`).

**Fluxos alternativos / exceção**
- **A1 — Corpo inválido**: `question` ausente ou vazia → `400 Bad Request` (passo 2).
- **A2 — Claude não configurado (motor heurístico)**: quando `ANTHROPIC_API_KEY` não
  está definida, o passo 6 é substituído por uma resposta determinística construída a
  partir do trecho mais relevante recuperado, com o mesmo contrato de saída (RN03,
  ver [ADR-02](03-arquitetura-design.md#adr-02-motor-duplo-claude--heurístico-para-geração-de-resposta)).
- **A3 — Nenhum documento ingerido ainda**: a busca no passo 4 retorna lista vazia; o
  fluxo continua normalmente (RN04) e a resposta final indica que não há contexto
  disponível.
- **A4 — Falha na chamada ao Claude**: erro de rede/API → `500 Internal Server Error`,
  nenhum item é adicionado ao histórico.

## 2.5 UC04 — Consultar Histórico

| Campo | Descrição |
|---|---|
| **Ator principal** | Usuário da API |
| **Objetivo** | Auditar/revisar interações anteriores de pergunta e resposta. |
| **Pré-condições** | Nenhuma. |
| **Pós-condições** | Nenhuma alteração de estado (operação de leitura). |

**Fluxo principal**
1. O usuário envia `GET /history`.
2. O sistema retorna a lista de itens de histórico, mais recentes primeiro, limitada a
   `HISTORY_MAX_ITEMS` (RF12).

**Fluxos alternativos**
- **A1 — Nenhuma pergunta feita ainda**: retorna `200 OK` com lista vazia `[]`.

## 2.6 UC05 — Verificar Disponibilidade da API

| Campo | Descrição |
|---|---|
| **Ator principal** | Usuário da API (tipicamente uma ferramenta de orquestração/monitoramento) |
| **Objetivo** | Confirmar que o processo está no ar antes de rotear tráfego para ele (ex.: healthcheck do Docker/orquestrador). |
| **Fluxo principal** | `GET /health` → `200 OK` com `{ "status": "ok" }`. Não há fluxos alternativos: o endpoint não depende de nenhum recurso externo. |
