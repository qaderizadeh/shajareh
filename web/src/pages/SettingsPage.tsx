import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth";
import { useTheme } from "../theme";
import { Button, Card, Field, Select, TextInput } from "../components/ui";
import { api } from "../lib/api";
import { useActiveFamily } from "../activeFamily";

export default function SettingsPage() {
  const { user, logout, refresh } = useAuth();
  const { theme, toggle } = useTheme();
  const { familyId, families, setFamilyId, refresh: refreshFamily } = useActiveFamily();
  const navigate = useNavigate();
  const [name, setName] = useState(user?.name ?? "");
  const [saved, setSaved] = useState(false);

  async function save(e: FormEvent) {
    e.preventDefault();
    await api.patch(`/users/me`, { name });
    setSaved(true);
    await refresh();
    await refreshFamily();
  }

  async function handleLogout() {
    await logout();
    navigate("/auth");
  }

  return (
    <div style={{ maxWidth: 560 }}>
      <h1 className="page-title">تنظیمات</h1>
      <p className="page-sub">حساب، خانواده و ظاهر.</p>

      {/* ظاهر */}
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>ظاهر</h3>
        <div className="row justify-between">
          <span>حالت <strong>{theme === "dark" ? "تیره" : "روشن"}</strong></span>
          <Button variant="secondary" size="sm" onClick={toggle}>{theme === "dark" ? "🌞 روشن کن" : "🌙 تیره کن"}</Button>
        </div>
      </Card>

      {/* خانواده */}
      {families.length > 0 && (
        <Card style={{ marginBottom: 16 }}>
          <h3 style={{ marginBottom: 10 }}>خانواده‌ها</h3>
          <Field label="خانوادهٔ فعال">
            <Select value={familyId ?? ""} onChange={(e) => setFamilyId(e.target.value)}>
              {families.map((f) => <option key={f.id} value={f.id}>{f.name}</option>)}
            </Select>
          </Field>
          <Button variant="soft" size="sm" onClick={() => navigate("/onboarding")}>+ خانوادهٔ جدید</Button>
        </Card>
      )}

      {/* حساب */}
      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>حساب</h3>
        <form onSubmit={save}>
          <Field label="نام">
            <TextInput value={name} onChange={(e) => setName(e.target.value)} />
          </Field>
          <Field label="ایمیل">
            <TextInput value={user?.email ?? ""} disabled dir="ltr" />
          </Field>
          <div className="row spacing-2">
            <Button type="submit" size="sm">ذخیره نام</Button>
            {saved && <span className="badge badge-success">ذخیره شد ✓</span>}
          </div>
        </form>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>داده‌ها</h3>
        <Button variant="secondary" size="sm" onClick={() => window.alert("خروجی JSON به‌زودی اضافه می‌شود (GEDCOM در برنامهٔ بعدی).")}>
          استخراج داده‌ها (JSON)
        </Button>
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>نقش تو</h3>
        <span className="badge badge-primary">
          {user?.role === "ADMIN" ? "مدیر سیستم" : "کاربر"}
        </span>
        {user?.role === "ADMIN" && (
          <div style={{ marginTop: 8 }}>
            <Button variant="soft" size="sm" onClick={() => navigate("/admin")}>🛡️ رفتن به پنل مدیریت</Button>
          </div>
        )}
      </Card>

      <Card style={{ marginBottom: 16 }}>
        <h3 style={{ marginBottom: 10 }}>خروج</h3>
        <Button variant="danger" size="sm" onClick={handleLogout}>خروج از حساب</Button>
      </Card>
    </div>
  );
}