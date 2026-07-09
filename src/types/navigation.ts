/**
 * @file types/navigation.ts
 * @description 路由参数类型定义，供 @react-navigation v7 使用。
 */

import type { NativeStackScreenProps } from '@react-navigation/native-stack';

/** 根 Stack 路由参数列表 */
export type RootStackParamList = {
  Onboarding: undefined;
  MainTabs: undefined;
  NoteDetail: { noteId: string };
  NoteEdit: { noteId: string };
  CategoryManage: undefined;
};

/** 底部 Tab 路由参数列表 */
export type TabParamList = {
  NoteList: undefined;
  CreateNote: undefined;
  Settings: undefined;
};

/** 根 Stack 屏幕属性 */
export type RootStackScreenProps<T extends keyof RootStackParamList> =
  NativeStackScreenProps<RootStackParamList, T>;

/** Tab 屏幕属性 */
export type TabScreenProps<T extends keyof TabParamList> = NativeStackScreenProps<TabParamList, T>;
