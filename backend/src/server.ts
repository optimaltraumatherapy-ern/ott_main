import express from "express";
import cors from "cors";
import helmet from "helmet";
import morgan from "morgan";
import { env } from "./env.js";
import { healthRouter } from "./routes/health.js";
import { contactRouter } from "./routes/contact.js";

export function createApp() {
  const app = express();
  app.disable("x-powered-by");

  app.use(helmet());
  app.use(express.json({ limit: "2mb" }));
  app.use(express.urlencoded({ extended: false }));

  app.use(morgan(env.NODE_ENV === "production" ? "combined" : "dev"));

  // In dev, allow all origins to reduce friction.
  // In production, you should set APP_ORIGIN and lock this down.
  app.use(
    cors({
      origin: env.NODE_ENV === "production" ? env.APP_ORIGIN : true,
      credentials: true
    })
  );

  app.get("/", (_req, res) => res.json({ ok: true, service: "ott-backend" }));

  app.use("/api/health", healthRouter);
  app.use("/api/contact", contactRouter);

  return app;
}
