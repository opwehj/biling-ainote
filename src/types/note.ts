/**
 * @file types/note.ts
 * @description 笔记核心领域模型：Material / Note / Category 及相关枚举类型。
 *              数据库列 snake_case 与 TS 类型 PascalCase 由 Repository 转换。
 */

/** 素材类型：文本 / 图片 / 音频 */
export type MaterialType = 'text' | 'image' | 'audio';

/** 笔记状态：已完成 / 草稿 */
export type NoteStatus = 'completed' | 'draft';

/** 列表排序方式 */
export type SortOrder = 'updated_desc' | 'updated_asc' | 'created_desc' | 'created_asc';

/**
 * 素材：用户输入的原始内容。
 * - text 类型：content 为文本内容；
 * - image/audio 类型：content 为文件 URI。
 */
export interface Material {
  id: string;
  noteId: string;
  type: MaterialType;
  content: string;
  /** audio 的 ASR 转写结果 */
  transcript?: string;
  /** image 的 OCR 结果（预留，多模态识别后可回填） */
  ocrText?: string;
  createdAt: number;
}

/**
 * 笔记：AI 生成结果 + 关联素材。
 */
export interface Note {
  id: string;
  title: string;
  summary: string;
  keyPoints: string[];
  /** Markdown 正文 */
  content: string;
  tags: string[];
  categoryId: string | null;
  status: NoteStatus;
  /** 关联素材（查询时 join 回填） */
  materials: Material[];
  createdAt: number;
  updatedAt: number;
}

/**
 * 分类：用于对笔记分组。
 */
export interface Category {
  id: string;
  name: string;
  color: string;
  sortOrder: number;
  createdAt: number;
}

/**
 * 笔记列表筛选条件。
 */
export interface NoteFilter {
  keyword?: string;
  categoryId?: string | null;
  status?: NoteStatus;
}

/**
 * 笔记列表排序方向辅助映射。
 */
export const SORT_FIELD_MAP: Record<SortOrder, { field: 'createdAt' | 'updatedAt'; desc: boolean }> = {
  updated_desc: { field: 'updatedAt', desc: true },
  updated_asc: { field: 'updatedAt', desc: false },
  created_desc: { field: 'createdAt', desc: true },
  created_asc: { field: 'createdAt', desc: false },
};
