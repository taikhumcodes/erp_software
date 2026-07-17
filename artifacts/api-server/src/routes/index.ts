import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "../modules/auth/auth.routes.js";
import categoriesRouter from "../modules/categories/categories.routes.js";
import brandsRouter from "../modules/brands/brands.routes.js";
import unitsRouter from "../modules/units/units.routes.js";
import productsRouter from "../modules/products/products.routes.js";

const router: IRouter = Router();

// Health check — GET /api/healthz
router.use(healthRouter);

// Authentication — /api/auth/*
router.use("/auth", authRouter);

// Product Management — /api/categories|brands|units|products
router.use("/categories", categoriesRouter);
router.use("/brands", brandsRouter);
router.use("/units", unitsRouter);
router.use("/products", productsRouter);

export default router;
