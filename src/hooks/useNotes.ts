/**
 * @file hooks/useNotes.ts
 * @description 笔记列表操作 Hook：加载、搜索、筛选、删除。
 *              封装 noteStore 的常用操作，提供便捷接口。
 */

import { useCallback, useEffect } from 'react';
import { useNoteStore } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import type { NoteFilter, SortOrder } from '../types';

/**
 * 笔记列表 Hook。
 */
export function useNotes() {
  const notes = useNoteStore((s) => s.notes);
  const categories = useNoteStore((s) => s.categories);
  const filter = useNoteStore((s) => s.filter);
  const sortOrder = useNoteStore((s) => s.sortOrder);
  const loading = useNoteStore((s) => s.loading);
  const refreshing = useNoteStore((s) => s.refreshing);
  const error = useNoteStore((s) => s.error);

  const loadNotes = useNoteStore((s) => s.loadNotes);
  const refresh = useNoteStore((s) => s.refresh);
  const setFilter = useNoteStore((s) => s.setFilter);
  const setSortOrder = useNoteStore((s) => s.setSortOrder);
  const search = useNoteStore((s) => s.search);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const loadCategories = useNoteStore((s) => s.loadCategories);
  const showToast = useUiStore((s) => s.showToast);

  // 初始加载
  useEffect(() => {
    loadNotes();
    loadCategories();
  }, [loadNotes, loadCategories]);

  const handleSearch = useCallback(
    (keyword: string) => {
      search(keyword);
    },
    [search],
  );

  const handleFilter = useCallback(
    (next: Partial<NoteFilter>) => {
      setFilter(next);
    },
    [setFilter],
  );

  const handleSort = useCallback(
    (order: SortOrder) => {
      setSortOrder(order);
    },
    [setSortOrder],
  );

  const handleDelete = useCallback(
    async (id: string) => {
      try {
        await deleteNote(id);
        showToast({ type: 'success', message: '已删除' });
      } catch {
        showToast({ type: 'error', message: '删除失败' });
      }
    },
    [deleteNote, showToast],
  );

  return {
    notes,
    categories,
    filter,
    sortOrder,
    loading,
    refreshing,
    error,
    loadNotes,
    refresh,
    search: handleSearch,
    setFilter: handleFilter,
    setSortOrder: handleSort,
    deleteNote: handleDelete,
  };
}

export default useNotes;
