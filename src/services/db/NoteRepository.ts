/**
 * @file services/db/NoteRepository.ts
 * @description 笔记 CRUD。负责 Note 主表读写，并在创建/更新时事务写入关联素材。
 *              负责 snake_case ↔ camelCase 映射、JSON 字符串 ↔ 数组转换。
 */

import { getDatabase, type SQLiteDatabase } from './database';
import type { Note, NoteStatus, NoteFilter, SortOrder, Material } from '../../types';
import { generateId } from '../../utils/id';
import logger from '../../utils/logger';

/** notes 表行类型（snake_case） */
export interface NoteRow {
  id: string;
  title: string;
  summary: string;
  content: string;
  key_points: string;
  tags: string;
  category_id: string | null;
  status: string;
  created_at: number;
  updated_at: number;
}

/** materials 表行类型（snake_case） */
export interface MaterialRow {
  id: string;
  note_id: string;
  type: string;
  content: string;
  transcript: string | null;
  ocr_text: string | null;
  created_at: number;
}

/**
 * 安全解析 JSON 数组字符串。
 */
function parseJsonArray(raw: string | null | undefined): string[] {
  if (!raw) return [];
  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed.map(String) : [];
  } catch {
    return [];
  }
}

/**
 * NoteRow → Note（不含 materials，需外部 join）。
 */
export function mapNoteRow(row: NoteRow): Omit<Note, 'materials'> {
  return {
    id: row.id,
    title: row.title,
    summary: row.summary,
    content: row.content,
    keyPoints: parseJsonArray(row.key_points),
    tags: parseJsonArray(row.tags),
    categoryId: row.category_id,
    status: row.status as NoteStatus,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

/**
 * MaterialRow → Material。
 */
export function mapMaterialRow(row: MaterialRow): Material {
  return {
    id: row.id,
    noteId: row.note_id,
    type: row.type as Material['type'],
    content: row.content,
    transcript: row.transcript ?? undefined,
    ocrText: row.ocr_text ?? undefined,
    createdAt: row.created_at,
  };
}

/**
 * 笔记仓储。
 */
export class NoteRepository {
  private db: SQLiteDatabase;

  constructor(db?: SQLiteDatabase) {
    this.db = db ?? getDatabase();
  }

  /**
   * 创建笔记及其关联素材（事务）。
   * 若 note.id 为空则自动生成。
   */
  async create(note: Note): Promise<Note> {
    const now = Date.now();
    const id = note.id || generateId();
    const createdAt = note.createdAt || now;
    const updatedAt = note.updatedAt || now;
    const materials = note.materials ?? [];

    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `INSERT INTO notes (id, title, summary, content, key_points, tags, category_id, status, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?);`,
        [
          id,
          note.title,
          note.summary,
          note.content,
          JSON.stringify(note.keyPoints ?? []),
          JSON.stringify(note.tags ?? []),
          note.categoryId ?? null,
          note.status,
          createdAt,
          updatedAt,
        ],
      );
      for (const m of materials) {
        await this.db.runAsync(
          `INSERT INTO materials (id, note_id, type, content, transcript, ocr_text, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            m.id || generateId(),
            id,
            m.type,
            m.content,
            m.transcript ?? null,
            m.ocrText ?? null,
            m.createdAt || now,
          ],
        );
      }
    });

    logger.debug('Note created:', id);
    const created = await this.findById(id);
    return created ?? { ...note, id, createdAt, updatedAt };
  }

  /**
   * 按 ID 查询笔记（含素材）。
   */
  async findById(id: string): Promise<Note | null> {
    const row = await this.db.getFirstAsync<NoteRow>(
      `SELECT * FROM notes WHERE id = ?;`,
      [id],
    );
    if (!row) return null;
    const materials = await this.fetchMaterials(id);
    return { ...mapNoteRow(row), materials };
  }

  /**
   * 查询笔记列表（含素材）。支持筛选与排序，分页。
   */
  async findAll(
    filter: NoteFilter = {},
    sortOrder: SortOrder = 'updated_desc',
    limit = 50,
    offset = 0,
  ): Promise<Note[]> {
    const { field, desc } = this.resolveSort(sortOrder);
    const where: string[] = [];
    const params: (string | number | null)[] = [];

    if (filter.keyword) {
      where.push('(title LIKE ? OR summary LIKE ? OR content LIKE ? OR tags LIKE ?)');
      const kw = `%${filter.keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    if (filter.categoryId !== undefined && filter.categoryId !== null) {
      where.push('category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const sql = `SELECT * FROM notes ${whereClause} ORDER BY ${field} ${desc ? 'DESC' : 'ASC'} LIMIT ? OFFSET ?;`;
    params.push(limit, offset);

    const rows = await this.db.getAllAsync<NoteRow>(sql, params);
    const notes: Note[] = [];
    for (const row of rows) {
      const materials = await this.fetchMaterials(row.id);
      notes.push({ ...mapNoteRow(row), materials });
    }
    return notes;
  }

  /**
   * 统计笔记数量（用于筛选计数）。
   */
  async count(filter: NoteFilter = {}): Promise<number> {
    const where: string[] = [];
    const params: (string | number | null)[] = [];
    if (filter.keyword) {
      where.push('(title LIKE ? OR summary LIKE ? OR content LIKE ? OR tags LIKE ?)');
      const kw = `%${filter.keyword}%`;
      params.push(kw, kw, kw, kw);
    }
    if (filter.categoryId !== undefined && filter.categoryId !== null) {
      where.push('category_id = ?');
      params.push(filter.categoryId);
    }
    if (filter.status) {
      where.push('status = ?');
      params.push(filter.status);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';
    const row = await this.db.getFirstAsync<{ c: number }>(
      `SELECT COUNT(*) as c FROM notes ${whereClause};`,
      params,
    );
    return row?.c ?? 0;
  }

  /**
   * 更新笔记（含素材，事务：先删旧素材再写新素材）。
   */
  async update(note: Note): Promise<void> {
    const updatedAt = Date.now();
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(
        `UPDATE notes SET title = ?, summary = ?, content = ?, key_points = ?, tags = ?,
         category_id = ?, status = ?, updated_at = ? WHERE id = ?;`,
        [
          note.title,
          note.summary,
          note.content,
          JSON.stringify(note.keyPoints ?? []),
          JSON.stringify(note.tags ?? []),
          note.categoryId ?? null,
          note.status,
          updatedAt,
          note.id,
        ],
      );
      // 素材全量替换
      await this.db.runAsync(`DELETE FROM materials WHERE note_id = ?;`, [note.id]);
      for (const m of note.materials ?? []) {
        await this.db.runAsync(
          `INSERT INTO materials (id, note_id, type, content, transcript, ocr_text, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?);`,
          [
            m.id || generateId(),
            note.id,
            m.type,
            m.content,
            m.transcript ?? null,
            m.ocrText ?? null,
            m.createdAt || Date.now(),
          ],
        );
      }
    });
    logger.debug('Note updated:', note.id);
  }

  /**
   * 删除笔记（含级联素材，通过事务）。
   */
  async delete(id: string): Promise<void> {
    await this.db.withTransactionAsync(async () => {
      await this.db.runAsync(`DELETE FROM materials WHERE note_id = ?;`, [id]);
      await this.db.runAsync(`DELETE FROM notes WHERE id = ?;`, [id]);
    });
    logger.debug('Note deleted:', id);
  }

  /**
   * 搜索笔记（标题/摘要/内容/标签）。
   */
  async search(keyword: string): Promise<Note[]> {
    return this.findAll({ keyword });
  }

  /**
   * 拉取某笔记的素材。
   */
  private async fetchMaterials(noteId: string): Promise<Material[]> {
    const rows = await this.db.getAllAsync<MaterialRow>(
      `SELECT * FROM materials WHERE note_id = ? ORDER BY created_at ASC;`,
      [noteId],
    );
    return rows.map(mapMaterialRow);
  }

  /**
   * 解析排序字段。
   */
  private resolveSort(sortOrder: SortOrder): { field: string; desc: boolean } {
    switch (sortOrder) {
      case 'updated_asc':
        return { field: 'updated_at', desc: false };
      case 'created_desc':
        return { field: 'created_at', desc: true };
      case 'created_asc':
        return { field: 'created_at', desc: false };
      case 'updated_desc':
      default:
        return { field: 'updated_at', desc: true };
    }
  }
}

/** 单例 */
export const noteRepository = new NoteRepository();
