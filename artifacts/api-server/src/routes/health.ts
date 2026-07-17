import { Router, type IRouter } from "express";
import { GetHealthStatusResponse } from "@workspace/api-zod";

const router: IRouter = Router();

router.get("/healthz", (_req, res) => {
  const data = GetHealthStatusResponse.parse({
    status: "ok",
    timestamp: new Date().toISOString(),
  });
  res.json(data);
});

export default router;
