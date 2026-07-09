/**
 * @file __tests__/noteStore.test.ts
 * @description 测试 src/store/noteStore.ts 状态管理逻辑。
 *              mock noteRepository / categoryRepository / FileService，通过 useNoteStore.getState() 调用 actions。
 */
import { useNoteStore, getCategoryById, createEmptyNote } from '../src/store/noteStore';
import type { Note, Category, AppError } from '../src/types';

// mock NoteRepository 单例 —— mock 对象在工厂内部定义，避免 TDZ
jest.mock('../src/services/db/NoteRepository', () => {
  const noteRepository = {
    findAll: jest.fn(),
    findById: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
    search: jest.fn(),
  };
  return { noteRepository, NoteRepository: jest.fn(), __esModule: true };
});

// mock CategoryRepository 单例
jest.mock('../src/services/db/CategoryRepository', () => {
  const categoryRepository = {
    findAll: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  };
  return { categoryRepository, CategoryRepository: jest.fn(), __esModule: true };
});

// mock FileService
jest.mock('../src/services/storage/FileService', () => {
  const FileService = { deleteFile: jest.fn() };
  return { FileService, __esModule: true };
});

import { noteRepository } from '../src/services/db/NoteRepository';
import { categoryRepository } from '../src/services/db/CategoryRepository';
import { FileService } from '../src/services/storage/FileService';

const mockNoteRepo = noteRepository as unknown as {
  findAll: jest.Mock;
  findById: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  search: jest.Mock;
};
const mockCategoryRepo = categoryRepository as unknown as {
  findAll: jest.Mock;
  create: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
};
const mockFileService = FileService as unknown as { deleteFile: jest.Mock };

// 等待 microtask（zustand set 是同步的，但 actions 是 async）
const flush = () => Promise.resolve();

function makeNote(overrides: Partial<Note> = {}): Note {
  return {
    id: 'n1',
    title: '标题',
    summary: '摘要',
    keyPoints: ['要点'],
    content: '正文',
    tags: ['标签'],
    categoryId: null,
    status: 'completed',
    materials: [],
    createdAt: 1000,
    updatedAt: 2000,
    ...overrides,
  };
}

describe('store/noteStore', () => {
  beforeEach(() => {
    // 重置 store 状态
    useNoteStore.setState({
      notes: [],
      currentNote: null,
      categories: [],
      filter: {},
      sortOrder: 'updated_desc',
      loading: false,
      refreshing: false,
      error: null,
    });
    jest.clearAllMocks();
  });

  describe('loadNotes', () => {
    it('应加载笔记列表并清除 loading', async () => {
      const notes = [makeNote({ id: 'n1' }), makeNote({ id: 'n2' })];
      mockNoteRepo.findAll.mockResolvedValue(notes);

      await useNoteStore.getState().loadNotes();

      const state = useNoteStore.getState();
      expect(state.notes).toEqual(notes);
      expect(state.loading).toBe(false);
      expect(state.error).toBeNull();
      expect(mockNoteRepo.findAll).toHaveBeenCalledWith({}, 'updated_desc');
    });

    it('应使用当前 filter 和 sortOrder 查询', async () => {
      useNoteStore.setState({ filter: { keyword: '搜索' }, sortOrder: 'created_desc' });
      mockNoteRepo.findAll.mockResolvedValue([]);

      await useNoteStore.getState().loadNotes();

      expect(mockNoteRepo.findAll).toHaveBeenCalledWith({ keyword: '搜索' }, 'created_desc');
    });

    it('加载失败应设置 error 并清除 loading', async () => {
      const appError: AppError = { code: 'DB_ERROR', message: '数据库错误' };
      mockNoteRepo.findAll.mockRejectedValue(appError);

      await useNoteStore.getState().loadNotes();

      const state = useNoteStore.getState();
      expect(state.loading).toBe(false);
      expect(state.error).toBe('数据库错误');
    });

    it('加载失败（Error 带 message）应使用其 message', async () => {
      mockNoteRepo.findAll.mockRejectedValue(new Error('boom'));
      await useNoteStore.getState().loadNotes();
      expect(useNoteStore.getState().error).toBe('boom');
    });

    it('加载失败（无 message 的错误）应使用默认错误信息', async () => {
      // 无 message 属性的对象 → 走兜底 '加载失败'
      mockNoteRepo.findAll.mockRejectedValue({ code: 'X' });
      await useNoteStore.getState().loadNotes();
      expect(useNoteStore.getState().error).toBe('加载失败');
    });
  });

  describe('refresh', () => {
    it('应设置 refreshing 并重新加载', async () => {
      mockNoteRepo.findAll.mockResolvedValue([]);
      const promise = useNoteStore.getState().refresh();
      expect(useNoteStore.getState().refreshing).toBe(true);
      await promise;
      expect(useNoteStore.getState().refreshing).toBe(false);
    });
  });

  describe('setFilter', () => {
    it('应合并 filter 并重新加载', async () => {
      useNoteStore.setState({ filter: { keyword: '旧' } });
      mockNoteRepo.findAll.mockResolvedValue([]);

      await useNoteStore.getState().setFilter({ categoryId: 'cat1' });

      expect(useNoteStore.getState().filter).toEqual({ keyword: '旧', categoryId: 'cat1' });
      expect(mockNoteRepo.findAll).toHaveBeenCalled();
    });
  });

  describe('setSortOrder', () => {
    it('应更新排序并重新加载', async () => {
      mockNoteRepo.findAll.mockResolvedValue([]);
      await useNoteStore.getState().setSortOrder('created_asc');
      expect(useNoteStore.getState().sortOrder).toBe('created_asc');
      expect(mockNoteRepo.findAll).toHaveBeenCalledWith({}, 'created_asc');
    });
  });

  describe('search', () => {
    it('应设置 keyword filter', async () => {
      mockNoteRepo.findAll.mockResolvedValue([]);
      await useNoteStore.getState().search('关键词');
      expect(useNoteStore.getState().filter.keyword).toBe('关键词');
    });

    it('空关键词应清除 keyword', async () => {
      useNoteStore.setState({ filter: { keyword: '旧词' } });
      mockNoteRepo.findAll.mockResolvedValue([]);
      await useNoteStore.getState().search('');
      expect(useNoteStore.getState().filter.keyword).toBeUndefined();
    });
  });

  describe('loadNote', () => {
    it('应设置 currentNote 并返回', async () => {
      const note = makeNote({ id: 'n1' });
      mockNoteRepo.findById.mockResolvedValue(note);

      const result = await useNoteStore.getState().loadNote('n1');

      expect(result).toEqual(note);
      expect(useNoteStore.getState().currentNote).toEqual(note);
    });

    it('未找到应设置 currentNote 为 null', async () => {
      mockNoteRepo.findById.mockResolvedValue(null);
      const result = await useNoteStore.getState().loadNote('nope');
      expect(result).toBeNull();
      expect(useNoteStore.getState().currentNote).toBeNull();
    });

    it('异常应返回 null 并设置 error', async () => {
      mockNoteRepo.findById.mockRejectedValue({ code: 'X', message: '失败' } as AppError);
      const result = await useNoteStore.getState().loadNote('n1');
      expect(result).toBeNull();
      expect(useNoteStore.getState().error).toBe('失败');
    });
  });

  describe('saveNote', () => {
    it('已存在笔记应调用 update', async () => {
      const note = makeNote({ id: 'n1' });
      mockNoteRepo.findById.mockResolvedValue(note); // existing
      mockNoteRepo.update.mockResolvedValue(undefined);
      mockNoteRepo.findAll.mockResolvedValue([note]);

      const saved = await useNoteStore.getState().saveNote(note);

      expect(mockNoteRepo.update).toHaveBeenCalledWith(note);
      expect(mockNoteRepo.create).not.toHaveBeenCalled();
      expect(saved).toEqual(note);
    });

    it('新笔记应调用 create', async () => {
      const note = makeNote({ id: 'new' });
      mockNoteRepo.findById.mockResolvedValue(null); // not existing
      mockNoteRepo.create.mockResolvedValue(note);
      mockNoteRepo.findAll.mockResolvedValue([note]);

      await useNoteStore.getState().saveNote(note);

      expect(mockNoteRepo.create).toHaveBeenCalledWith(note);
      expect(mockNoteRepo.update).not.toHaveBeenCalled();
    });

    it('保存后应重新加载列表', async () => {
      const note = makeNote({ id: 'n1' });
      mockNoteRepo.findById.mockResolvedValue(note);
      mockNoteRepo.update.mockResolvedValue(undefined);
      mockNoteRepo.findAll.mockResolvedValue([note]);

      await useNoteStore.getState().saveNote(note);
      expect(mockNoteRepo.findAll).toHaveBeenCalled();
    });
  });

  describe('deleteNote', () => {
    it('应删除笔记、清理文件并更新列表', async () => {
      const note = makeNote({
        id: 'n1',
        materials: [
          { id: 'm1', noteId: 'n1', type: 'image', content: 'file:///img.png', createdAt: 1 },
          { id: 'm2', noteId: 'n1', type: 'audio', content: 'file:///a.m4a', createdAt: 1 },
          { id: 'm3', noteId: 'n1', type: 'text', content: '文本', createdAt: 1 },
        ],
      });
      mockNoteRepo.findById.mockResolvedValue(note);
      mockNoteRepo.delete.mockResolvedValue(undefined);
      useNoteStore.setState({ notes: [note], currentNote: note });

      await useNoteStore.getState().deleteNote('n1');

      // 仅 image/audio 文件被清理，text 不清理
      expect(mockFileService.deleteFile).toHaveBeenCalledTimes(2);
      expect(mockNoteRepo.delete).toHaveBeenCalledWith('n1');
      // 列表中该笔记应被移除
      expect(useNoteStore.getState().notes).toHaveLength(0);
      // currentNote 是被删的应置空
      expect(useNoteStore.getState().currentNote).toBeNull();
    });

    it('删除非当前笔记时 currentNote 应保留', async () => {
      const note = makeNote({ id: 'n1' });
      const other = makeNote({ id: 'n2' });
      mockNoteRepo.findById.mockResolvedValue(note);
      mockNoteRepo.delete.mockResolvedValue(undefined);
      useNoteStore.setState({ notes: [note, other], currentNote: other });

      await useNoteStore.getState().deleteNote('n1');

      expect(useNoteStore.getState().currentNote).toEqual(other);
    });

    it('删除失败应抛出异常', async () => {
      mockNoteRepo.findById.mockResolvedValue(null);
      mockNoteRepo.delete.mockRejectedValue(new Error('delete failed'));

      await expect(useNoteStore.getState().deleteNote('n1')).rejects.toThrow('delete failed');
    });
  });

  describe('clearCurrent', () => {
    it('应清空 currentNote', () => {
      useNoteStore.setState({ currentNote: makeNote() });
      useNoteStore.getState().clearCurrent();
      expect(useNoteStore.getState().currentNote).toBeNull();
    });
  });

  describe('分类管理', () => {
    it('loadCategories 应加载分类列表', async () => {
      const cats: Category[] = [
        { id: 'c1', name: '工作', color: '#fff', sortOrder: 0, createdAt: 1 },
      ];
      mockCategoryRepo.findAll.mockResolvedValue(cats);

      await useNoteStore.getState().loadCategories();

      expect(useNoteStore.getState().categories).toEqual(cats);
    });

    it('addCategory 应创建并重新加载', async () => {
      const cat: Category = { id: 'c1', name: '新分类', color: '#000', sortOrder: 0, createdAt: 1 };
      mockCategoryRepo.create.mockResolvedValue(cat);
      mockCategoryRepo.findAll.mockResolvedValue([cat]);

      const result = await useNoteStore.getState().addCategory('新分类', '#000');

      expect(mockCategoryRepo.create).toHaveBeenCalledWith('新分类', '#000');
      expect(result).toEqual(cat);
      expect(useNoteStore.getState().categories).toEqual([cat]);
    });

    it('removeCategory 应删除并重新加载分类和笔记', async () => {
      mockCategoryRepo.delete.mockResolvedValue(undefined);
      mockCategoryRepo.findAll.mockResolvedValue([]);
      mockNoteRepo.findAll.mockResolvedValue([]);

      await useNoteStore.getState().removeCategory('c1');

      expect(mockCategoryRepo.delete).toHaveBeenCalledWith('c1');
      expect(mockCategoryRepo.findAll).toHaveBeenCalled();
      expect(mockNoteRepo.findAll).toHaveBeenCalled();
    });

    it('updateCategory 应更新并重新加载分类', async () => {
      mockCategoryRepo.update.mockResolvedValue(undefined);
      mockCategoryRepo.findAll.mockResolvedValue([]);

      await useNoteStore.getState().updateCategory('c1', '新名', '#aaa');

      expect(mockCategoryRepo.update).toHaveBeenCalledWith('c1', '新名', '#aaa');
    });
  });

  describe('工具函数', () => {
    const categories: Category[] = [
      { id: 'c1', name: '工作', color: '#fff', sortOrder: 0, createdAt: 1 },
      { id: 'c2', name: '生活', color: '#000', sortOrder: 1, createdAt: 2 },
    ];

    describe('getCategoryById', () => {
      it('应返回匹配的分类', () => {
        expect(getCategoryById(categories, 'c1')?.name).toBe('工作');
      });

      it('未匹配应返回 null', () => {
        expect(getCategoryById(categories, 'nonexistent')).toBeNull();
      });

      it('id 为 null 应返回 null', () => {
        expect(getCategoryById(categories, null)).toBeNull();
      });
    });

    describe('createEmptyNote', () => {
      it('应创建空笔记（默认 completed）', () => {
        const note = createEmptyNote();
        expect(note.title).toBe('');
        expect(note.content).toBe('');
        expect(note.keyPoints).toEqual([]);
        expect(note.tags).toEqual([]);
        expect(note.materials).toEqual([]);
        expect(note.status).toBe('completed');
        expect(note.categoryId).toBeNull();
        expect(note.createdAt).toBe(note.updatedAt);
      });

      it('应支持指定 draft 状态', () => {
        const note = createEmptyNote('draft');
        expect(note.status).toBe('draft');
      });
    });
  });
});
