import { drizzle, type BetterSQLite3Database } from "drizzle-orm/better-sqlite3"
import Database from "better-sqlite3"
import * as schema from "./schema"
import path from "path"
import fs from "fs"

const dbPath = process.env.DATABASE_PATH || path.join(process.cwd(), "luma.db")

// Lazy-initialized DB. Opening the SQLite file (and especially writing the
// `journal_mode = WAL` pragma) is itself a brief write op. During Next.js
// production build, ~31 parallel workers each evaluate this module, all try
// to write the pragma, and contention crashes with SQLITE_BUSY.
//
// We defer the open until something actually queries through the proxy
// below. Build-time module evaluation only sees an empty proxy and never
// touches the file.
type DrizzleDb = BetterSQLite3Database<typeof schema>

let cached: { sqlite: Database.Database; db: DrizzleDb } | null = null

function init(): DrizzleDb {
  if (cached) return cached.db

  const dbDir = path.dirname(dbPath)
  if (!fs.existsSync(dbDir)) {
    fs.mkdirSync(dbDir, { recursive: true })
  }

  const sqlite = new Database(dbPath)
  sqlite.pragma("journal_mode = WAL")
  sqlite.pragma("foreign_keys = ON")
  sqlite.pragma("busy_timeout = 5000")

  // Schema setup runs on first real query, not at import time.
  setupSchema(sqlite)

  const drizzleDb = drizzle(sqlite, { schema })
  cached = { sqlite, db: drizzleDb }
  return drizzleDb
}

function setupSchema(sqlite: Database.Database) {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS tasks (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      priority TEXT NOT NULL DEFAULT 'medium',
      due_date TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS notes (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      content TEXT,
      pinned INTEGER NOT NULL DEFAULT 0,
      event_id TEXT,
      event_date TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS calendar_events (
      id TEXT PRIMARY KEY,
      title TEXT NOT NULL,
      description TEXT,
      notes TEXT,
      start_time TEXT NOT NULL,
      end_time TEXT NOT NULL,
      all_day INTEGER NOT NULL DEFAULT 0,
      color TEXT,
      google_event_id TEXT,
      google_calendar_id TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS conversations (
      id TEXT PRIMARY KEY,
      title TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS chat_messages (
      id TEXT PRIMARY KEY,
      role TEXT NOT NULL,
      content TEXT NOT NULL,
      conversation_id TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS projects (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      description TEXT,
      color TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'active',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS project_tasks (
      id TEXT PRIMARY KEY,
      project_id TEXT NOT NULL,
      title TEXT NOT NULL,
      description TEXT,
      status TEXT NOT NULL DEFAULT 'todo',
      due_date TEXT,
      calendar_id TEXT,
      "order" INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS pomodoro_sessions (
      id TEXT PRIMARY KEY,
      task_id TEXT,
      project_id TEXT,
      duration INTEGER NOT NULL,
      completed_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habits (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      icon TEXT,
      color TEXT NOT NULL,
      frequency TEXT NOT NULL DEFAULT 'daily',
      target_per_day INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS habit_logs (
      id TEXT PRIMARY KEY,
      habit_id TEXT NOT NULL,
      date TEXT NOT NULL,
      count INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS journal_entries (
      id TEXT PRIMARY KEY,
      date TEXT NOT NULL,
      content TEXT,
      mood INTEGER,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS local_calendars (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      color TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS memories (
      id TEXT PRIMARY KEY,
      category TEXT NOT NULL DEFAULT 'fact',
      content TEXT NOT NULL,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS oauth_tokens (
      id TEXT PRIMARY KEY,
      provider TEXT NOT NULL,
      access_token TEXT NOT NULL,
      refresh_token TEXT NOT NULL,
      expires_at TEXT NOT NULL,
      scope TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rules (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      trigger_type TEXT NOT NULL,
      trigger_config TEXT,
      action_type TEXT NOT NULL,
      action_config TEXT,
      enabled INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS rule_runs (
      id TEXT PRIMARY KEY,
      rule_id TEXT NOT NULL,
      status TEXT NOT NULL,
      details TEXT,
      ran_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS embeddings (
      id TEXT PRIMARY KEY,
      kind TEXT NOT NULL,
      ref_id TEXT NOT NULL,
      embedding BLOB NOT NULL,
      model TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_embeddings_kind_ref ON embeddings (kind, ref_id);
    CREATE TABLE IF NOT EXISTS user_settings (
      key TEXT PRIMARY KEY,
      value TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE TABLE IF NOT EXISTS triage_suggestions (
      id TEXT PRIMARY KEY,
      source TEXT NOT NULL,
      source_ref_id TEXT,
      kind TEXT NOT NULL DEFAULT 'task',
      title TEXT NOT NULL,
      description TEXT,
      suggested_due_date TEXT,
      suggested_priority TEXT DEFAULT 'medium',
      payload TEXT,
      status TEXT NOT NULL DEFAULT 'pending',
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_triage_status ON triage_suggestions (status, created_at);
    CREATE UNIQUE INDEX IF NOT EXISTS idx_triage_source_ref
      ON triage_suggestions (source, source_ref_id);
  `)

  // Migrate existing tables — add new columns if missing
  const alters = [
    `ALTER TABLE notes ADD COLUMN event_id TEXT`,
    `ALTER TABLE notes ADD COLUMN event_date TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN notes TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN google_calendar_id TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN recurrence TEXT`,
    `ALTER TABLE calendar_events ADD COLUMN local_calendar_id TEXT`,
    `ALTER TABLE project_tasks ADD COLUMN due_date TEXT`,
    `ALTER TABLE project_tasks ADD COLUMN calendar_id TEXT`,
    `ALTER TABLE tasks ADD COLUMN recurrence TEXT`,
    `ALTER TABLE tasks ADD COLUMN parent_id TEXT`,
    `ALTER TABLE tasks ADD COLUMN is_template INTEGER NOT NULL DEFAULT 0`,
    `ALTER TABLE project_tasks ADD COLUMN parent_id TEXT`,
    `ALTER TABLE tasks ADD COLUMN archived_at TEXT`,
    `ALTER TABLE project_tasks ADD COLUMN archived_at TEXT`,
  ]
  for (const sql of alters) {
    try {
      sqlite.exec(sql)
    } catch {
      // Column already exists — expected on every run except the first
    }
  }
}

// Proxy that lazily initializes the underlying drizzle instance on first
// property access. Keeps the existing `db.select(...)` ergonomics across the
// codebase without touching any callers.
export const db = new Proxy({} as DrizzleDb, {
  get(_target, prop, receiver) {
    const real = init()
    const value = Reflect.get(real, prop, receiver)
    return typeof value === "function" ? value.bind(real) : value
  },
}) as DrizzleDb
