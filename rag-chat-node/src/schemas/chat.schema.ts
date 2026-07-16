import { z } from "zod";

export const chatQuestionSchema = z.object({
  question: z.string().trim().min(1, "question é obrigatório").max(2000),
});

export type ChatQuestionInput = z.infer<typeof chatQuestionSchema>;
