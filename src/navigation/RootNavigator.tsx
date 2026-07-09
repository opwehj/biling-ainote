/**
 * @file navigation/RootNavigator.tsx
 * @description 根导航。首启动引导门控（hasOnboarded）+ 主 Tab + 详情/编辑/分类 Stack。
 */

import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settingsStore';
import type { RootStackParamList } from '../types';
import { MainTabNavigator } from './MainTabNavigator';
import { OnboardingScreen } from '../screens/OnboardingScreen';
import { NoteDetailScreen } from '../screens/NoteDetailScreen';
import { NoteEditScreen } from '../screens/NoteEditScreen';
import { CategoryManageScreen } from '../screens/CategoryManageScreen';

const Stack = createNativeStackNavigator<RootStackParamList>();

/**
 * 根导航。根据 hasOnboarded 决定初始路由。
 */
export function RootNavigator(): React.ReactElement {
  const theme = useTheme();
  const hasOnboarded = useSettingsStore((s) => s.hasOnboarded);

  return (
    <NavigationContainer
      theme={{
        dark: theme.dark,
        colors: {
          primary: theme.colors.primary,
          background: theme.colors.background,
          card: theme.colors.card,
          text: theme.colors.textPrimary,
          border: theme.colors.border,
          notification: theme.colors.error,
        },
        fonts: {
          regular: { fontFamily: 'System', fontWeight: '400' },
          medium: { fontFamily: 'System', fontWeight: '500' },
          bold: { fontFamily: 'System', fontWeight: '700' },
          heavy: { fontFamily: 'System', fontWeight: '900' },
        },
      }}
    >
      <Stack.Navigator
        initialRouteName={hasOnboarded ? 'MainTabs' : 'Onboarding'}
        screenOptions={{
          headerStyle: { backgroundColor: theme.colors.card },
          headerTintColor: theme.colors.textPrimary,
          headerShadowVisible: false,
          contentStyle: { backgroundColor: theme.colors.background },
        }}
      >
        <Stack.Screen
          name="Onboarding"
          component={OnboardingScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="MainTabs"
          component={MainTabNavigator}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name="NoteDetail"
          component={NoteDetailScreen}
          options={{ title: '笔记详情' }}
        />
        <Stack.Screen
          name="NoteEdit"
          component={NoteEditScreen}
          options={{ title: '编辑笔记' }}
        />
        <Stack.Screen
          name="CategoryManage"
          component={CategoryManageScreen}
          options={{ title: '分类管理' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default RootNavigator;
