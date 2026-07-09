/**
 * @file services/db/migrations.ts
 * @description 数据库建表 SQL 与迁移。版本化管理，便于后续升级。
 *              列名 snake_case，与 TS 领域模型由 Repository 映射。
 */

/** 建表语句（IF NOT EXISTS，幂等执行） */
export const CREATE_TABLES_SQL: string[] = [
  `CREATE TABLE IF NOT EXISTS notes (
    id           TEXT PRIMARY KEY,
    title        TEXT NOT NULL DEFAULT '',
    summary      TEXT NOT NULL DEFAULT '',
    content      TEXT NOT NULL DEFAULT '',
    key_points   TEXT NOT NULL DEFAULT '[]',
    tags         TEXT NOT NULL DEFAULT '[]',
    category_id  TEXT,
    status       TEXT NOT NULL DEFAULT 'completed',
    created_at   INTEGER NOT NULL,
    updated_at   INTEGER NOT NULL,
    FOREIGN KEY (category_id) REFERENCES categories(id) ON DELETE SET NULL
  );`,
  `CREATE TABLE IF NOT EXISTS materials (
    id         TEXT PRIMARY KEY,
    note_id    TEXT NOT NULL,
    type       TEXT NOT NULL,
    content    TEXT NOT NULL DEFAULT '',
    transcript TEXT,
    ocr_text   TEXT,
    created_at INTEGER NOT NULL,
    FOREIGN KEY (note_id) REFERENCES notes(id) ON DELETE CASCADE
  );`,
  `CREATE INDEX IF NOT EXISTS idx_materials_note_id ON materials(note_id);`,
  `CREATE TABLE IF NOT EXISTS categories (
    id         TEXT PRIMARY KEY,
    name       TEXT NOT NULL,
    color      TEXT NOT NULL DEFAULT '#5B8DEF',
    sort_order INTEGER NOT NULL DEFAULT 0,
    created_at INTEGER NOT NULL
  );`,
  `CREATE TABLE IF NOT EXISTS settings (
    id            INTEGER PRIMARY KEY CHECK (id = 1),
    llm_provider  TEXT NOT NULL DEFAULT 'qwen',
    llm_model     TEXT NOT NULL DEFAULT 'qwen-plus',
    vision_model  TEXT NOT NULL DEFAULT 'qwen-vl-plus',
    asr_enabled   INTEGER NOT NULL DEFAULT 1,
    temperature   REAL NOT NULL DEFAULT 0.7,
    max_tokens    INTEGER NOT NULL DEFAULT 2000,
    theme_mode    TEXT NOT NULL DEFAULT 'system',
    sort_order    TEXT NOT NULL DEFAULT 'updated_desc',
    updated_at    INTEGER NOT NULL
  );`,
];

/** 初始化默认分类 */
export const SEED_CATEGORIES_SQL = `
  INSERT OR IGNORE INTO categories (id, name, color, sort_order, created_at) VALUES
    ('default', '默认', '#5B8DEF', 0, 0),
    ('work', '工作', '#7C5CE6', 1, 0),
    ('study', '学习', '#30B46C', 2, 0),
    ('life', '生活', '#F5A623', 3, 0);
`;

/** 确保默认 settings 行存在 */
export const SEED_SETTINGS_SQL = `
  INSERT OR IGNORE INTO settings (id, llm_provider, llm_model, vision_model, asr_enabled, temperature, max_tokens, theme_mode, sort_order, updated_at)
  VALUES (1, 'qwen', 'qwen-plus', 'qwen-vl-plus', 1, 0.7, 2000, 'system', 'updated_desc', 0);
`;
