/**
 * @file services/db/SettingsRepository.ts
 * @description 设置读写。settings 为单行表（id=1），仅存非敏感配置。
 *              密钥不进 SQLite，由 SecureStorage 管理。
 */

import { getDatabase, type SQLiteDatabase } from './database';
import type { AISetting } from '../../types';
import { DEFAULT_AI_SETTING } from '../../constants/config';
import logger from '../../utils/logger';

/** settings 行类型 */
export interface SettingsRow {
  id: number;
  llm_provider: string;
  llm_model: string;
  vision_model: string;
  asr_enabled: number;
  temperature: number;
  max_tokens: number;
  theme_mode: string;
  sort_order: string;
  updated_at: number;
}

/**
 * SettingsRow → AISetting（含类型转换）。
 */
function mapSettingsRow(row: SettingsRow): AISetting {
  return {
    llmProvider: row.llm_provider as AISetting['llmProvider'],
    llmModel: row.llm_model,
    visionModel: row.vision_model,
    asrEnabled: row.asr_enabled !== 0,
    temperature: row.temperature,
    maxTokens: row.max_tokens,
    themeMode: row.theme_mode as AISetting['themeMode'],
    sortOrder: row.sort_order as AISetting['sortOrder'],
  };
}

/**
 * 设置仓储。
 */
export class SettingsRepository {
  private db: SQLiteDatabase;

  constructor(db?: SQLiteDatabase) {
    this.db = db ?? getDatabase();
  }

  /**
   * 读取设置。若无则返回默认值并落库。
   */
  async get(): Promise<AISetting> {
    const row = await this.db.getFirstAsync<SettingsRow>(
      `SELECT * FROM settings WHERE id = 1;`,
    );
    if (!row) {
      await this.save(DEFAULT_AI_SETTING);
      return { ...DEFAULT_AI_SETTING };
    }
    return mapSettingsRow(row);
  }

  /**
   * 保存设置（UPSERT 单行）。
   */
  async save(setting: AISetting): Promise<void> {
    const now = Date.now();
    await this.db.runAsync(
      `INSERT INTO settings (id, llm_provider, llm_model, vision_model, asr_enabled, temperature, max_tokens, theme_mode, sort_order, updated_at)
       VALUES (1, ?, ?, ?, ?, ?, ?, ?, ?, ?)
       ON CONFLICT(id) DO UPDATE SET
         llm_provider = excluded.llm_provider,
         llm_model = excluded.llm_model,
         vision_model = excluded.vision_model,
         asr_enabled = excluded.asr_enabled,
         temperature = excluded.temperature,
         max_tokens = excluded.max_tokens,
         theme_mode = excluded.theme_mode,
         sort_order = excluded.sort_order,
         updated_at = excluded.updated_at;`,
      [
        setting.llmProvider,
        setting.llmModel,
        setting.visionModel,
        setting.asrEnabled ? 1 : 0,
        setting.temperature,
        setting.maxTokens,
        setting.themeMode,
        setting.sortOrder,
        now,
      ],
    );
    logger.debug('Settings saved');
  }

  /**
   * 重置为默认设置。
   */
  async reset(): Promise<AISetting> {
    await this.save(DEFAULT_AI_SETTING);
    return { ...DEFAULT_AI_SETTING };
  }
}

/** 单例 */
export const settingsRepository = new SettingsRepository();
