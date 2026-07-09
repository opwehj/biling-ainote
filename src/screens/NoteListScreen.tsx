/**
 * @file screens/NoteListScreen.tsx
 * @description 笔记列表页。搜索、排序、分类筛选、卡片列表、空状态。
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  FlatList,
  TouchableOpacity,
  Text,
  RefreshControl,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, type CompositeNavigationProp } from '@react-navigation/native';
import type { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList, TabParamList, SortOrder, Note } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useNotes } from '../hooks/useNotes';
import { SearchBar } from '../components/SearchBar';
import { NoteCard } from '../components/NoteCard';
import { EmptyState } from '../components/EmptyState';
import { FontSize, FontWeight, Spacing } from '../constants/theme';

/** 列表页导航类型：Tab + Stack 复合，支持切换 Tab 与跳转详情 */
type NoteListNavProp = CompositeNavigationProp<
  BottomTabNavigationProp<TabParamList, 'NoteList'>,
  NativeStackNavigationProp<RootStackParamList>
>;

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: '最近更新', value: 'updated_desc' },
  { label: '最早更新', value: 'updated_asc' },
  { label: '最近创建', value: 'created_desc' },
  { label: '最早创建', value: 'created_asc' },
];

export function NoteListScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<NoteListNavProp>();
  const {
    notes,
    categories,
    filter,
    sortOrder,
    loading,
    refreshing,
    refresh,
    search,
    setSortOrder,
    setFilter,
    deleteNote,
  } = useNotes();

  const [keyword, setKeyword] = useState(filter.keyword ?? '');
  const [sortModalVisible, setSortModalVisible] = useState(false);

  const currentSort = SORT_OPTIONS.find((o) => o.value === sortOrder);

  const handleOpenNote = useCallback(
    (note: Note) => {
      navigation.navigate('NoteDetail', { noteId: note.id });
    },
    [navigation],
  );

  const handleCreate = useCallback(() => {
    navigation.navigate('CreateNote');
  }, [navigation]);

  const handleSearch = useCallback(
    (text: string) => {
      setKeyword(text);
      search(text);
    },
    [search],
  );

  const renderNote = useCallback(
    ({ item }: { item: Note }) => (
      <NoteCard
        note={item}
        onPress={handleOpenNote}
        onLongPress={(note) => { void deleteNote(note.id); }}
      />
    ),
    [handleOpenNote, deleteNote],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>我的笔记</Text>
        <TouchableOpacity
          style={[styles.sortBtn, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={() => setSortModalVisible(true)}
        >
          <Text style={styles.sortIcon}>↕</Text>
          <Text style={[styles.sortText, { color: theme.colors.textSecondary }]}>
            {currentSort?.label}
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.searchWrap}>
        <SearchBar value={keyword} onChangeText={handleSearch} loading={loading} />
      </View>

      {categories.length > 0 ? (
        <View style={styles.categoryRow}>
          <TouchableOpacity
            style={[
              styles.catChip,
              {
                backgroundColor:
                  filter.categoryId === undefined ? theme.colors.primary : theme.colors.surfaceVariant,
              },
            ]}
            onPress={() => setFilter({ categoryId: undefined })}
          >
            <Text
              style={{
                color: filter.categoryId === undefined ? theme.colors.textOnPrimary : theme.colors.textSecondary,
                fontSize: FontSize.xs,
              }}
            >
              全部
            </Text>
          </TouchableOpacity>
          {categories.map((c) => {
            const active = filter.categoryId === c.id;
            return (
              <TouchableOpacity
                key={c.id}
                style={[
                  styles.catChip,
                  { backgroundColor: active ? c.color : theme.colors.surfaceVariant },
                ]}
                onPress={() => setFilter({ categoryId: active ? undefined : c.id })}
              >
                <Text
                  style={{
                    color: active ? '#fff' : theme.colors.textSecondary,
                    fontSize: FontSize.xs,
                  }}
                >
                  {c.name}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      ) : null}

      <FlatList
        data={notes}
        keyExtractor={(item) => item.id}
        renderItem={renderNote}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={refresh} tintColor={theme.colors.primary} />}
        contentContainerStyle={styles.list}
        ListEmptyComponent={
          <EmptyState
            icon="📒"
            title={keyword ? '没有找到相关笔记' : '还没有笔记'}
            subtitle={keyword ? '换个关键词试试' : '点击下方"新建"按钮，用 AI 生成你的第一篇笔记'}
            actionLabel={keyword ? undefined : '新建笔记'}
            onAction={keyword ? undefined : handleCreate}
          />
        }
      />

      {/* 排序选择弹窗 */}
      <Modal visible={sortModalVisible} transparent animationType="fade" onRequestClose={() => setSortModalVisible(false)}>
        <TouchableOpacity style={styles.modalOverlay} onPress={() => setSortModalVisible(false)} activeOpacity={1}>
          <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
            <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>排序方式</Text>
            {SORT_OPTIONS.map((o) => (
              <TouchableOpacity
                key={o.value}
                style={styles.modalItem}
                onPress={() => {
                  setSortOrder(o.value);
                  setSortModalVisible(false);
                }}
              >
                <Text style={[styles.modalItemText, { color: theme.colors.textPrimary }]}>{o.label}</Text>
                {o.value === sortOrder ? <Text style={{ color: theme.colors.primary }}>✓</Text> : null}
              </TouchableOpacity>
            ))}
          </View>
        </TouchableOpacity>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
  },
  sortBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 16,
  },
  sortIcon: {
    fontSize: FontSize.md,
    marginRight: Spacing.xs,
    color: '#888',
  },
  sortText: {
    fontSize: FontSize.sm,
  },
  searchWrap: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  categoryRow: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
    flexWrap: 'wrap',
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 12,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  list: {
    paddingBottom: Spacing.xxxl,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'flex-end',
  },
  modalCard: {
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: Spacing.xl,
    paddingBottom: Spacing.xxxl,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  modalItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingVertical: Spacing.md,
  },
  modalItemText: {
    fontSize: FontSize.md,
  },
});

export default NoteListScreen;
