const TOKEN_KEY = "shajareh_token";

/** Callback fired on 401 so the auth layer can redirect via React Router. */
let onUnauthorized: (() => void) | null = null;
export function setOnUnauthorized(fn: (() => void) | null) { onUnauthorized = fn; }

export function getToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
export function setToken(t: string) {
  localStorage.setItem(TOKEN_KEY, t);
}
export function clearToken() {
  localStorage.removeItem(TOKEN_KEY);
}

export class ApiError extends Error {
  code?: string;
  status: number;
  constructor(message: string, status: number, code?: string) {
    super(message);
    this.status = status;
    this.code = code;
  }
}

async function request<T>(path: string, options: RequestInit = {}, isForm = false): Promise<T> {
  const token = getToken();
  const headers: Record<string, string> = {};
  if (!isForm) headers["Content-Type"] = "application/json";
  if (token) headers["Authorization"] = `Bearer ${token}`;

  let res: Response;
  try {
    res = await fetch(`/api${path}`, { ...options, headers, credentials: "same-origin" });
  } catch {
    throw new ApiError("اتصال به سرور برقرار نشد. اتصال اینترنت را بررسی کنید.", 0, "NETWORK");
  }

  if (res.status === 401) {
    clearToken();
    // Fire the callback so React Router can navigate — no full page reload
    if (!path.startsWith("/auth/login") && !path.startsWith("/auth/register")) {
      onUnauthorized?.();
    }
  }

  if (!res.ok) {
    let message = "خطایی رخ داد.";
    let code: string | undefined;
    try {
      const data = (await res.json()) as { error?: { message?: string; code?: string } };
      if (data?.error?.message) message = data.error.message;
      code = data?.error?.code;
    } catch {
      /* ignore */
    }
    throw new ApiError(message, res.status, code);
  }

  if (res.status === 204) return undefined as T;
  return (await res.json()) as T;
}

export const api = {
  get: <T>(path: string) => request<T>(path),
  post: <T>(path: string, body: unknown, isForm = false) =>
    request<T>(path, { method: "POST", body: isForm ? (body as BodyInit) : JSON.stringify(body) }, isForm),
  patch: <T>(path: string, body: unknown) =>
    request<T>(path, { method: "PATCH", body: JSON.stringify(body) }),
  del: <T>(path: string) => request<T>(path, { method: "DELETE" }),
};