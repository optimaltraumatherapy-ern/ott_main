import { Router } from "express";
import { healthRouter } from "./health.js";
import { contactRouter } from "./contact.js";

export const apiRouter = Router();

apiRouter.use(healthRouter);
apiRouter.use(contactRouter);
