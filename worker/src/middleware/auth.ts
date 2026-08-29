import { createMiddleware } from "hono/factory";
import type { Env, User } from "../env";
import { AuthService, extractBearer } from "../services/auth";
import { unauthorized } from "../util/errors";

export type AppEnv = { Bindings: Env; Variables: { user: User } };

export const authRequired = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearer(c);
  const user = await new AuthService(c.env).getByToken(token);
  if (!user) throw unauthorized();
  c.set("user", user);
  await next();
});

export const optionalAuth = createMiddleware<AppEnv>(async (c, next) => {
  const token = extractBearer(c);
  const user = await new AuthService(c.env).getByToken(token);
  if (user) c.set("user", user);
  await next();
});