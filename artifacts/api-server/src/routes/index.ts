import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "../modules/auth/auth.routes.js";

const router: IRouter = Router();

// Health check — GET /api/healthz
router.use(healthRouter);

// Authentication — /api/auth/*
router.use("/auth", authRouter);

export default router;
