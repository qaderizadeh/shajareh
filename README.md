# شجره — آرشیو زنده خانواده

یک وب‌اپلیکیشن موبایل‌محور و فارسی برای ثبت، مدیریت و مشاهدهٔ شجره‌نامه‌های خانوادگی،
ساخته‌شده روی اکوسیستم Cloudflare.

## معماری

```text
Frontend (Vite + React + TS)
    ↓
Cloudflare Worker (Hono)
    ↓
D1 (Database) · KV (Sessions) · R2 (Media) · Workers AI
```

## ساختار

- `worker/` — بک‌اند Cloudflare Worker (Hono)، سرویس‌ها، AI، schema پایگاه‌داده
- `web/` — فرانت‌اند Vite + React، فارسی/RTL، حالت Light/Dark، موبایل‌محور

## شروع کار

```bash
npm install

# بک‌اند
cp worker/.dev.vars.example worker/.dev.vars
npm run dev:worker

# فرانت‌اند (با پراکسی به Worker)
npm run dev
```

## Deploy

```bash
npm run deploy
```

پیش از deploy این‌ها را روی حساب Cloudflare بساز:

```bash
npx wrangler d1 create shajareh
npx wrangler r2 bucket create shajareh-media
```

سپس `DATABASE_ID` را در `worker/wrangler.toml` قرار بده و migration را اجرا کن:

```bash
npm run db:migrate
```