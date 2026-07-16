# 1. Levantamento de Requisitos

## 1.1 Contexto e Objetivo

O **rag-chat-node** é uma API REST que permite ingerir documentos textuais (manuais,
políticas internas, FAQs) e responder perguntas em linguagem natural sobre o conteúdo
desses documentos, usando um pipeline de **RAG** (Retrieval-Augmented Generation):
ingestão → chunking → embeddings → recuperação por similaridade → geração de resposta
com um modelo de linguagem (Claude, da Anthropic).

O documento serve como referência de engenharia de requisitos do projeto — insumo para
o desenho de casos de uso ([`02-casos-de-uso.md`](02-casos-de-uso.md)), decisões de
arquitetura ([`03-arquitetura-design.md`](03-arquitetura-design.md)) e plano de testes
([`04-plano-de-testes.md`](04-plano-de-testes.md)).

## 1.2 Atores

| Ator | Descrição |
|---|---|
| **Usuário da API** | Sistema cliente (front-end, script, Postman/Insomnia) que consome a API REST via HTTP. Não há autenticação/autorização diferenciando perfis de usuário nesta versão — todo consumidor da API tem as mesmas permissões. |
| **Claude (Anthropic API)** | Ator externo (sistema) responsável por gerar a resposta em linguagem natural a partir da pergunta e do contexto recuperado. |
| **Modelo de embeddings local** | Ator externo (sistema), executado dentro do próprio processo Node.js via `@xenova/transformers`, responsável por converter texto em vetores numéricos. |

## 1.3 Requisitos Funcionais

| ID | Descrição | Prioridade |
|---|---|---|
| RF01 | O sistema deve permitir a ingestão de um documento textual (`title` + `text`) via `POST /documents`. | Alta |
| RF02 | O sistema deve dividir o texto do documento em *chunks* de tamanho configurável, com sobreposição (*overlap*) entre chunks consecutivos, para preservar contexto na fronteira entre pedaços. | Alta |
| RF03 | O sistema deve gerar um embedding vetorial para cada chunk, usando um modelo local (sem custo de API externa). | Alta |
| RF04 | O sistema deve armazenar os chunks embedded de forma que possam ser buscados por similaridade posteriormente. | Alta |
| RF05 | O sistema deve permitir listar os documentos já ingeridos via `GET /documents`, com metadados (`id`, `title`, `createdAt`, `chunkCount`). | Média |
| RF06 | O sistema deve permitir enviar uma pergunta em linguagem natural via `POST /chat`. | Alta |
| RF07 | Ao receber uma pergunta, o sistema deve gerar o embedding da pergunta e recuperar os *N* chunks mais similares (busca por similaridade de cosseno), onde *N* é configurável (`RETRIEVAL_TOP_K`). | Alta |
| RF08 | O sistema deve montar um prompt com os chunks recuperados como contexto e enviá-lo ao Claude para gerar a resposta final. | Alta |
| RF09 | Caso a chave de API do Claude (`ANTHROPIC_API_KEY`) não esteja configurada, o sistema deve gerar uma resposta heurística determinística (baseada no chunk mais similar) em vez de falhar, mantendo o mesmo formato de saída. | Alta |
| RF10 | O sistema deve registrar cada par pergunta/resposta em um histórico, junto com os ids dos chunks recuperados. | Média |
| RF11 | O sistema deve permitir consultar o histórico de perguntas e respostas via `GET /history`, mais recentes primeiro. | Média |
| RF12 | O histórico deve ser limitado a um número máximo de itens configurável (`HISTORY_MAX_ITEMS`), descartando os mais antigos quando o limite é excedido. | Baixa |
| RF13 | O sistema deve expor um endpoint de verificação de disponibilidade (`GET /health`). | Média |
| RF14 | O sistema deve expor sua própria documentação interativa (Swagger UI) em `GET /docs`, gerada a partir de uma especificação OpenAPI. | Média |

## 1.4 Requisitos Não Funcionais

| ID | Descrição | Categoria |
|---|---|---|
| RNF01 | A API deve validar o corpo das requisições e responder `400 Bad Request` com detalhes do erro quando os dados forem inválidos (ex.: `title`/`text`/`question` vazios). | Confiabilidade |
| RNF02 | Erros inesperados (ex.: falha na chamada ao Claude) devem ser capturados por um middleware central e retornados como `500 Internal Server Error`, sem derrubar o processo. | Confiabilidade |
| RNF03 | O projeto deve ser executável localmente com um único comando (`docker compose up --build`), sem exigir instalação manual de dependências no host. | Portabilidade |
| RNF04 | O pipeline de embeddings deve funcionar sem exigir chave de API paga (modelo local via `@xenova/transformers`). | Custo |
| RNF05 | A API deve ser implementada em TypeScript com checagem estática de tipos (`strict: true`), reduzindo classes inteiras de erro em tempo de compilação. | Manutenibilidade |
| RNF06 | O código deve ter cobertura de testes automatizados nos módulos determinísticos (chunking, similaridade de cosseno, vector store) e testes de integração dos endpoints HTTP. | Testabilidade |
| RNF07 | A API deve documentar seus endpoints via OpenAPI 3.0, acessível tanto como arquivo (`openapi.yaml`) quanto interativamente (Swagger UI). | Usabilidade (para desenvolvedores) |
| RNF08 | O tamanho do corpo aceito em requisições deve ser limitado (5 MB) para mitigar abuso por payloads excessivos. | Segurança |

## 1.5 Regras de Negócio

| ID | Descrição |
|---|---|
| RN01 | Um documento vazio (texto em branco após normalização) não pode ser ingerido — a ingestão deve falhar de forma explícita. |
| RN02 | O tamanho de overlap entre chunks deve ser sempre menor que o tamanho do chunk (`chunkOverlap < chunkSize`), caso contrário a operação de chunking é inválida. |
| RN03 | A resposta do endpoint `/chat` deve sempre ter o mesmo formato (`question`, `answer`, `retrievedChunkIds`, `createdAt`), independentemente de o Claude estar configurado ou não — o consumidor da API não deve precisar tratar dois contratos diferentes. |
| RN04 | Perguntas sem nenhum documento ingerido ainda devem ser respondidas (com lista de contexto vazia), não devem retornar erro. |

## 1.6 Restrições Técnicas

- Node.js 20 (LTS) + TypeScript.
- Sem banco de dados externo nesta versão — armazenamento em memória, reiniciado a cada
  restart do processo (decisão registrada em [`03-arquitetura-design.md`](03-arquitetura-design.md)).
- Sem autenticação/autorização nesta versão (fora do escopo do MVP; ver seção de
  trabalhos futuros no `README.md` do projeto).
- Modelo de embeddings fixo (`Xenova/all-MiniLM-L6-v2`, 384 dimensões).
