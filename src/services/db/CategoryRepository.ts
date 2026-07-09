/**
 * @file services/db/CategoryRepository.ts
 * @description 分类 CRUD。
 */

import { getDatabase, type SQLiteDatabase } from './database';
import type { Category } from '../../types';
import { generateId } from '../../utils/id';
import logger from '../../utils/logger';

/** categories 行类型 */
export interface CategoryRow {
  id: string;
  name: string;
  color: string;
  sort_order: number;
  created_at: number;
}

/**
 * CategoryRow → Category。
 */
function mapCategoryRow(row: CategoryRow): Category {
  return {
    id: row.id,
    name: row.name,
    color: row.color,
    sortOrder: row.sort_order,
    createdAt: row.created_at,
  };
}

/**
 * 分类仓储。
 */
export class CategoryRepository {
  private db: SQLiteDatabase;

  constructor(db?: SQLiteDatabase) {
    this.db = db ?? getDatabase();
  }

  /**
   * 查询全部分类（按 sortOrder 排序）。
   */
  async findAll(): Promise<Category[]> {
    const rows = await this.db.getAllAsync<CategoryRow>(
      `SELECT * FROM categories ORDER BY sort_order ASC, created_at ASC;`,
    );
    return rows.map(mapCategoryRow);
  }

  /**
   * 创建分类。
   */
  async create(name: string, color: string, sortOrder?: number): Promise<Category> {
    const id = generateId();
    const now = Date.now();
    const order = sortOrder ?? (await this.nextSortOrder());
    await this.db.runAsync(
      `INSERT INTO categories (id, name, color, sort_order, created_at) VALUES (?, ?, ?, ?, ?);`,
      [id, name, color, order, now],
    );
    logger.debug('Category created:', id, name);
    return { id, name, color, sortOrder: order, createdAt: now };
  }

  /**
   * 更新分类名称/颜色。
   */
  async update(id: string, name: string, color: string): Promise<void> {
    await this.db.runAsync(
      `UPDATE categories SET name = ?, color = ? WHERE id = ?;`,
      [name, color, id],
    );
  }

  /**
   * 删除分类（关联笔记的 category_id 由外键 ON DELETE SET NULL 自动置空）。
   */
  async delete(id: string): Promise<void> {
    await this.db.runAsync(`DELETE FROM categories WHERE id = ?;`, [id]);
    logger.debug('Category deleted:', id);
  }

  /**
   * 下一个 sortOrder。
   */
  private async nextSortOrder(): Promise<number> {
    const row = await this.db.getFirstAsync<{ m: number }>(
      `SELECT COALESCE(MAX(sort_order), -1) as m FROM categories;`,
    );
    return (row?.m ?? -1) + 1;
  }
}

/** 单例 */
export const categoryRepository = new CategoryRepository();
