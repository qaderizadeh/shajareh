-- =====================================================================
-- شجره — schema ۱
-- =====================================================================

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'USER',               -- ADMIN | USER
  avatar TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS families (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT,
  created_by TEXT NOT NULL REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS family_memberships (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'VIEWER',              -- ADMIN | EDITOR | VIEWER
  status TEXT NOT NULL DEFAULT 'ACTIVE',           -- ACTIVE | PENDING | SUSPENDED
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  UNIQUE (family_id, user_id)
);

CREATE TABLE IF NOT EXISTS persons (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  first_name TEXT NOT NULL,
  last_name TEXT NOT NULL DEFAULT '',
  father_name TEXT NOT NULL DEFAULT '',
  mother_name TEXT NOT NULL DEFAULT '',
  gender TEXT NOT NULL DEFAULT 'UNKNOWN',           -- MALE | FEMALE | UNKNOWN
  -- تاریخ‌های تاریخی/تقریبی (متن فارسی + بازه عددی برای مرتب‌سازی)
  birth_date_text TEXT NOT NULL DEFAULT '',
  birth_year_min INTEGER,
  birth_year_max INTEGER,
  birth_place TEXT NOT NULL DEFAULT '',
  death_date_text TEXT NOT NULL DEFAULT '',
  death_year_min INTEGER,
  death_year_max INTEGER,
  death_place TEXT NOT NULL DEFAULT '',
  is_living INTEGER NOT NULL DEFAULT 1,
  occupation TEXT NOT NULL DEFAULT '',
  residence TEXT NOT NULL DEFAULT '',
  education TEXT NOT NULL DEFAULT '',
  biography TEXT NOT NULL DEFAULT '',
  is_private INTEGER NOT NULL DEFAULT 0,            -- افراد زنده/خصوصی
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_persons_family ON persons(family_id);
CREATE INDEX IF NOT EXISTS idx_persons_name ON persons(last_name, first_name);

CREATE TABLE IF NOT EXISTS relationships (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  person_a_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  person_b_id TEXT NOT NULL REFERENCES persons(id) ON DELETE CASCADE,
  relationship_type TEXT NOT NULL,                 -- PARENT | CHILD | SPOUSE | PARTNER | SIBLING
  start_date_text TEXT NOT NULL DEFAULT '',
  end_date_text TEXT NOT NULL DEFAULT '',
  notes TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  CHECK (person_a_id <> person_b_id)
);

CREATE INDEX IF NOT EXISTS idx_rel_person_a ON relationships(person_a_id);
CREATE INDEX IF NOT EXISTS idx_rel_person_b ON relationships(person_b_id);
CREATE INDEX IF NOT EXISTS idx_rel_family ON relationships(family_id);

CREATE TABLE IF NOT EXISTS media (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  kind TEXT NOT NULL DEFAULT 'PHOTO',              -- PHOTO | DOCUMENT
  storage_key TEXT NOT NULL,                       -- کلید در R2
  mime_type TEXT NOT NULL DEFAULT 'image/jpeg',
  size INTEGER NOT NULL DEFAULT 0,
  caption TEXT NOT NULL DEFAULT '',
  taken_at_text TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  uploaded_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_media_person ON media(person_id);
CREATE INDEX IF NOT EXISTS idx_media_family ON media(family_id);

CREATE TABLE IF NOT EXISTS stories (
  id TEXT PRIMARY KEY,
  family_id TEXT NOT NULL REFERENCES families(id) ON DELETE CASCADE,
  person_id TEXT REFERENCES persons(id) ON DELETE SET NULL,
  title TEXT NOT NULL,
  body TEXT NOT NULL DEFAULT '',
  date_text TEXT NOT NULL DEFAULT '',
  location TEXT NOT NULL DEFAULT '',
  created_by TEXT REFERENCES users(id),
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- پیشنهادهای AI برای ساخت شجره از متن
CREATE TABLE IF NOT EXISTS ai_proposals (
  id TEXT PRIMARY KEY,
  family_id TEXT REFERENCES families(id) ON DELETE CASCADE,
  user_id TEXT REFERENCES users(id),
  source_text TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',          -- PENDING | CONFIRMED | REJECTED | APPLIED
  payload TEXT NOT NULL,                            -- JSON ساخت‌یافتهٔ پیشنهاد
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- لاگ تغییرات (Audit)
CREATE TABLE IF NOT EXISTS audit_logs (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id TEXT REFERENCES users(id),
  entity_type TEXT NOT NULL,
  entity_id TEXT NOT NULL,
  action TEXT NOT NULL,
  before TEXT,
  after TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_audit_entity ON audit_logs(entity_type, entity_id);
CREATE INDEX IF NOT EXISTS idx_audit_user ON audit_logs(user_id);

-- آمار داخلی
CREATE TABLE IF NOT EXISTS analytics_snapshot (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  users_count INTEGER NOT NULL DEFAULT 0,
  families_count INTEGER NOT NULL DEFAULT 0,
  persons_count INTEGER NOT NULL DEFAULT 0,
  relationships_count INTEGER NOT NULL DEFAULT 0,
  media_count INTEGER NOT NULL DEFAULT 0,
  ai_requests_count INTEGER NOT NULL DEFAULT 0,
  captured_at TEXT NOT NULL DEFAULT (datetime('now'))
);