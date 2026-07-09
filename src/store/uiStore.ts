/**
 * @file store/uiStore.ts
 * @description 全局 UI 状态：全局 loading、toast、系统主题、键盘等。
 */

import { create } from 'zustand';
import { Appearance } from 'react-native';
import logger from '../utils/logger';

/** Toast 类型 */
export type ToastType = 'success' | 'error' | 'info' | 'warning';

/** Toast 载荷 */
export interface ToastPayload {
  type: ToastType;
  message: string;
  duration?: number;
}

interface UiState {
  /** 全局 loading 遮罩 */
  globalLoading: boolean;
  loadingText: string;
  /** Toast */
  toast: ToastPayload | null;
  /** 系统颜色方案（light/dark） */
  systemColorScheme: 'light' | 'dark' | null;
  /** 创建笔记的草稿素材（跨页面传递） */
  draftText: string;
  draftImages: string[];
  draftAudios: string[];

  showLoading: (text?: string) => void;
  hideLoading: () => void;
  showToast: (toast: ToastPayload) => void;
  clearToast: () => void;
  setSystemColorScheme: (scheme: 'light' | 'dark' | null) => void;
  setDraft: (data: { text?: string; images?: string[]; audios?: string[] }) => void;
  clearDraft: () => void;
}

export const useUiStore = create<UiState>((set) => ({
  globalLoading: false,
  loadingText: '',
  toast: null,
  systemColorScheme: (Appearance.getColorScheme() ?? 'light') as 'light' | 'dark',
  draftText: '',
  draftImages: [],
  draftAudios: [],

  showLoading: (text = '加载中…') => set({ globalLoading: true, loadingText: text }),
  hideLoading: () => set({ globalLoading: false, loadingText: '' }),

  showToast: (toast) => {
    set({ toast });
    const duration = toast.duration ?? 2500;
    setTimeout(() => {
      set({ toast: null });
    }, duration);
  },
  clearToast: () => set({ toast: null }),

  setSystemColorScheme: (scheme) => set({ systemColorScheme: scheme }),

  setDraft: (data) =>
    set((state) => ({
      draftText: data.text ?? state.draftText,
      draftImages: data.images ?? state.draftImages,
      draftAudios: data.audios ?? state.draftAudios,
    })),
  clearDraft: () => set({ draftText: '', draftImages: [], draftAudios: [] }),
}));

/**
 * 监听系统主题变化（在 App 启动时调用一次）。
 */
export function initSystemThemeListener(): () => void {
  const sub = Appearance.addChangeListener(({ colorScheme }) => {
    logger.info('System color scheme changed:', colorScheme);
    useUiStore.getState().setSystemColorScheme(colorScheme ?? 'light');
  });
  return () => sub.remove();
}
