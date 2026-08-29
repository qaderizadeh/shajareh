import { Hono } from "hono";
import { AuthService, extractBearer } from "../services/auth";
import { badRequest } from "../util/errors";
import { authRequired, optionalAuth, type AppEnv } from "../middleware/auth";

export function authRoutes(service: AuthService) {
  const app = new Hono<AppEnv>();

  app.post("/register", optionalAuth, async (c) => {
    const body = await c.req.json<{ name?: string; email?: string; password?: string }>().catch(() => ({} as never));
    const { user } = await service.register(body.name ?? "", body.email ?? "", body.password ?? "");
    // ورود خودکار پس از ثبت‌نام
    const { token } = await service.login(body.email ?? "", body.password ?? "");
    return c.json({ user, token }, 201);
  });

  app.post("/login", async (c) => {
    const body = await c.req.json<{ email?: string; password?: string }>().catch(() => ({} as never));
    const session = await service.login(body.email ?? "", body.password ?? "");
    return c.json(session);
  });

  app.post("/logout", authRequired, async (c) => {
    await service.logout(extractBearer(c));
    return c.json({ ok: true });
  });

  app.get("/me", authRequired, async (c) => {
    return c.json({ user: c.get("user") });
  });

  app.patch("/me", authRequired, async (c) => {
    const user = c.get("user");
    const body = (await c.req.json().catch(() => ({}))) as { name?: string };
    const name = body.name?.trim();
    if (!name) throw badRequest("نام نمی‌تواند خالی باشد", "INVALID_NAME");
    await c.env.DB.prepare("UPDATE users SET name = ?, updated_at = datetime('now') WHERE id = ?").bind(name, user.id).run();
    const me = await service.getById(user.id);
    return c.json({ user: me });
  });

  return app;
}