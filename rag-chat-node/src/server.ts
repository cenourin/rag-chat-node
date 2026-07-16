import path from "node:path";
import cors from "cors";
import express from "express";
import swaggerUi from "swagger-ui-express";
import YAML from "yamljs";
import { config } from "./config";
import { errorHandler } from "./middlewares/error-handler";
import { documentsRouter } from "./routes/documents.route";
import { chatRouter } from "./routes/chat.route";
import { historyRouter } from "./routes/history.route";

const openapiDocument = YAML.load(path.join(process.cwd(), "openapi.yaml"));

export function createApp() {
  const app = express();

  app.use(cors());
  app.use(express.json({ limit: "5mb" }));

  app.get("/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  app.use("/docs", swaggerUi.serve, swaggerUi.setup(openapiDocument));

  app.use("/documents", documentsRouter);
  app.use("/chat", chatRouter);
  app.use("/history", historyRouter);

  app.use(errorHandler);

  return app;
}

if (require.main === module) {
  const app = createApp();
  app.listen(config.port, () => {
    console.log(`rag-chat-node ouvindo na porta ${config.port}`);
  });
}
