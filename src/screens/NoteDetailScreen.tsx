/**
 * @file screens/NoteDetailScreen.tsx
 * @description 笔记详情页。展示标题、摘要、要点、Markdown 正文、标签、素材。
 *              提供编辑、删除、分享操作。
 */

import React, { useEffect, useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  ScrollView,
  TouchableOpacity,
  Alert,
  Share,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useNoteStore, getCategoryById } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { TagChip } from '../components/TagChip';
import { MaterialPreview } from '../components/MaterialPreview';
import { LoadingOverlay } from '../components/LoadingOverlay';
import { formatDateTime } from '../utils/date';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';

export function NoteDetailScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RootStackScreenProps<'NoteDetail'>['route']>();
  const nav = useNavigation<RootStackScreenProps<'NoteDetail'>['navigation']>();
  const noteId = route.params.noteId;

  const currentNote = useNoteStore((s) => s.currentNote);
  const categories = useNoteStore((s) => s.categories);
  const loadNote = useNoteStore((s) => s.loadNote);
  const deleteNote = useNoteStore((s) => s.deleteNote);
  const showToast = useUiStore((s) => s.showToast);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    (async () => {
      setLoading(true);
      await loadNote(noteId);
      setLoading(false);
    })();
  }, [noteId, loadNote]);

  const handleEdit = useCallback(() => {
    nav.navigate('NoteEdit', { noteId });
  }, [nav, noteId]);

  const handleDelete = useCallback(() => {
    Alert.alert('删除笔记', '确定删除该笔记吗？此操作不可恢复。', [
      { text: '取消', style: 'cancel' },
      {
        text: '删除',
        style: 'destructive',
        onPress: async () => {
          await deleteNote(noteId);
          showToast({ type: 'success', message: '已删除' });
          nav.goBack();
        },
      },
    ]);
  }, [noteId, deleteNote, showToast, nav]);

  const handleShare = useCallback(async () => {
    if (!currentNote) return;
    const text = `# ${currentNote.title}\n\n${currentNote.summary}\n\n${currentNote.content}`;
    try {
      await Share.share({ message: text });
    } catch {
      showToast({ type: 'error', message: '分享失败' });
    }
  }, [currentNote, showToast]);

  if (!currentNote) {
    return <LoadingOverlay visible={loading} text="加载中…" />;
  }

  const category = getCategoryById(categories, currentNote.categoryId);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}>
        {/* 标题 */}
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {currentNote.title || '未命名笔记'}
        </Text>

        {/* 元信息 */}
        <View style={styles.metaRow}>
          {category ? (
            <View style={[styles.catBadge, { backgroundColor: category.color + '22' }]}>
              <Text style={[styles.catText, { color: category.color }]}>{category.name}</Text>
            </View>
          ) : null}
          <Text style={[styles.metaText, { color: theme.colors.textTertiary }]}>
            {formatDateTime(currentNote.updatedAt)}
          </Text>
        </View>

        {/* 摘要 */}
        {currentNote.summary ? (
          <View style={[styles.summaryBox, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={[styles.summaryLabel, { color: theme.colors.textSecondary }]}>摘要</Text>
            <Text style={[styles.summaryText, { color: theme.colors.textPrimary }]}>
              {currentNote.summary}
            </Text>
          </View>
        ) : null}

        {/* 要点 */}
        {currentNote.keyPoints.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>核心要点</Text>
            {currentNote.keyPoints.map((p, i) => (
              <View key={i} style={styles.pointRow}>
                <Text style={[styles.pointIndex, { color: theme.colors.primary }]}>{i + 1}.</Text>
                <Text style={[styles.pointText, { color: theme.colors.textPrimary }]}>{p}</Text>
              </View>
            ))}
          </View>
        ) : null}

        {/* 正文 */}
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>正文</Text>
          <MarkdownRenderer content={currentNote.content} />
        </View>

        {/* 标签 */}
        {currentNote.tags.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>标签</Text>
            <View style={styles.tagsRow}>
              {currentNote.tags.map((t, i) => (
                <TagChip key={i} label={t} />
              ))}
            </View>
          </View>
        ) : null}

        {/* 素材 */}
        {currentNote.materials.length > 0 ? (
          <View style={styles.section}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>原始素材</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.materialsRow}>
              {currentNote.materials.map((m, i) => (
                <MaterialPreview key={m.id || i} material={m} />
              ))}
            </ScrollView>
          </View>
        ) : null}
      </ScrollView>

      {/* 底部操作栏 */}
      <View style={[styles.actionBar, { backgroundColor: theme.colors.card, paddingBottom: insets.bottom + Spacing.sm }]}>
        <TouchableOpacity style={styles.actionBtn} onPress={handleShare}>
          <Text style={styles.actionIcon}>↗</Text>
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>分享</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleEdit}>
          <Text style={styles.actionIcon}>✏️</Text>
          <Text style={[styles.actionText, { color: theme.colors.textSecondary }]}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.actionBtn} onPress={handleDelete}>
          <Text style={styles.actionIcon}>🗑</Text>
          <Text style={[styles.actionText, { color: theme.colors.error }]}>删除</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  scroll: {
    padding: Spacing.lg,
  },
  title: {
    fontSize: 24,
    fontWeight: FontWeight.bold,
    lineHeight: 32,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.sm,
    marginBottom: Spacing.md,
  },
  catBadge: {
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: 6,
    marginRight: Spacing.sm,
  },
  catText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  metaText: {
    fontSize: FontSize.xs,
  },
  summaryBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.lg,
  },
  summaryLabel: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.xs,
  },
  summaryText: {
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  pointRow: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
  },
  pointIndex: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
    marginRight: Spacing.sm,
  },
  pointText: {
    flex: 1,
    fontSize: FontSize.sm,
    lineHeight: 22,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  materialsRow: {
    paddingVertical: Spacing.xs,
  },
  actionBar: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    flexDirection: 'row',
    borderTopWidth: StyleSheet.hairlineWidth,
    borderTopColor: 'rgba(0,0,0,0.05)',
    paddingTop: Spacing.sm,
  },
  actionBtn: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
  },
  actionIcon: {
    fontSize: 22,
    marginBottom: 2,
  },
  actionText: {
    fontSize: FontSize.xs,
  },
});

export default NoteDetailScreen;
