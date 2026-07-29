import express, { type Express } from "express";
import cors from "cors";
import pinoHttp from "pino-http";
import router from "./routes/index.js";
import { logger } from "./lib/logger.js";
import { errorHandler } from "./middlewares/errorHandler.js";

const app: Express = express();

// ── HTTP request logging ──────────────────────────────────────────────────────
app.use(
  pinoHttp({
    logger,
    serializers: {
      req(req) {
        return {
          id: req.id,
          method: req.method,
          url: req.url?.split("?")[0],
        };
      },
      res(res) {
        return { statusCode: res.statusCode };
      },
    },
  }),
);

// ── CORS ─────────────────────────────────────────────────────────────────────
// In production, set CORS_ORIGIN to the exact frontend domain.
app.use(
  cors({
    origin: process.env["CORS_ORIGIN"] ?? true,
    credentials: true,
  }),
);

// ── Body parsing ─────────────────────────────────────────────────────────────
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// ── Static file serving for uploads (company logos, etc.) ────────────────────
import path from "path";
import { fileURLToPath } from "url";
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
app.use("/uploads", express.static(path.resolve(__dirname, "../uploads")));

// ── Routes ────────────────────────────────────────────────────────────────────
app.use("/api", router);

// ── Centralized error handler (must be registered last) ──────────────────────
app.use(errorHandler);

export default app;
