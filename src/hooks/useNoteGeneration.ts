/**
 * @file hooks/useNoteGeneration.ts
 * @description 笔记生成全流程 Hook：封装 AINoteService 调用，管理进度与取消。
 *              生成成功后落库并返回 noteId。
 */

import { useCallback, useRef, useState } from 'react';
import { AINoteService } from '../services/ai/AINoteService';
import { useSettingsStore } from '../store/settingsStore';
import { useNoteStore, createEmptyNote } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import type { GenerateNoteRequest, GenerationProgress, Note, Material, AppError } from '../types';
import { generateId } from '../utils/id';
import { FileService, APP_MEDIA_DIR } from '../services/storage/FileService';
import logger from '../utils/logger';

/**
 * 笔记生成 Hook。
 */
export function useNoteGeneration() {
  const [progress, setProgress] = useState<GenerationProgress>({
    phase: 'idle',
    message: '',
  });
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const serviceRef = useRef<AINoteService | null>(null);

  const setting = useSettingsStore((s) => s.setting);
  const llmApiKey = useSettingsStore((s) => s.llmApiKey);
  const asrApiKey = useSettingsStore((s) => s.asrApiKey);
  const saveNote = useNoteStore((s) => s.saveNote);
  const showToast = useUiStore((s) => s.showToast);

  /**
   * 触发生成。
   * @param request 生成请求
   * @returns 保存后的笔记 ID，失败返回 null
   */
  const generate = useCallback(
    async (request: GenerateNoteRequest): Promise<string | null> => {
      setError(null);
      setGenerating(true);
      setProgress({ phase: 'idle', message: '准备中…' });

      const service = new AINoteService();
      serviceRef.current = service;

      try {
        const { content, materials } = await service.generateNote(
          request,
          setting,
          { llmKey: llmApiKey, asrKey: asrApiKey || undefined },
          (p) => {
            setProgress(p);
          },
        );

        // 持久化素材文件（复制到 App 目录）
        const persistedMaterials: Material[] = [];
        for (const m of materials) {
          let contentUri = m.content;
          if ((m.type === 'image' || m.type === 'audio') && !contentUri.startsWith(APP_MEDIA_DIR)) {
            try {
              const fileName = `${m.type}_${generateId()}.${FileService.extractExtension(m.content) || (m.type === 'image' ? 'jpg' : 'm4a')}`;
              contentUri = await FileService.copyToAppDir(m.content, fileName);
            } catch (err) {
              logger.warn('copyToAppDir failed, keep original uri', err);
            }
          }
          persistedMaterials.push({ ...m, content: contentUri });
        }

        // 构造 Note 并落库
        const now = Date.now();
        const noteId = generateId();
        const note: Note = {
          ...createEmptyNote('completed'),
          id: noteId,
          title: content.title,
          summary: content.summary,
          keyPoints: content.keyPoints,
          content: content.content,
          tags: content.tags,
          status: 'completed',
          materials: persistedMaterials.map((m) => ({ ...m, noteId })),
          createdAt: now,
          updatedAt: now,
        };

        await saveNote(note);
        setGenerating(false);
        setProgress({ phase: 'done', message: '生成完成' });
        showToast({ type: 'success', message: '笔记已生成' });
        return noteId;
      } catch (err) {
        const appErr = err as AppError;
        logger.error('generateNote failed', appErr);
        const msg = appErr?.code === 'CANCELLED' ? '已取消生成' : appErr?.message || '生成失败';
        setError(msg);
        setGenerating(false);
        setProgress({ phase: 'error', message: msg });
        if (appErr?.code !== 'CANCELLED') {
          showToast({ type: 'error', message: msg });
        }
        return null;
      }
    },
    [setting, llmApiKey, asrApiKey, saveNote, showToast],
  );

  /**
   * 取消生成。
   */
  const cancel = useCallback(() => {
    serviceRef.current?.cancel();
  }, []);

  return {
    generate,
    cancel,
    progress,
    generating,
    error,
  };
}

export default useNoteGeneration;
