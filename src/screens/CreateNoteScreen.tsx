/**
 * @file screens/CreateNoteScreen.tsx
 * @description 新建笔记页。文本/图片/音频三 Tab 输入，收集素材后触发 AI 生成。
 *              生成时全屏渲染 AIGeneratingScreen，成功后跳转详情。
 */

import React, { useState, useCallback, useMemo } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  Modal,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types';
import { useTheme } from '../hooks/useTheme';
import { TextInputPanel } from '../components/TextInputPanel';
import { ImageInputPanel } from '../components/ImageInputPanel';
import { AudioInputPanel } from '../components/AudioInputPanel';
import { AIGeneratingScreen } from './AIGeneratingScreen';
import { useNoteGeneration } from '../hooks/useNoteGeneration';
import { useUiStore } from '../store/uiStore';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';
import { validateTextLength, validateImageCount } from '../utils/validation';
import type { AppError, GenerateNoteRequest } from '../types';

type TabKey = 'text' | 'image' | 'audio';

const TABS: { key: TabKey; label: string; icon: string }[] = [
  { key: 'text', label: '文本', icon: '📝' },
  { key: 'image', label: '图片', icon: '🖼' },
  { key: 'audio', label: '音频', icon: '🎤' },
];

export function CreateNoteScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'NoteDetail'>['navigation']>();
  const { generate, cancel, progress, generating } = useNoteGeneration();
  const showToast = useUiStore((s) => s.showToast);

  const [tab, setTab] = useState<TabKey>('text');
  const [text, setText] = useState('');
  const [images, setImages] = useState<string[]>([]);
  const [audios, setAudios] = useState<string[]>([]);

  const hasInput = useMemo(
    () => text.trim().length > 0 || images.length > 0 || audios.length > 0,
    [text, images, audios],
  );

  const handleGenerate = useCallback(async () => {
    try {
      validateTextLength(text);
      validateImageCount(images.length);
      if (!hasInput) {
        showToast({ type: 'warning', message: '请至少输入文本、图片或音频' });
        return;
      }
      const request: GenerateNoteRequest = {
        text: text.trim(),
        imageUris: images,
        audioUris: audios,
        materials: [],
      };
      const noteId = await generate(request);
      if (noteId) {
        // 重置输入
        setText('');
        setImages([]);
        setAudios([]);
        // 跳转详情
        navigation.reset({
          index: 0,
          routes: [{ name: 'MainTabs' }, { name: 'NoteDetail', params: { noteId } }],
        });
      }
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '生成失败' });
    }
  }, [text, images, audios, hasInput, generate, navigation, showToast]);

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + Spacing.sm }]}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>新建笔记</Text>
      </View>

      {/* Tab 切换 */}
      <View style={[styles.tabs, { borderColor: theme.colors.border }]}>
        {TABS.map((t) => {
          const active = tab === t.key;
          return (
            <TouchableOpacity
              key={t.key}
              style={[
                styles.tab,
                active ? { backgroundColor: theme.colors.primary } : { backgroundColor: theme.colors.surfaceVariant },
              ]}
              onPress={() => setTab(t.key)}
              activeOpacity={0.85}
            >
              <Text style={styles.tabIcon}>{t.icon}</Text>
              <Text
                style={[
                  styles.tabLabel,
                  { color: active ? theme.colors.textOnPrimary : theme.colors.textSecondary },
                ]}
              >
                {t.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* 输入区域 */}
      <View style={styles.inputArea}>
        {tab === 'text' ? (
          <TextInputPanel value={text} onChangeText={setText} />
        ) : null}
        {tab === 'image' ? (
          <ImageInputPanel uris={images} onChange={setImages} />
        ) : null}
        {tab === 'audio' ? (
          <AudioInputPanel uris={audios} onChange={setAudios} />
        ) : null}
      </View>

      {/* 素材汇总提示 */}
      <View style={[styles.summary, { borderColor: theme.colors.border }]}>
        <Text style={[styles.summaryText, { color: theme.colors.textTertiary }]}>
          {text.trim() ? `📝 ${text.trim().length}字  ` : ''}
          {images.length ? `🖼 ${images.length}张  ` : ''}
          {audios.length ? `🎤 ${audios.length}条  ` : ''}
          {!hasInput ? '尚未输入素材' : ''}
        </Text>
      </View>

      {/* 生成按钮 */}
      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.md }]}>
        <TouchableOpacity
          style={[styles.generateBtn, { backgroundColor: hasInput ? theme.colors.primary : theme.colors.surfaceVariant }]}
          onPress={handleGenerate}
          disabled={!hasInput || generating}
          activeOpacity={0.85}
        >
          <Text style={[styles.generateText, { color: hasInput ? theme.colors.textOnPrimary : theme.colors.textTertiary }]}>
            {generating ? '生成中…' : '生成笔记'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI 生成中全屏 */}
      <Modal visible={generating} animationType="fade" onRequestClose={cancel}>
        <AIGeneratingScreen progress={progress} onCancel={cancel} />
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
  },
  tabs: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  tab: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginHorizontal: Spacing.xs,
  },
  tabIcon: {
    fontSize: FontSize.md,
    marginRight: Spacing.xs,
  },
  tabLabel: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  inputArea: {
    flex: 1,
    paddingVertical: Spacing.md,
  },
  summary: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  summaryText: {
    fontSize: FontSize.xs,
  },
  footer: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
  },
  generateBtn: {
    height: 50,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  generateText: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
  },
});

export default CreateNoteScreen;
