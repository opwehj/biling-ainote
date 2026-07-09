/**
 * @file App.tsx
 * @description 根组件。装配 Provider（SafeArea / GestureHandler）、初始化数据库、
 *              提供主题上下文，并渲染根导航。主题随 settingsStore.themeMode 响应。
 */

import React, { useEffect, useState, useCallback } from 'react';
import { StatusBar, StyleSheet, View, ActivityIndicator } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { useSettingsStore } from './src/store/settingsStore';
import { useUiStore, initSystemThemeListener } from './src/store/uiStore';
import { initDatabase } from './src/services/db/database';
import { ThemeContext, resolveTheme } from './src/hooks/useTheme';
import type { AppTheme } from './src/constants/theme';
import { RootNavigator } from './src/navigation/RootNavigator';
import { LoadingOverlay } from './src/components/LoadingOverlay';
import { lightTheme } from './src/constants/theme';
import logger from './src/utils/logger';

/**
 * 应用根组件。
 */
function App(): React.ReactElement {
  const themeMode = useSettingsStore((s) => s.setting.themeMode);
  const systemDark = useUiStore((s) => s.systemColorScheme === 'dark');
  const loadSetting = useSettingsStore((s) => s.loadSetting);
  const globalLoading = useUiStore((s) => s.globalLoading);
  const loadingText = useUiStore((s) => s.loadingText);

  const [ready, setReady] = useState(false);
  const [theme, setTheme] = useState<AppTheme>(lightTheme);

  // 启动初始化：数据库 + 设置 + 系统主题监听
  useEffect(() => {
    let mounted = true;
    const removeThemeListener = initSystemThemeListener();
    (async () => {
      try {
        await initDatabase();
        await loadSetting();
        logger.info('App initialized');
      } catch (err) {
        logger.error('App init failed', err);
      } finally {
        if (mounted) setReady(true);
      }
    })();
    return () => {
      mounted = false;
      removeThemeListener();
    };
  }, [loadSetting]);

  // 主题响应
  useEffect(() => {
    setTheme(resolveTheme(themeMode, systemDark));
  }, [themeMode, systemDark]);

  const barStyle = useCallback(
    (): 'light-content' | 'dark-content' => (theme.dark ? 'light-content' : 'dark-content'),
    [theme.dark],
  );

  if (!ready) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={lightTheme.colors.primary} />
      </View>
    );
  }

  return (
    <ThemeContext.Provider value={theme}>
      <GestureHandlerRootView style={styles.root}>
        <SafeAreaProvider>
          <StatusBar
            barStyle={barStyle()}
            backgroundColor={theme.colors.background}
            translucent={false}
          />
          <RootNavigator />
          <LoadingOverlay visible={globalLoading} text={loadingText} />
        </SafeAreaProvider>
      </GestureHandlerRootView>
    </ThemeContext.Provider>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#F5F6FA',
  },
});

export default App;
