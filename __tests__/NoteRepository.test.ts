/**
 * @file __tests__/NoteRepository.test.ts
 * @description 测试 src/services/db/NoteRepository.ts。
 *              重点测试 mapNoteRow/mapMaterialRow 数据映射（snake_case ↔ camelCase、JSON ↔ 数组），
 *              以及 create/findById/findAll/update/delete 的 mock db 行为。
 */
import {
  NoteRepository,
  mapNoteRow,
  mapMaterialRow,
  type NoteRow,
  type MaterialRow,
} from '../src/services/db/NoteRepository';
import type { Note, Material, SortOrder } from '../src/types';

/**
 * 构造 mock SQLiteDatabase。
 * 各方法返回值可通过 setXxx 动态控制。
 */
function createMockDb() {
  const db = {
    runAsync: jest.fn().mockResolvedValue({ changes: 1, lastInsertRowid: 1 }),
    getFirstAsync: jest.fn().mockResolvedValue(null),
    getAllAsync: jest.fn().mockResolvedValue([]),
    execAsync: jest.fn().mockResolvedValue(undefined),
    withTransactionAsync: jest.fn(async (fn: () => Promise<void>) => fn()),
    closeAsync: jest.fn().mockResolvedValue(undefined),
  };
  return db;
}

describe('services/db/NoteRepository - 数据映射', () => {
  describe('mapNoteRow', () => {
    it('应正确映射 snake_case → camelCase', () => {
      const row: NoteRow = {
        id: 'n1',
        title: '标题',
        summary: '摘要',
        content: '正文',
        key_points: '["要点1","要点2"]',
        tags: '["标签A","标签B"]',
        category_id: 'cat1',
        status: 'completed',
        created_at: 1700000000000,
        updated_at: 1700000001000,
      };
      const note = mapNoteRow(row);
      expect(note.id).toBe('n1');
      expect(note.title).toBe('标题');
      expect(note.keyPoints).toEqual(['要点1', '要点2']);
      expect(note.tags).toEqual(['标签A', '标签B']);
      expect(note.categoryId).toBe('cat1');
      expect(note.status).toBe('completed');
      expect(note.createdAt).toBe(1700000000000);
      expect(note.updatedAt).toBe(1700000001000);
    });

    it('key_points 为空字符串应返回空数组', () => {
      const row: NoteRow = {
        id: 'n1', title: '', summary: '', content: '',
        key_points: '', tags: '', category_id: null,
        status: 'draft', created_at: 0, updated_at: 0,
      };
      expect(mapNoteRow(row).keyPoints).toEqual([]);
    });

    it('key_points 为 null 应返回空数组', () => {
      const row: NoteRow = {
        id: 'n1', title: '', summary: '', content: '',
        key_points: null as unknown as string, tags: '[]', category_id: null,
        status: 'draft', created_at: 0, updated_at: 0,
      };
      expect(mapNoteRow(row).keyPoints).toEqual([]);
    });

    it('key_points 为损坏 JSON 应返回空数组', () => {
      const row: NoteRow = {
        id: 'n1', title: '', summary: '', content: '',
        key_points: 'not-json', tags: '[]', category_id: null,
        status: 'draft', created_at: 0, updated_at: 0,
      };
      expect(mapNoteRow(row).keyPoints).toEqual([]);
    });

    it('key_points 为非数组 JSON 应返回空数组', () => {
      const row: NoteRow = {
        id: 'n1', title: '', summary: '', content: '',
        key_points: '"string-not-array"', tags: '[]', category_id: null,
        status: 'draft', created_at: 0, updated_at: 0,
      };
      expect(mapNoteRow(row).keyPoints).toEqual([]);
    });

    it('tags 含数字元素应转为字符串数组', () => {
      const row: NoteRow = {
        id: 'n1', title: '', summary: '', content: '',
        key_points: '[1, 2, 3]', tags: '[]', category_id: null,
        status: 'draft', created_at: 0, updated_at: 0,
      };
      expect(mapNoteRow(row).keyPoints).toEqual(['1', '2', '3']);
    });

    it('category_id 为 null 应保持 null', () => {
      const row: NoteRow = {
        id: 'n1', title: '', summary: '', content: '',
        key_points: '[]', tags: '[]', category_id: null,
        status: 'completed', created_at: 0, updated_at: 0,
      };
      expect(mapNoteRow(row).categoryId).toBeNull();
    });
  });

  describe('mapMaterialRow', () => {
    it('应正确映射并转换 null → undefined', () => {
      const row: MaterialRow = {
        id: 'm1',
        note_id: 'n1',
        type: 'audio',
        content: 'file:///a.m4a',
        transcript: '转写文本',
        ocr_text: null,
        created_at: 100,
      };
      const mat = mapMaterialRow(row);
      expect(mat.id).toBe('m1');
      expect(mat.noteId).toBe('n1');
      expect(mat.type).toBe('audio');
      expect(mat.transcript).toBe('转写文本');
      expect(mat.ocrText).toBeUndefined();
      expect(mat.createdAt).toBe(100);
    });

    it('transcript 为 null 应转为 undefined', () => {
      const row: MaterialRow = {
        id: 'm1', note_id: 'n1', type: 'text', content: '文本',
        transcript: null, ocr_text: null, created_at: 0,
      };
      const mat = mapMaterialRow(row);
      expect(mat.transcript).toBeUndefined();
      expect(mat.ocrText).toBeUndefined();
    });
  });
});

describe('services/db/NoteRepository - CRUD', () => {
  let repo: NoteRepository;
  let db: ReturnType<typeof createMockDb>;

  beforeEach(() => {
    db = createMockDb();
    repo = new NoteRepository(db);
  });

  describe('findById', () => {
    it('找到笔记应返回含素材的 Note', async () => {
      const noteRow: NoteRow = {
        id: 'n1', title: 'T', summary: 'S', content: 'C',
        key_points: '["k"]', tags: '["t"]', category_id: null,
        status: 'completed', created_at: 1, updated_at: 2,
      };
      const matRow: MaterialRow = {
        id: 'm1', note_id: 'n1', type: 'text', content: '文本',
        transcript: null, ocr_text: null, created_at: 1,
      };
      db.getFirstAsync.mockResolvedValueOnce(noteRow);
      db.getAllAsync.mockResolvedValueOnce([matRow]);

      const note = await repo.findById('n1');
      expect(note).not.toBeNull();
      expect(note!.id).toBe('n1');
      expect(note!.keyPoints).toEqual(['k']);
      expect(note!.materials).toHaveLength(1);
      expect(note!.materials[0].content).toBe('文本');
    });

    it('未找到应返回 null', async () => {
      db.getFirstAsync.mockResolvedValueOnce(null);
      const note = await repo.findById('nonexistent');
      expect(note).toBeNull();
    });

    it('SQL 应按 id 查询', async () => {
      db.getFirstAsync.mockResolvedValueOnce(null);
      await repo.findById('n1');
      const sql = db.getFirstAsync.mock.calls[0][0];
      expect(sql).toContain('WHERE id = ?');
    });
  });

  describe('create', () => {
    it('应事务写入 notes 和 materials，并回查返回', async () => {
      const noteRow: NoteRow = {
        id: 'new-id', title: '新笔记', summary: '', content: 'c',
        key_points: '[]', tags: '[]', category_id: null,
        status: 'completed', created_at: 100, updated_at: 100,
      };
      db.getFirstAsync.mockResolvedValueOnce(noteRow); // findById 回查
      db.getAllAsync.mockResolvedValueOnce([]); // fetchMaterials

      const note: Note = {
        id: '',
        title: '新笔记',
        summary: '',
        content: 'c',
        keyPoints: [],
        tags: [],
        categoryId: null,
        status: 'completed',
        materials: [
          { id: 'm1', noteId: '', type: 'image', content: 'file:///a.png', createdAt: 1 },
        ],
        createdAt: 0,
        updatedAt: 0,
      };

      const created = await repo.create(note);
      expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
      // notes INSERT + 1 material INSERT = 2 次 runAsync
      expect(db.runAsync).toHaveBeenCalledTimes(2);
      expect(created.id).toBe('new-id');
    });

    it('回查返回 null 时应返回兜底对象', async () => {
      db.getFirstAsync.mockResolvedValueOnce(null);
      db.getAllAsync.mockResolvedValueOnce([]);

      const note: Note = {
        id: 'x', title: 't', summary: '', content: 'c', keyPoints: [], tags: [],
        categoryId: null, status: 'completed', materials: [], createdAt: 0, updatedAt: 0,
      };
      const created = await repo.create(note);
      expect(created.id).toBe('x');
      expect(created.title).toBe('t');
    });

    it('keyPoints/tags 应被 JSON.stringify 写入', async () => {
      db.getFirstAsync.mockResolvedValueOnce(null);
      db.getAllAsync.mockResolvedValueOnce([]);
      const note: Note = {
        id: 'n1', title: 't', summary: '', content: 'c',
        keyPoints: ['a', 'b'], tags: ['x'], categoryId: null,
        status: 'completed', materials: [], createdAt: 0, updatedAt: 0,
      };
      await repo.create(note);
      const insertCall = db.runAsync.mock.calls[0];
      const params = insertCall[1];
      expect(params[4]).toBe(JSON.stringify(['a', 'b'])); // key_points
      expect(params[5]).toBe(JSON.stringify(['x'])); // tags
    });
  });

  describe('findAll', () => {
    it('无筛选应查询全部并按 updated_at DESC 排序', async () => {
      db.getAllAsync.mockResolvedValueOnce([
        { id: 'n1', title: 't1', summary: '', content: '', key_points: '[]', tags: '[]', category_id: null, status: 'completed', created_at: 1, updated_at: 2 },
      ]);
      db.getAllAsync.mockResolvedValueOnce([]); // fetchMaterials
      const notes = await repo.findAll({}, 'updated_desc');
      expect(notes).toHaveLength(1);
      const sql = db.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('ORDER BY updated_at DESC');
      expect(sql).not.toContain('WHERE');
    });

    it.each([
      ['updated_asc', 'updated_at', 'ASC'],
      ['created_desc', 'created_at', 'DESC'],
      ['created_asc', 'created_at', 'ASC'],
    ] as [SortOrder, string, string][])('排序 %s 应生成 ORDER BY %s %s', async (order, field, dir) => {
      db.getAllAsync.mockResolvedValueOnce([]);
      await repo.findAll({}, order);
      const sql = db.getAllAsync.mock.calls[0][0];
      expect(sql).toContain(`ORDER BY ${field} ${dir}`);
    });

    it('keyword 筛选应生成 LIKE 条件', async () => {
      db.getAllAsync.mockResolvedValueOnce([]);
      await repo.findAll({ keyword: '搜索词' });
      const sql = db.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('WHERE');
      expect(sql).toContain('LIKE');
      const params = db.getAllAsync.mock.calls[0][1];
      expect(params).toContain('%搜索词%');
    });

    it('categoryId 筛选应生成 category_id = ?', async () => {
      db.getAllAsync.mockResolvedValueOnce([]);
      await repo.findAll({ categoryId: 'cat1' });
      const sql = db.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('category_id = ?');
    });

    it('status 筛选应生成 status = ?', async () => {
      db.getAllAsync.mockResolvedValueOnce([]);
      await repo.findAll({ status: 'draft' });
      const sql = db.getAllAsync.mock.calls[0][0];
      expect(sql).toContain('status = ?');
    });

    it('组合筛选应用 AND 连接', async () => {
      db.getAllAsync.mockResolvedValueOnce([]);
      await repo.findAll({ keyword: 'kw', categoryId: 'c1', status: 'completed' });
      const sql = db.getAllAsync.mock.calls[0][0];
      expect((sql.match(/AND/g) || []).length).toBeGreaterThanOrEqual(2);
    });

    it('结果应含 join 的素材', async () => {
      db.getAllAsync.mockResolvedValueOnce([
        { id: 'n1', title: 't', summary: '', content: '', key_points: '[]', tags: '[]', category_id: null, status: 'completed', created_at: 1, updated_at: 1 },
      ]);
      db.getAllAsync.mockResolvedValueOnce([
        { id: 'm1', note_id: 'n1', type: 'text', content: '文本', transcript: null, ocr_text: null, created_at: 1 },
      ]);
      const notes = await repo.findAll({});
      expect(notes[0].materials).toHaveLength(1);
    });
  });

  describe('count', () => {
    it('应返回计数', async () => {
      db.getFirstAsync.mockResolvedValueOnce({ c: 42 });
      const n = await repo.count({ keyword: 'x' });
      expect(n).toBe(42);
      const sql = db.getFirstAsync.mock.calls[0][0];
      expect(sql).toContain('COUNT(*)');
    });

    it('无行应返回 0', async () => {
      db.getFirstAsync.mockResolvedValueOnce(null);
      const n = await repo.count();
      expect(n).toBe(0);
    });
  });

  describe('update', () => {
    it('应事务更新 notes 并全量替换 materials', async () => {
      const note: Note = {
        id: 'n1', title: '更新', summary: 's', content: 'c',
        keyPoints: ['k'], tags: ['t'], categoryId: 'cat1',
        status: 'completed', materials: [
          { id: '', noteId: 'n1', type: 'text', content: '新文本', createdAt: 1 },
        ], createdAt: 1, updatedAt: 1,
      };
      await repo.update(note);
      expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
      // 1 UPDATE + 1 DELETE + 1 INSERT
      expect(db.runAsync).toHaveBeenCalledTimes(3);
      // 验证 DELETE materials
      const deleteCall = db.runAsync.mock.calls[1];
      expect(deleteCall[0]).toContain('DELETE FROM materials');
    });
  });

  describe('delete', () => {
    it('应事务删除 materials 和 notes', async () => {
      await repo.delete('n1');
      expect(db.withTransactionAsync).toHaveBeenCalledTimes(1);
      expect(db.runAsync).toHaveBeenCalledTimes(2);
      const calls = db.runAsync.mock.calls.map((c) => c[0]);
      expect(calls.some((s) => s.includes('DELETE FROM materials'))).toBe(true);
      expect(calls.some((s) => s.includes('DELETE FROM notes'))).toBe(true);
    });
  });

  describe('search', () => {
    it('应委托 findAll 并传入 keyword', async () => {
      const spy = jest.spyOn(repo, 'findAll').mockResolvedValueOnce([]);
      await repo.search('关键词');
      expect(spy).toHaveBeenCalledWith({ keyword: '关键词' });
      spy.mockRestore();
    });
  });
});
