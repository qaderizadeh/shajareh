import { createContext, useContext, useEffect, useState, type ReactNode } from "react";
import { api, clearToken, getToken, setToken } from "./lib/api";
import type { User } from "./lib/types";

interface AuthCtx {
  user: User | null;
  ready: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (name: string, email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  refresh: () => Promise<void>;
}

const Ctx = createContext<AuthCtx>(null as unknown as AuthCtx);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);

  async function refresh() {
    if (!getToken()) {
      setUser(null);
      setReady(true);
      return;
    }
    try {
      const { user } = await api.get<{ user: User }>("/auth/me");
      setUser(user);
    } catch {
      setUser(null);
    } finally {
      setReady(true);
    }
  }

  useEffect(() => {
    refresh();
  }, []);

  async function login(email: string, password: string) {
    const { user, token } = await api.post<{ user: User; token: string }>("/auth/login", { email, password });
    setToken(token);
    setUser(user);
  }
  async function register(name: string, email: string, password: string) {
    const { user, token } = await api.post<{ user: User; token: string }>("/auth/register", { name, email, password });
    setToken(token);
    setUser(user);
  }
  async function logout() {
    try {
      await api.post<{ ok: boolean }>("/auth/logout", {});
    } catch {
      /* ignore */
    }
    clearToken();
    setUser(null);
  }

  return (
    <Ctx.Provider value={{ user, ready, login, register, logout, refresh }}>{children}</Ctx.Provider>
  );
}

export function useAuth() {
  return useContext(Ctx);
}