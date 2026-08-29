import { createContext, useCallback, useContext, useEffect, useRef, useState, type ReactNode } from "react";
import { useNavigate } from "react-router-dom";
import { api, clearToken, getToken, setToken, setOnUnauthorized } from "./lib/api";
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

/** Inner provider that has access to useNavigate */
function AuthProviderInner({ children }: { children: ReactNode }) {
  const navigate = useNavigate();
  const [user, setUser] = useState<User | null>(null);
  const [ready, setReady] = useState(false);
  const mountedRef = useRef(true);

  // Global401 handler: navigate to /auth via React Router (no full page reload)
  useEffect(() => {
    setOnUnauthorized(() => {
      setUser(null);
      navigate("/auth", { replace: true });
    });
    return () => setOnUnauthorized(null);
  }, [navigate]);

  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);

  const refresh = useCallback(async () => {
    if (!getToken()) {
      if (mountedRef.current) setUser(null);
      if (mountedRef.current) setReady(true);
      return;
    }
    try {
      const { user } = await api.get<{ user: User }>("/auth/me");
      if (mountedRef.current) setUser(user);
    } catch {
      if (mountedRef.current) setUser(null);
    } finally {
      if (mountedRef.current) setReady(true);
    }
  }, []);

  useEffect(() => {
    refresh();
  }, [refresh]);

  const login = useCallback(async (email: string, password: string) => {
    const { user, token } = await api.post<{ user: User; token: string }>("/auth/login", { email, password });
    setToken(token);
    setUser(user);
  }, []);

  const register = useCallback(async (name: string, email: string, password: string) => {
    const { user, token } = await api.post<{ user: User; token: string }>("/auth/register", { name, email, password });
    setToken(token);
    setUser(user);
  }, []);

  const logout = useCallback(async () => {
    try {
      await api.post<{ ok: boolean }>("/auth/logout", {});
    } catch {
      /* ignore */
    }
    clearToken();
    setUser(null);
  }, []);

  return (
    <Ctx.Provider value={{ user, ready, login, register, logout, refresh }}>{children}</Ctx.Provider>
  );
}

/** Outer provider wraps InnerProvider in BrowserRouter so useNavigate works */
export function AuthProvider({ children }: { children: ReactNode }) {
  return (
    <AuthProviderInner>{children}</AuthProviderInner>
  );
}

export function useAuth() {
  return useContext(Ctx);
}
