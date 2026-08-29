import { buildApp } from "./app";
import type { Env } from "./env";

let cachedApp: ReturnType<typeof buildApp> | undefined;

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    if (!cachedApp) cachedApp = buildApp(env);
    return cachedApp.fetch(request, env, ctx);
  },
};