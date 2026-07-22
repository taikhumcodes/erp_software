import { Router, type IRouter } from "express";
import healthRouter from "./health.js";
import authRouter from "../modules/auth/auth.routes.js";
import categoriesRouter from "../modules/categories/categories.routes.js";
import brandsRouter from "../modules/brands/brands.routes.js";
import unitsRouter from "../modules/units/units.routes.js";
import productsRouter from "../modules/products/products.routes.js";
import customersRouter from "../modules/customers/customers.routes.js";
import suppliersRouter from "../modules/suppliers/suppliers.routes.js";
import usersRouter from "../modules/users/users.routes.js";
import purchasesRouter from "../modules/purchases/purchases.routes.js";

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

// Contacts — /api/customers|suppliers
router.use("/customers", customersRouter);
router.use("/suppliers", suppliersRouter);

// User Management — /api/users
router.use("/users", usersRouter);

// Purchases — /api/purchases
router.use("/purchases", purchasesRouter);

export default router;
