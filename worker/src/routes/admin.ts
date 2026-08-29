import { Hono } from "hono";
import type { AdminService } from "../services/admin";
import { PrivacyService } from "../services/privacy";
import { authRequired, type AppEnv } from "../middleware/auth";
import { forbidden } from "../util/errors";

export function adminRoutes(adminSvc: AdminService, _privacy: PrivacyService) {
  const app = new Hono<AppEnv>();
  app.use("*", authRequired);

  app.get("/stats", async (c) => {
    if (c.get("user").role !== "ADMIN") throw forbidden("دسترسی ادمین لازم است", "ADMIN_ONLY");
    return c.json({ stats: await adminSvc.stats(c.get("user")) });
  });

  app.get("/users", async (c) => {
    if (c.get("user").role !== "ADMIN") throw forbidden("دسترسی ادمین لازم است", "ADMIN_ONLY");
    return c.json({ users: await adminSvc.listUsers(c.get("user")) });
  });

  app.patch("/users/:id/role", async (c) => {
    const user = c.get("user");
    const body = await c.req.json<{ role?: "ADMIN" | "USER" }>().catch(() => ({} as never));
    return c.json(await adminSvc.setRole(user, c.req.param("id"), body.role ?? "USER"));
  });

  return app;
}