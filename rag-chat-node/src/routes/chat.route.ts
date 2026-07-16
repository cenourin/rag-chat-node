import { Router } from "express";
import { chatQuestionSchema } from "../schemas/chat.schema";
import { askQuestion } from "../services/chat.service";

export const chatRouter = Router();

chatRouter.post("/", async (req, res, next) => {
  try {
    const input = chatQuestionSchema.parse(req.body);
    const result = await askQuestion(input.question);
    res.status(200).json(result);
  } catch (err) {
    next(err);
  }
});
