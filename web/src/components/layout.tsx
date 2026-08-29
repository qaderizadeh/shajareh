import { NavLink, Navigate, Outlet, useLocation, Link } from "react-router-dom";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import { Avatar, Button, LoadingState } from "./ui";

const NAV = [
  { to: "/", icon: "🏠", label: "خانه" },
  { to: "/tree", icon: "🌳", label: "شجره" },
  { to: "/search", icon: "🔍", label: "جستجو" },
  { to: "/ai", icon: "✨", label: "هوش" },
  { to: "/settings", icon: "⚙️", label: "تنظیمات" },
];

function ThemeToggle() {
  const { theme, toggle } = useTheme();
  return (
    <Button variant="ghost" size="sm" aria-label="تغییر حالت شب/روز" onClick={toggle}>
      {theme === "dark" ? "🌙" : "☀️"}
    </Button>
  );
}

export function ProtectedLayout() {
  const { user, ready, logout } = useAuth();
  const location = useLocation();

  if (!ready) {
    return (
      <div className="state">
        <LoadingState label="در حال آماده‌سازی…" />
      </div>
    );
  }
  if (!user) return <Navigate to="/auth" replace state={{ from: location.pathname }} />;

  return (
    <div className="app-shell">
      {/* Top bar */}
      <header className="topbar">
        <Link to="/" className="brand">
          <span className="brand-logo">🌿</span>
          شجره
        </Link>
        <div className="grow" />
        <ThemeToggle />
        <Link to="/settings">
          <Avatar name={user.name} size="md" />
        </Link>
      </header>

      {/* Desktop sidebar */}
      <aside className="sidebar">
        <div className="sidebar-top">
          <div className="brand">
            <span className="brand-logo">🌿</span>شجره
          </div>
        </div>
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `sidebar-link ${isActive ? "active" : ""}`}>
            <span>{n.icon}</span> {n.label}
          </NavLink>
        ))}
        <div className="grow" />
        {user.role === "ADMIN" && (
          <Link to="/admin" className="sidebar-link">🛡️ مدیریت</Link>
        )}
        <Button variant="ghost" size="sm" onClick={async () => { await logout(); }}>
          خروج از حساب
        </Button>
      </aside>

      <main className="content">
        <Outlet />
      </main>

      {/* Bottom navigation (موبایل) */}
      <nav className="bottomnav" aria-label="ناوبری اصلی">
        {NAV.map((n) => (
          <NavLink key={n.to} to={n.to} end={n.to === "/"} className={({ isActive }) => `bottomnav-item ${isActive ? "active" : ""}`}>
            <span className="nav-icon">{n.icon}</span>
            <span>{n.label}</span>
          </NavLink>
        ))}
      </nav>
    </div>
  );
}