/**
 * @file store/noteStore.ts
 * @description 笔记状态管理：列表、当前笔记、筛选排序、CRUD 操作。
 */

import { create } from 'zustand';
import type { Note, NoteFilter, SortOrder, Category, NoteStatus, AppError } from '../types';
import { noteRepository } from '../services/db/NoteRepository';
import { categoryRepository } from '../services/db/CategoryRepository';
import { FileService } from '../services/storage/FileService';
import logger from '../utils/logger';

interface NoteState {
  /** 笔记列表 */
  notes: Note[];
  /** 当前查看/编辑的笔记 */
  currentNote: Note | null;
  /** 分类列表 */
  categories: Category[];
  /** 筛选条件 */
  filter: NoteFilter;
  /** 排序方式 */
  sortOrder: SortOrder;
  /** 加载态 */
  loading: boolean;
  refreshing: boolean;
  /** 错误信息 */
  error: string | null;

  /** 加载笔记列表 */
  loadNotes: (resetFilter?: boolean) => Promise<void>;
  /** 刷新（下拉） */
  refresh: () => Promise<void>;
  /** 设置筛选 */
  setFilter: (filter: Partial<NoteFilter>) => Promise<void>;
  /** 设置排序 */
  setSortOrder: (order: SortOrder) => Promise<void>;
  /** 搜索 */
  search: (keyword: string) => Promise<void>;
  /** 获取单条笔记详情 */
  loadNote: (id: string) => Promise<Note | null>;
  /** 保存笔记（创建或更新） */
  saveNote: (note: Note) => Promise<Note>;
  /** 删除笔记 */
  deleteNote: (id: string) => Promise<void>;
  /** 清空当前笔记 */
  clearCurrent: () => void;

  /** 加载分类 */
  loadCategories: () => Promise<void>;
  /** 创建分类 */
  addCategory: (name: string, color: string) => Promise<Category>;
  /** 删除分类 */
  removeCategory: (id: string) => Promise<void>;
  /** 更新分类 */
  updateCategory: (id: string, name: string, color: string) => Promise<void>;
}

export const useNoteStore = create<NoteState>((set, get) => ({
  notes: [],
  currentNote: null,
  categories: [],
  filter: {},
  sortOrder: 'updated_desc',
  loading: false,
  refreshing: false,
  error: null,

  loadNotes: async () => {
    set({ loading: true, error: null });
    try {
      const { filter, sortOrder } = get();
      const notes = await noteRepository.findAll(filter, sortOrder);
      set({ notes, loading: false });
    } catch (err) {
      logger.error('loadNotes failed', err);
      set({ loading: false, error: (err as AppError)?.message || '加载失败' });
    }
  },

  refresh: async () => {
    set({ refreshing: true });
    await get().loadNotes();
    set({ refreshing: false });
  },

  setFilter: async (partial) => {
    const filter = { ...get().filter, ...partial };
    set({ filter });
    await get().loadNotes();
  },

  setSortOrder: async (order) => {
    set({ sortOrder: order });
    await get().loadNotes();
  },

  search: async (keyword) => {
    await get().setFilter({ keyword: keyword || undefined });
  },

  loadNote: async (id) => {
    try {
      const note = await noteRepository.findById(id);
      set({ currentNote: note });
      return note;
    } catch (err) {
      logger.error('loadNote failed', err);
      set({ error: (err as AppError)?.message || '加载失败' });
      return null;
    }
  },

  saveNote: async (note) => {
    const existing = await noteRepository.findById(note.id);
    if (existing) {
      await noteRepository.update(note);
    } else {
      await noteRepository.create(note);
    }
    await get().loadNotes();
    return note;
  },

  deleteNote: async (id) => {
    try {
      // 清理关联文件
      const note = await noteRepository.findById(id);
      if (note) {
        for (const m of note.materials) {
          if (m.type === 'image' || m.type === 'audio') {
            await FileService.deleteFile(m.content);
          }
        }
      }
      await noteRepository.delete(id);
      set((state) => ({
        notes: state.notes.filter((n) => n.id !== id),
        currentNote: state.currentNote?.id === id ? null : state.currentNote,
      }));
      logger.info('Note deleted:', id);
    } catch (err) {
      logger.error('deleteNote failed', err);
      throw err;
    }
  },

  clearCurrent: () => set({ currentNote: null }),

  loadCategories: async () => {
    try {
      const categories = await categoryRepository.findAll();
      set({ categories });
    } catch (err) {
      logger.error('loadCategories failed', err);
    }
  },

  addCategory: async (name, color) => {
    const cat = await categoryRepository.create(name, color);
    await get().loadCategories();
    return cat;
  },

  removeCategory: async (id) => {
    await categoryRepository.delete(id);
    await get().loadCategories();
    await get().loadNotes();
  },

  updateCategory: async (id, name, color) => {
    await categoryRepository.update(id, name, color);
    await get().loadCategories();
  },
}));

/**
 * 工具：根据分类 ID 获取分类对象。
 */
export function getCategoryById(categories: Category[], id: string | null): Category | null {
  if (!id) return null;
  return categories.find((c) => c.id === id) ?? null;
}

/**
 * 工具：构造空笔记（草稿）。
 */
export function createEmptyNote(status: NoteStatus = 'completed'): Note {
  const now = Date.now();
  return {
    id: '',
    title: '',
    summary: '',
    keyPoints: [],
    content: '',
    tags: [],
    categoryId: null,
    status,
    materials: [],
    createdAt: now,
    updatedAt: now,
  };
}
