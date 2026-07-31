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
import salesRouter from "../modules/sales/sales.routes.js";
import paymentsRouter from "../modules/payments/payments.routes.js";
import deliveryOrdersRouter from "../modules/delivery-orders/delivery-orders.routes.js";
import settingsRouter from "../modules/settings/settings.routes.js";
import dashboardRouter from "../modules/dashboard/dashboard.routes.js";
import financeRouter from "../modules/finance/finance.routes.js";
import quotationsRouter from "../modules/quotations/quotations.routes.js";

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

// Sales — /api/sales
router.use("/sales", salesRouter);

// Delivery Orders — /api/delivery-orders
router.use("/delivery-orders", deliveryOrdersRouter);

// Quotations — /api/quotations
router.use("/quotations", quotationsRouter);

// Payments — /api/payments
router.use("/payments", paymentsRouter);

// Settings — /api/settings
router.use("/settings", settingsRouter);

// Dashboard — /api/dashboard
router.use("/dashboard", dashboardRouter);

// Finance Module — /api/finance
router.use("/finance", financeRouter);

export default router;

