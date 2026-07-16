# node:20-slim (Debian/glibc) em vez de alpine: o onnxruntime-node usado pelo
# @xenova/transformers para embeddings distribui binários pré-compilados que
# dependem de glibc e não funcionam sobre musl (base do Alpine).

# Build stage: instala todas as dependências (incl. devDependencies) e compila TypeScript
FROM node:20-slim AS build

WORKDIR /app

COPY package*.json ./
RUN npm ci

COPY tsconfig.json ./
COPY src ./src
RUN npm run build

# Runtime stage: apenas dependências de produção + artefatos compilados
FROM node:20-slim AS runtime

WORKDIR /app
ENV NODE_ENV=production

COPY package*.json ./
RUN npm ci --omit=dev

COPY --from=build /app/dist ./dist
COPY openapi.yaml ./openapi.yaml

EXPOSE 3000

CMD ["node", "dist/server.js"]
