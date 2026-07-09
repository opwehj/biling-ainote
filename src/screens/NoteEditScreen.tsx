/**
 * @file screens/NoteEditScreen.tsx
 * @description 笔记编辑页。支持编辑标题、标签、分类与 Markdown 正文。
 *              采用 Markdown 源码编辑 + 实时预览切换（MVP 方案）。
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  ScrollView,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useNoteStore } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import { MarkdownRenderer } from '../components/MarkdownRenderer';
import { validateNoteTitle } from '../utils/validation';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';
import type { Note, AppError } from '../types';

type EditMode = 'edit' | 'preview';

export function NoteEditScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const route = useRoute<RootStackScreenProps<'NoteEdit'>['route']>();
  const nav = useNavigation<RootStackScreenProps<'NoteEdit'>['navigation']>();
  const noteId = route.params.noteId;

  const currentNote = useNoteStore((s) => s.currentNote);
  const categories = useNoteStore((s) => s.categories);
  const loadNote = useNoteStore((s) => s.loadNote);
  const saveNote = useNoteStore((s) => s.saveNote);
  const showToast = useUiStore((s) => s.showToast);

  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [mode, setMode] = useState<EditMode>('edit');
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    (async () => {
      const note = await loadNote(noteId);
      if (note) {
        setTitle(note.title);
        setContent(note.content);
        setTagsText(note.tags.join('、'));
        setCategoryId(note.categoryId);
      }
    })();
  }, [noteId, loadNote]);

  const handleSave = useCallback(async () => {
    try {
      validateNoteTitle(title);
      const tags = tagsText
        .split(/[、,，\n]/)
        .map((t) => t.trim())
        .filter(Boolean)
        .slice(0, 5);

      const updated: Note = {
        ...(currentNote as Note),
        title: title.trim() || '未命名笔记',
        content,
        tags,
        categoryId,
        updatedAt: Date.now(),
      };
      setSaving(true);
      await saveNote(updated);
      showToast({ type: 'success', message: '已保存' });
      nav.goBack();
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '保存失败' });
    } finally {
      setSaving(false);
    }
  }, [title, content, tagsText, categoryId, currentNote, saveNote, showToast, nav]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>编辑笔记</Text>
        <View style={styles.modeSwitch}>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'edit' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => setMode('edit')}
          >
            <Text style={{ color: mode === 'edit' ? theme.colors.textOnPrimary : theme.colors.textSecondary, fontSize: FontSize.xs }}>
              编辑
            </Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.modeBtn, mode === 'preview' ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surfaceVariant }]}
            onPress={() => setMode('preview')}
          >
            <Text style={{ color: mode === 'preview' ? theme.colors.textOnPrimary : theme.colors.textSecondary, fontSize: FontSize.xs }}>
              预览
            </Text>
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView contentContainerStyle={[styles.scroll, { paddingBottom: insets.bottom + 80 }]}>
        {/* 标题 */}
        <TextInput
          style={[styles.titleInput, { color: theme.colors.textPrimary, borderBottomColor: theme.colors.border }]}
          value={title}
          onChangeText={setTitle}
          placeholder="笔记标题"
          placeholderTextColor={theme.colors.textTertiary}
          maxLength={100}
        />

        {/* 标签 */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>标签（用顿号分隔，最多5个）</Text>
          <TextInput
            style={[styles.fieldInput, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}
            value={tagsText}
            onChangeText={setTagsText}
            placeholder="如：学习、读书、灵感"
            placeholderTextColor={theme.colors.textTertiary}
          />
        </View>

        {/* 分类 */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>分类</Text>
          <View style={styles.catRow}>
            <TouchableOpacity
              style={[styles.catChip, { backgroundColor: categoryId === null ? theme.colors.primary : theme.colors.surfaceVariant }]}
              onPress={() => setCategoryId(null)}
            >
              <Text style={{ color: categoryId === null ? theme.colors.textOnPrimary : theme.colors.textSecondary, fontSize: FontSize.xs }}>
                无
              </Text>
            </TouchableOpacity>
            {categories.map((c) => {
              const active = categoryId === c.id;
              return (
                <TouchableOpacity
                  key={c.id}
                  style={[styles.catChip, { backgroundColor: active ? c.color : theme.colors.surfaceVariant }]}
                  onPress={() => setCategoryId(active ? null : c.id)}
                >
                  <Text style={{ color: active ? '#fff' : theme.colors.textSecondary, fontSize: FontSize.xs }}>
                    {c.name}
                  </Text>
                </TouchableOpacity>
              );
            })}
          </View>
        </View>

        {/* 正文 */}
        <View style={styles.field}>
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>正文（Markdown）</Text>
          {mode === 'edit' ? (
            <TextInput
              style={[styles.contentInput, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
              value={content}
              onChangeText={setContent}
              placeholder="在此输入 Markdown 正文…"
              placeholderTextColor={theme.colors.textTertiary}
              multiline
              textAlignVertical="top"
              autoCorrect={false}
            />
          ) : (
            <View style={[styles.previewBox, { backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}>
              <MarkdownRenderer content={content} />
            </View>
          )}
        </View>
      </ScrollView>

      {/* 保存按钮 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.saveBtn, { backgroundColor: theme.colors.primary, opacity: saving ? 0.6 : 1 }]}
          onPress={handleSave}
          disabled={saving}
        >
          <Text style={styles.saveText}>{saving ? '保存中…' : '保存'}</Text>
        </TouchableOpacity>
      </View>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
  },
  modeSwitch: {
    flexDirection: 'row',
  },
  modeBtn: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    marginLeft: Spacing.xs,
  },
  scroll: {
    padding: Spacing.lg,
  },
  titleInput: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.semibold,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.lg,
  },
  field: {
    marginBottom: Spacing.lg,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
  },
  fieldInput: {
    height: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  catRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  catChip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: 8,
    marginRight: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  contentInput: {
    minHeight: 240,
    borderRadius: Radius.md,
    padding: Spacing.md,
    fontSize: FontSize.md,
    lineHeight: 24,
    borderWidth: StyleSheet.hairlineWidth,
    fontFamily: 'Menlo',
  },
  previewBox: {
    minHeight: 240,
    borderRadius: Radius.md,
    padding: Spacing.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.sm,
  },
  saveBtn: {
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  saveText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});

export default NoteEditScreen;
