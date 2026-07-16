import { z } from "zod";

export const createDocumentSchema = z.object({
  title: z.string().trim().min(1, "title é obrigatório").max(200),
  text: z.string().trim().min(1, "text é obrigatório"),
});

export type CreateDocumentInput = z.infer<typeof createDocumentSchema>;
