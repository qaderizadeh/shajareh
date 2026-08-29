import { Hono } from "hono";
import { cors } from "hono/cors";
import type { Env } from "./env";
import type { User } from "./env";
import { HTTPException } from "hono/http-exception";
import { authRequired, type AppEnv } from "./middleware/auth";

import { AuthService } from "./services/auth";
import { FamilyService } from "./services/family";
import { PersonService } from "./services/person";
import { RelationshipService } from "./services/relationship";
import { PrivacyService } from "./services/privacy";
import { SearchService } from "./services/search";
import { MediaService } from "./services/media";
import { AiService } from "./services/ai";
import { AdminService } from "./services/admin";

import { authRoutes } from "./routes/auth";
import { familyRoutes } from "./routes/families";
import { personRoutes } from "./routes/persons";
import { relationshipRoutes } from "./routes/relationships";
import { searchRoutes } from "./routes/search";
import { mediaRoutes } from "./routes/media";
import { aiRoutes } from "./routes/ai";
import { adminRoutes } from "./routes/admin";

export function buildApp(env: Env): Hono<AppEnv> {
  const app = new Hono<AppEnv>();

  app.use(
    "/api/*",
    cors({
      origin: (o) => o ?? "*",
      allowMethods: ["GET", "POST", "PATCH", "DELETE", "OPTIONS"],
      allowHeaders: ["Content-Type", "Authorization"],
    })
  );

  // ===== services (حالت Stateless با گذر env) =====
  const auth = new AuthService(env);
  const family = new FamilyService(env);
  const person = new PersonService(env);
  const relationship = new RelationshipService(env);
  const privacy = new PrivacyService(env);
  const search = new SearchService(env);
  const media = new MediaService(env);
  const ai = new AiService(env);
  const admin = new AdminService(env);

  app.get("/api/health", (c) => c.json({ ok: true, name: "شجره", env: env.ENVIRONMENT }));

  app.route("/api/auth", authRoutes(auth));
  app.route("/api/families", familyRoutes(family, privacy, relationship));
  app.route("/api/persons", personRoutes(person, privacy));
  app.route("/api/relationships", relationshipRoutes(relationship, privacy));
  app.route("/api/search", searchRoutes(search));
  app.route("/api/media", mediaRoutes(media, privacy));
  app.route("/api/ai", aiRoutes(ai, privacy));
  app.route("/api/admin", adminRoutes(admin, privacy));

  // مسیرهای غیر-API را به اسپا (در صورت در دسترس بودن assets) بسپار
  app.notFound(async (c) => {
    const url = new URL(c.req.url);
    if (!url.pathname.startsWith("/api") && c.req.method === "GET" && env.ASSETS) {
      return env.ASSETS.fetch(c.req.raw);
    }
    return c.json({ error: { message: "آدرس پیدا نشد", code: "NOT_FOUND" } }, 404);
  });

  app.onError((err: unknown, c) => {
    if (err instanceof HTTPException) {
      const message = (err as HTTPException & { code?: string }).code
        ? (err as { message: string }).message
        : err.message || "خطایی رخ داد";
      return c.json({ error: { message, code: (err as HTTPException & { code?: string }).code ?? "HTTP_ERROR" } }, err.status);
    }
    if (err instanceof Error) {
      return c.json({ error: { message: err.message || "خطای داخلی سرور", code: "INTERNAL" } }, 500);
    }
    return c.json({ error: { message: "خطای داخلی سرور", code: "INTERNAL" } }, 500);
  });

  return app;
}

export type { User };
export { authRequired };