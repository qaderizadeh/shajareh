import { Hono } from "hono";
import type { SearchService } from "../services/search";
import { authRequired, type AppEnv } from "../middleware/auth";

export function searchRoutes(searchSvc: SearchService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.get("/", async (c) => {
    const q = c.req.query("q") ?? "";
    const familyId = c.req.query("familyId") ?? undefined;
    const limit = Number(c.req.query("limit") ?? 20);
    const offset = Number(c.req.query("offset") ?? 0);
    return c.json({ results: await searchSvc.persons({ q, familyId, limit, offset }) });
  });

  return app;
}