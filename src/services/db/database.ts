/**
 * @file services/db/database.ts
 * @description SQLite 连接与初始化。使用 expo-sqlite 现代 API（openSync / prepareAsync）。
 *              提供单例 db 句柄与 initDatabase 入口。
 */

import * as SQLite from 'expo-sqlite';
import { DB_CONFIG } from '../../constants/config';
import { CREATE_TABLES_SQL, SEED_CATEGORIES_SQL, SEED_SETTINGS_SQL } from './migrations';
import logger from '../../utils/logger';

/** SQLite 数据库实例类型（expo-sqlite v15） */
export type SQLiteDatabase = SQLite.SQLiteDatabase;

let dbInstance: SQLiteDatabase | null = null;
let initPromise: Promise<SQLiteDatabase> | null = null;

/**
 * 打开数据库（单例）。
 * @returns SQLite 数据库实例
 */
function openDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    dbInstance = SQLite.openDatabaseSync(DB_CONFIG.NAME);
    logger.info('SQLite database opened:', DB_CONFIG.NAME);
  }
  return dbInstance;
}

/**
 * 初始化数据库：开启外键、建表、种子数据。
 * 幂等，多次调用安全。
 */
export async function initDatabase(): Promise<SQLiteDatabase> {
  if (initPromise) {
    return initPromise;
  }
  initPromise = (async () => {
    const db = openDatabase();
    await db.execAsync('PRAGMA journal_mode = WAL;');
    await db.execAsync('PRAGMA foreign_keys = ON;');

    for (const sql of CREATE_TABLES_SQL) {
      await db.execAsync(sql);
    }
    await db.execAsync(SEED_CATEGORIES_SQL);
    await db.execAsync(SEED_SETTINGS_SQL);

    logger.info('Database initialized with tables and seed data');
    return db;
  })();
  return initPromise;
}

/**
 * 获取已初始化的数据库实例。
 * 必须在 initDatabase 完成后调用。
 */
export function getDatabase(): SQLiteDatabase {
  if (!dbInstance) {
    // 兜底：若未显式初始化，则尝试打开（同步打开在 RN 中是允许的）
    dbInstance = SQLite.openDatabaseSync(DB_CONFIG.NAME);
    logger.warn('Database accessed before initDatabase, opening lazily');
  }
  return dbInstance;
}

/**
 * 关闭数据库（测试用）。
 */
export async function closeDatabase(): Promise<void> {
  if (dbInstance) {
    await dbInstance.closeAsync();
    dbInstance = null;
    initPromise = null;
    logger.info('Database closed');
  }
}
