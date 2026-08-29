import { createContext, useCallback, useContext, useState, type ReactNode } from "react";
import { initials } from "../lib/format";

/* ===== Button ===== */
interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: "primary" | "secondary" | "ghost" | "danger" | "soft" | "danger-solid";
  block?: boolean;
  size?: "sm" | "md" | "lg";
}
export function Button({ variant = "primary", block, size = "md", className = "", children, ...rest }: BtnProps) {
  const classes = ["btn", `btn-${variant}`, block ? "btn-block" : "", size !== "md" ? `btn-${size}` : "", className].join(" ").trim();
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  );
}

/* ===== Input ===== */
interface FieldProps {
  label?: string;
  hint?: string;
  error?: string;
  children: ReactNode;
}
export function Field({ label, hint, error, children }: FieldProps) {
  return (
    <div className="field">
      {label && <label>{label}</label>}
      {children}
      {hint && !error && <span className="muted" style={{ fontSize: "var(--text-xs)" }}>{hint}</span>}
      {error && <span className="field-error">{error}</span>}
    </div>
  );
}

export function TextInput(props: React.InputHTMLAttributes<HTMLInputElement> & { invalid?: boolean }) {
  const { invalid, className = "", ...rest } = props;
  return <input className={`input ${invalid ? "error" : ""} ${className}`} {...rest} />;
}
export function TextArea(props: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
  return <textarea className="textarea" {...props} />;
}
export function Select(props: React.SelectHTMLAttributes<HTMLSelectElement>) {
  return <select className="select" {...props} />;
}

/* ===== Card / Badge / Avatar ===== */
type CardProps = { children: ReactNode; className?: string; onClick?: () => void; style?: React.CSSProperties };
export function Card({ children, className = "", onClick, style }: CardProps) {
  return (
    <div className={`card ${onClick ? "card-pressable" : ""} ${className}`} onClick={onClick} role={onClick ? "button" : undefined} style={style}>
      {children}
    </div>
  );
}

type Tone = "primary" | "success" | "danger" | "accent";
export function Badge({ children, tone }: { children: ReactNode; tone?: Tone }) {
  return <span className={`badge ${tone ? `badge-${tone}` : ""}`}>{children}</span>;
}

export function Avatar({ name, gender, size = "md" }: { name: string; gender?: string; size?: "md" | "lg" | "xl" }) {
  const cls = ["avatar", `avatar-${size}`];
  if (gender === "MALE") cls.push("avatar-male");
  else if (gender === "FEMALE") cls.push("avatar-female");
  return <span className={cls.join(" ")}>{initials(name)}</span>;
}

/* ===== Modal / BottomSheet ===== */
export function BottomSheet({ open, title, onClose, children }: { open: boolean; title?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="sheet" role="dialog" aria-modal="true" aria-label={title}>
        <div className="sheet-handle" />
        {title && <div className="sheet-title">{title}</div>}
        {children}
      </div>
    </>
  );
}

export function Modal({ open, title, onClose, children }: { open: boolean; title?: string; onClose: () => void; children: ReactNode }) {
  if (!open) return null;
  return (
    <>
      <div className="scrim" onClick={onClose} />
      <div className="modal-centered" role="dialog" aria-modal="true" aria-label={title}>
        {title && <div className="modal-title">{title}</div>}
        {children}
      </div>
    </>
  );
}

/* ===== State ===== */
export function EmptyState({ icon = "🌿", title, hint, actions }: { icon?: string; title: string; hint?: string; actions?: ReactNode }) {
  return (
    <div className="state">
      <div className="state-icon">{icon}</div>
      <div className="state-title">{title}</div>
      {hint && <p className="muted">{hint}</p>}
      {actions && <div className="state-actions">{actions}</div>}
    </div>
  );
}

export function LoadingState({ label = "در حال بارگذاری…" }: { label?: string }) {
  return (
    <div className="state">
      <div className="spinner" />
      <p className="muted">{label}</p>
    </div>
  );
}

export function ErrorState({ message, onRetry }: { message: string; onRetry?: () => void }) {
  return (
    <EmptyState icon="⚠️" title="مشکلی پیش آمد" hint={message} actions={onRetry ? <Button variant="secondary" onClick={onRetry}>تلاش دوباره</Button> : undefined} />
  );
}

/* ===== Tabs ===== */
interface TabItem { key: string; label: string; }
export function Tabs({ tabs, active, onChange }: { tabs: TabItem[]; active: string; onChange: (key: string) => void }) {
  return (
    <div className="tabs" role="tablist">
      {tabs.map((t) => (
        <button key={t.key} role="tab" aria-selected={active === t.key} className={`tab ${active === t.key ? "active" : ""}`} onClick={() => onChange(t.key)}>
          {t.label}
        </button>
      ))}
    </div>
  );
}

/* ===== Toast ===== */
interface Toast {
  id: number;
  message: string;
  type: "info" | "success" | "error";
}
const ToastCtx = createContext<{ push: (m: string, t?: Toast["type"]) => void }>({ push: () => {} });

export function ToastProvider({ children }: { children: ReactNode }) {
  const [items, setItems] = useState<Toast[]>([]);
  const push = useCallback((message: string, type: Toast["type"] = "info") => {
    const id = Date.now() + Math.random();
    setItems((arr) => [...arr, { id, message, type }]);
    setTimeout(() => setItems((arr) => arr.filter((x) => x.id !== id)), 3200);
  }, []);
  return (
    <ToastCtx.Provider value={{ push }}>
      {children}
      {items.length > 0 && (
        <div className="toast-wrap" role="status">
          {items.map((t) => (
            <div key={t.id} className={`toast ${t.type}`}>{t.message}</div>
          ))}
        </div>
      )}
    </ToastCtx.Provider>
  );
}
export function useToast() {
  return useContext(ToastCtx);
}