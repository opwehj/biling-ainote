/**
 * @file services/db/MaterialRepository.ts
 * @description 素材 CRUD。提供按笔记查询、单条创建、按笔记删除。
 *              NoteRepository.create/update 已内联素材写入，本类供独立场景使用。
 */

import { getDatabase, type SQLiteDatabase } from './database';
import type { Material, MaterialType } from '../../types';
import { generateId } from '../../utils/id';
import logger from '../../utils/logger';
import { mapMaterialRow, type MaterialRow } from './NoteRepository';

/**
 * 素材仓储。
 */
export class MaterialRepository {
  private db: SQLiteDatabase;

  constructor(db?: SQLiteDatabase) {
    this.db = db ?? getDatabase();
  }

  /**
   * 查询某笔记的全部素材。
   */
  async findByNoteId(noteId: string): Promise<Material[]> {
    const rows = await this.db.getAllAsync<MaterialRow>(
      `SELECT * FROM materials WHERE note_id = ? ORDER BY created_at ASC;`,
      [noteId],
    );
    return rows.map(mapMaterialRow);
  }

  /**
   * 创建单条素材。
   */
  async create(material: Material): Promise<Material> {
    const id = material.id || generateId();
    const now = Date.now();
    await this.db.runAsync(
      `INSERT INTO materials (id, note_id, type, content, transcript, ocr_text, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?);`,
      [
        id,
        material.noteId,
        material.type,
        material.content,
        material.transcript ?? null,
        material.ocrText ?? null,
        material.createdAt || now,
      ],
    );
    logger.debug('Material created:', id, material.type);
    return { ...material, id, createdAt: material.createdAt || now };
  }

  /**
   * 更新素材（如回填 transcript / ocrText）。
   */
  async update(material: Material): Promise<void> {
    await this.db.runAsync(
      `UPDATE materials SET content = ?, transcript = ?, ocr_text = ? WHERE id = ?;`,
      [material.content, material.transcript ?? null, material.ocrText ?? null, material.id],
    );
  }

  /**
   * 按笔记删除全部素材。
   */
  async deleteByNoteId(noteId: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM materials WHERE note_id = ?;`, [noteId]);
    logger.debug('Materials deleted for note:', noteId);
  }

  /**
   * 删除单条素材。
   */
  async delete(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM materials WHERE id = ?;`, [id]);
  }

  /**
   * 类型守卫：判断字符串是否合法素材类型。
   */
  static isMaterialType(v: string): v is MaterialType {
    return v === 'text' || v === 'image' || v === 'audio';
  }
}

/** 单例 */
export const materialRepository = new MaterialRepository();
