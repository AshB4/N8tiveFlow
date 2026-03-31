import { mkdir, readFile, writeFile, access } from "fs/promises";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import Database from "better-sqlite3";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const BACKEND_ROOT = path.join(__dirname, "..");
const DATA_DIR = path.join(BACKEND_ROOT, "data");
const DB_PATH = path.join(DATA_DIR, "postpunk.sqlite");
const QUEUE_DIR = path.join(BACKEND_ROOT, "queue");
const JSON_POSTS = path.join(QUEUE_DIR, "postQueue.json");
const JSON_POSTED = path.join(QUEUE_DIR, "postedLog.json");
const JSON_REJECTED = path.join(QUEUE_DIR, "rejections.json");

let db = null;

async function readJson(file, fallback) {
  try {
    const raw = await readFile(file, "utf-8");
    return JSON.parse(raw);
  } catch {
    return fallback;
  }
}

async function writeJson(file, value) {
  await writeFile(file, JSON.stringify(value, null, 2));
}

function getDb() {
  if (db) return db;
  db = new Database(DB_PATH);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS posts (
      id TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS posted_log (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS rejections (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS settings (
      key TEXT PRIMARY KEY,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS pinterest_metrics_snapshots (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      payload TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
  return db;
}

function parsePayloadRows(rows) {
  return rows.map((row) => JSON.parse(row.payload));
}

async function syncJsonMirror() {
  const snapshot = readStoreSnapshotSync();
  await Promise.all([
    writeJson(JSON_POSTS, snapshot.posts),
    writeJson(JSON_POSTED, snapshot.postedLog),
    writeJson(JSON_REJECTED, snapshot.rejections),
  ]);
}

function readStoreSnapshotSync() {
  const conn = getDb();
  return {
    posts: parsePayloadRows(
      conn
        .prepare("SELECT payload FROM posts ORDER BY updated_at ASC")
        .all(),
    ),
    postedLog: parsePayloadRows(
      conn
        .prepare("SELECT payload FROM posted_log ORDER BY id ASC")
        .all(),
    ),
    rejections: parsePayloadRows(
      conn
        .prepare("SELECT payload FROM rejections ORDER BY id ASC")
        .all(),
    ),
  };
}

async function migrateFromJsonIfNeeded() {
  const conn = getDb();
  const row = conn
    .prepare(
      "SELECT (SELECT COUNT(*) FROM posts) AS posts_count, (SELECT COUNT(*) FROM posted_log) AS posted_count, (SELECT COUNT(*) FROM rejections) AS rejection_count",
    )
    .get();
  if (row.posts_count || row.posted_count || row.rejection_count) {
    return;
  }

  const [posts, postedLog, rejections] = await Promise.all([
    readJson(JSON_POSTS, []),
    readJson(JSON_POSTED, []),
    readJson(JSON_REJECTED, []),
  ]);

  const insertPost = conn.prepare(
    "INSERT OR REPLACE INTO posts (id, payload, updated_at) VALUES (?, ?, ?)",
  );
  const insertPosted = conn.prepare(
    "INSERT INTO posted_log (payload, created_at) VALUES (?, ?)",
  );
  const insertRejected = conn.prepare(
    "INSERT INTO rejections (payload, created_at) VALUES (?, ?)",
  );
  const now = new Date().toISOString();

  const tx = conn.transaction(() => {
    for (const post of posts) {
      insertPost.run(post.id, JSON.stringify(post), post.updatedAt || post.createdAt || now);
    }
    for (const entry of postedLog) {
      insertPosted.run(JSON.stringify(entry), entry.processedAt || now);
    }
    for (const entry of rejections) {
      insertRejected.run(JSON.stringify(entry), entry.processedAt || now);
    }
  });
  tx();
}

export async function initLocalDb() {
  await mkdir(DATA_DIR, { recursive: true });
  await mkdir(QUEUE_DIR, { recursive: true });
  const ensure = async (file, fallback) => {
    try {
      await access(file, fs.constants.F_OK);
    } catch {
      await writeJson(file, fallback);
    }
  };
  await ensure(JSON_POSTS, []);
  await ensure(JSON_POSTED, []);
  await ensure(JSON_REJECTED, []);
  getDb();
  await migrateFromJsonIfNeeded();
  await syncJsonMirror();
}

export function getLocalDbPath() {
  return DB_PATH;
}

export async function readStoreSnapshot() {
  return readStoreSnapshotSync();
}

export async function replaceStoreSnapshot({ posts, postedLog, rejections }) {
  const conn = getDb();
  const tx = conn.transaction(() => {
    conn.prepare("DELETE FROM posts").run();
    conn.prepare("DELETE FROM posted_log").run();
    conn.prepare("DELETE FROM rejections").run();

    const insertPost = conn.prepare(
      "INSERT INTO posts (id, payload, updated_at) VALUES (?, ?, ?)",
    );
    const insertPosted = conn.prepare(
      "INSERT INTO posted_log (payload, created_at) VALUES (?, ?)",
    );
    const insertRejected = conn.prepare(
      "INSERT INTO rejections (payload, created_at) VALUES (?, ?)",
    );
    const now = new Date().toISOString();

    for (const post of posts || []) {
      insertPost.run(post.id, JSON.stringify(post), post.updatedAt || post.createdAt || now);
    }
    for (const entry of postedLog || []) {
      insertPosted.run(JSON.stringify(entry), entry.processedAt || now);
    }
    for (const entry of rejections || []) {
      insertRejected.run(JSON.stringify(entry), entry.processedAt || now);
    }
  });
  tx();
  await syncJsonMirror();
}

export async function listPosts() {
  return readStoreSnapshotSync().posts;
}

export async function listPostedLog() {
  return readStoreSnapshotSync().postedLog;
}

export async function createPost(post) {
  const conn = getDb();
  conn
    .prepare("INSERT INTO posts (id, payload, updated_at) VALUES (?, ?, ?)")
    .run(post.id, JSON.stringify(post), post.updatedAt || post.createdAt || new Date().toISOString());
  await syncJsonMirror();
  return post;
}

export async function updatePost(id, post) {
  const conn = getDb();
  conn
    .prepare("UPDATE posts SET payload = ?, updated_at = ? WHERE id = ?")
    .run(JSON.stringify(post), post.updatedAt || new Date().toISOString(), id);
  await syncJsonMirror();
  return post;
}

export async function deletePost(id) {
  const current = await listPosts();
  const found = current.find((post) => post.id === id) || null;
  getDb().prepare("DELETE FROM posts WHERE id = ?").run(id);
  await syncJsonMirror();
  return found;
}

export async function clearPostedPostsFromQueue() {
  const conn = getDb();
  const rows = conn
    .prepare("SELECT id, payload FROM posts")
    .all()
    .map((row) => ({ id: row.id, payload: JSON.parse(row.payload) }));
  const idsToRemove = rows
    .filter((row) => String(row.payload?.status || "").toLowerCase() === "posted")
    .map((row) => row.id);
  const removeStmt = conn.prepare("DELETE FROM posts WHERE id = ?");
  const tx = conn.transaction(() => {
    for (const id of idsToRemove) removeStmt.run(id);
  });
  tx();
  await syncJsonMirror();
  return idsToRemove.length;
}

export async function appendPostedLogEntry(entry) {
  getDb()
    .prepare("INSERT INTO posted_log (payload, created_at) VALUES (?, ?)")
    .run(JSON.stringify(entry), entry.processedAt || new Date().toISOString());
  await syncJsonMirror();
}

export async function appendRejectedEntry(entry) {
  getDb()
    .prepare("INSERT INTO rejections (payload, created_at) VALUES (?, ?)")
    .run(JSON.stringify(entry), entry.processedAt || new Date().toISOString());
  await syncJsonMirror();
}

const DEFAULT_ROTATION_SETTINGS = {
  cadenceDays: 1,
  defaultTime: "10:00",
  maxPostsPerDay: 1,
  mixProducts: true,
  approveOnSchedule: true,
  creatorPostFrequencyDays: 30,
  activeProductIds: [
    "goblin-self-care-coloring-book",
    "goblin-coloring-affirmations",
    "ai-powered-grad",
    "prompt-storm",
    "product-strategy-25",
    "kawaii-coloring-series",
    "buzzing-adventures-coloring-book",
  ],
  customProducts: [],
};

export function getDefaultRotationSettings() {
  return JSON.parse(JSON.stringify(DEFAULT_ROTATION_SETTINGS));
}

export async function getSetting(key, fallback = null) {
  const row = getDb()
    .prepare("SELECT payload FROM settings WHERE key = ?")
    .get(key);
  if (!row) {
    return fallback;
  }
  try {
    return JSON.parse(row.payload);
  } catch {
    return fallback;
  }
}

export async function setSetting(key, value) {
  const payload = JSON.stringify(value);
  getDb()
    .prepare(
      "INSERT INTO settings (key, payload, updated_at) VALUES (?, ?, ?) ON CONFLICT(key) DO UPDATE SET payload = excluded.payload, updated_at = excluded.updated_at",
    )
    .run(key, payload, new Date().toISOString());
  return value;
}

export async function getRotationSettings() {
  const stored = (await getSetting("rotation_settings", null)) || {};
  return {
    ...getDefaultRotationSettings(),
    ...stored,
    customProducts: Array.isArray(stored.customProducts) ? stored.customProducts : [],
    activeProductIds: Array.isArray(stored.activeProductIds)
      ? stored.activeProductIds
      : getDefaultRotationSettings().activeProductIds,
  };
}

export async function updateRotationSettings(nextSettings = {}) {
  const merged = {
    ...(await getRotationSettings()),
    ...(nextSettings || {}),
  };
  merged.customProducts = Array.isArray(merged.customProducts) ? merged.customProducts : [];
  merged.activeProductIds = Array.isArray(merged.activeProductIds)
    ? merged.activeProductIds
    : [];
  await setSetting("rotation_settings", merged);
  return merged;
}

export async function listPinterestMetricsSnapshots({ postId = null, limit = 200 } = {}) {
  const safeLimit = Math.max(1, Math.min(Number(limit) || 200, 1000));
  const conn = getDb();
  const rows = postId
    ? conn
        .prepare(
          "SELECT payload FROM pinterest_metrics_snapshots WHERE json_extract(payload, '$.postId') = ? ORDER BY id DESC LIMIT ?",
        )
        .all(postId, safeLimit)
    : conn
        .prepare("SELECT payload FROM pinterest_metrics_snapshots ORDER BY id DESC LIMIT ?")
        .all(safeLimit);
  return parsePayloadRows(rows);
}

export async function appendPinterestMetricsSnapshot(entry) {
  getDb()
    .prepare("INSERT INTO pinterest_metrics_snapshots (payload, created_at) VALUES (?, ?)")
    .run(JSON.stringify(entry), entry.capturedAt || new Date().toISOString());
  return entry;
}

export async function getPinterestPinMappings() {
  const stored = (await getSetting("pinterest_pin_mappings", [])) || [];
  return Array.isArray(stored) ? stored : [];
}

export async function savePinterestPinMappings(mappings = []) {
  const normalized = Array.isArray(mappings) ? mappings : [];
  await setSetting("pinterest_pin_mappings", normalized);
  return normalized;
}
