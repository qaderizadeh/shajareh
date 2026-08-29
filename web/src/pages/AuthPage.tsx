import { useState, type FormEvent } from "react";
import { Navigate, useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import { Button, Field, TextInput } from "../components/ui";

export default function AuthPage() {
  const { user, ready, login, register } = useAuth();
  const navigate = useNavigate();
  const { theme, toggle } = useTheme();
  const [mode, setMode] = useState<"login" | "register">("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!email.trim()) return setError("ایمیل را وارد کنید.");
    if (!password) return setError("گذرواژه را وارد کنید.");
    if (mode === "register" && !name.trim()) return setError("نام را وارد کنید.");
    if (mode === "register" && password.length < 8) return setError("گذرواژه باید حداقل ۸ کاراکتر باشد.");
    setBusy(true);
    try {
      if (mode === "login") await login(email, password);
      else await register(name, email, password);
      navigate("/");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  }

  if (ready && user) return <Navigate to="/" replace />;

  return (
    <div style={{ minHeight: "100dvh", display: "grid", placeItems: "center", padding: "var(--space-5)" }}>
      <div style={{ width: "100%", maxWidth: 400 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 24 }}>
          <div className="brand" style={{ fontSize: "var(--text-2xl)" }}>
            <span style={{ color: "var(--primary)" }}>🌿</span> شجره
          </div>
          <Button variant="ghost" size="sm" onClick={toggle}>{theme === "dark" ? "🌙" : "☀️"}</Button>
        </div>

        <h1 style={{ fontSize: "var(--text-2xl)", marginBottom: 6 }}>
          {mode === "login" ? "خوش آمدید 👋" : "به شجره خوش آمدید"}
        </h1>
        <p className="muted" style={{ marginBottom: 24 }}>
          آرشیو زندهٔ خانواده‌ات را بساز؛ افراد، روابط و داستان‌های فامیل در یک‌جا.
        </p>

        <div className="tabs" style={{ marginBottom: 20 }}>
          <button className={`tab ${mode === "login" ? "active" : ""}`} onClick={() => setMode("login")}>ورود</button>
          <button className={`tab ${mode === "register" ? "active" : ""}`} onClick={() => setMode("register")}>ثبت‌نام</button>
        </div>

        <form onSubmit={submit}>
          {mode === "register" && (
            <Field label="نام">
              <TextInput value={name} onChange={(e) => setName(e.target.value)} placeholder="مثلاً رمضان قادری" autoComplete="name" />
            </Field>
          )}
          <Field label="ایمیل">
            <TextInput type="email" dir="ltr" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </Field>
          <Field label="گذرواژه">
            <TextInput type="password" dir="ltr" value={password} onChange={(e) => setPassword(e.target.value)} placeholder="••••••••" autoComplete={mode === "login" ? "current-password" : "new-password"} />
          </Field>

          {error && <div style={{ marginBottom: 14, background: "var(--danger-soft)", color: "var(--danger)", padding: "10px 12px", borderRadius: 8, fontSize: "var(--text-sm)" }}>{error}</div>}

          <Button type="submit" block size="lg" disabled={busy}>
            {busy ? "…در حال پردازش" : mode === "login" ? "ورود" : "ایجاد حساب"}
          </Button>
        </form>

        <p className="muted" style={{ marginTop: 18, fontSize: "var(--text-xs)", textAlign: "center" }}>
          دادهٔ خانواده متعلق به خانواده است؛ هوش مصنوعی فقط ابزار پردازش است.
        </p>
      </div>
    </div>
  );
}