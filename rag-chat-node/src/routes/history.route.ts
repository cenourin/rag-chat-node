import { Router } from "express";
import { listHistory } from "../services/history.service";

export const historyRouter = Router();

historyRouter.get("/", (_req, res) => {
  res.json(listHistory());
});
