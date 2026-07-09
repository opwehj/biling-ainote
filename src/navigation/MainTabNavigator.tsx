/**
 * @file navigation/MainTabNavigator.tsx
 * @description 底部 Tab 导航：笔记列表 / 新建笔记 / 设置。
 */

import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { Text } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { TabParamList } from '../types';
import { NoteListScreen } from '../screens/NoteListScreen';
import { CreateNoteScreen } from '../screens/CreateNoteScreen';
import { SettingsScreen } from '../screens/SettingsScreen';
import { FontSize } from '../constants/theme';

const Tab = createBottomTabNavigator<TabParamList>();

/**
 * 底部 Tab 导航。
 */
export function MainTabNavigator(): React.ReactElement {
  const theme = useTheme();
  return (
    <Tab.Navigator
      screenOptions={{
        headerShown: false,
        tabBarActiveTintColor: theme.colors.primary,
        tabBarInactiveTintColor: theme.colors.textTertiary,
        tabBarStyle: {
          backgroundColor: theme.colors.card,
          borderTopColor: theme.colors.border,
          paddingBottom: 4,
          height: 56,
        },
        tabBarLabelStyle: {
          fontSize: FontSize.xs,
        },
      }}
    >
      <Tab.Screen
        name="NoteList"
        component={NoteListScreen}
        options={{
          title: '笔记',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>📒</Text>,
        }}
      />
      <Tab.Screen
        name="CreateNote"
        component={CreateNoteScreen}
        options={{
          title: '新建',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 22, color }}>➕</Text>,
        }}
      />
      <Tab.Screen
        name="Settings"
        component={SettingsScreen}
        options={{
          title: '设置',
          tabBarIcon: ({ color }) => <Text style={{ fontSize: 20, color }}>⚙️</Text>,
        }}
      />
    </Tab.Navigator>
  );
}

export default MainTabNavigator;
