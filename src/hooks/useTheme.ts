/**
 * @file hooks/useTheme.ts
 * @description 主题响应 Hook。根据 settingsStore.themeMode 与系统主题解析当前主题。
 *              提供 ThemeContext 供组件消费。
 */

import React, { createContext, useContext } from 'react';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
import { lightTheme, darkTheme, type AppTheme } from '../constants/theme';
import type { ThemeMode } from '../types';

const ThemeContext = createContext<AppTheme>(lightTheme);

/**
 * 根据 themeMode 与系统暗色解析最终主题。
 */
export function resolveTheme(themeMode: ThemeMode, systemDark: boolean): AppTheme {
  if (themeMode === 'dark') return darkTheme;
  if (themeMode === 'light') return lightTheme;
  // system
  return systemDark ? darkTheme : lightTheme;
}

/**
 * 获取当前主题。
 */
export function useTheme(): AppTheme {
  return useContext(ThemeContext);
}

/**
 * 主题 Provider（在 App.tsx 中使用，提供 ThemeContext）。
 */
export function ThemeProvider({ children }: { children: React.ReactNode }): React.ReactElement {
  const themeMode = useSettingsStore((s) => s.setting.themeMode);
  const systemDark = useUiStore((s) => s.systemColorScheme === 'dark');
  const theme = resolveTheme(themeMode, systemDark);
  return React.createElement(ThemeContext.Provider, { value: theme }, children);
}

export { ThemeContext };
