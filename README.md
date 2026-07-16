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

## Engenharia de software

Documentação completa em [`docs/`](docs), cobrindo todo o ciclo de engenharia de
requisitos do projeto:

1. [`01-requisitos.md`](docs/01-requisitos.md) — levantamento de requisitos
   funcionais, não funcionais e regras de negócio.
2. [`02-casos-de-uso.md`](docs/02-casos-de-uso.md) — casos de uso especificados
   (UC01–UC05), com fluxos principais e alternativos.
3. [`03-arquitetura-design.md`](docs/03-arquitetura-design.md) — arquitetura em
   camadas e decisões de arquitetura (ADRs) com contexto e consequências.
4. [`04-plano-de-testes.md`](docs/04-plano-de-testes.md) — plano de testes, casos de
   teste e *definition of done*.
5. [`05-documentacao-api.md`](docs/05-documentacao-api.md) — documentação da API com
   exemplos de request/response (complementar ao Swagger UI embutido na aplicação).

O relatório técnico completo, consolidando os itens acima, está disponível em PDF:
[`docs/documento-engenharia-software.pdf`](docs/documento-engenharia-software.pdf)
(gerado a partir de [`documento-engenharia-software.tex`](docs/documento-engenharia-software.tex)).

Todo o projeto segue **Repository Pattern** (vector store), **Lazy Singleton**
(carregamento do modelo de embeddings), validação de entrada centralizada (Zod) e
tratamento de erros centralizado — decisões registradas e justificadas nos ADRs
do documento de arquitetura.

## Testes

```bash
cd rag-chat-node
npm install
npm test
```

23/23 testes automatizados passando (unitários + integração), cobrindo os módulos
determinísticos do pipeline RAG (chunking, similaridade de cosseno, vector store) e
os quatro endpoints HTTP da API. Detalhes em
[`docs/04-plano-de-testes.md`](docs/04-plano-de-testes.md).

## Versionamento

Repositório versionado seguindo **Git Flow** (`main`/`develop`/`feature/*`) com
**Conventional Commits**.
