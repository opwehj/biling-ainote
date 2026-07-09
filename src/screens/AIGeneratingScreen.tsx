/**
 * @file screens/AIGeneratingScreen.tsx
 * @description AI 生成中页面。展示生成阶段进度与文案，支持取消。
 *              作为 CreateNoteScreen 的全屏 Modal 渲染（非栈页面）。
 */

import React from 'react';
import { StyleSheet, View, Text, ActivityIndicator, TouchableOpacity } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import type { GenerationProgress } from '../types';
import { FontSize, FontWeight, Spacing, Radius } from '../constants/theme';

interface AIGeneratingScreenProps {
  progress: GenerationProgress;
  onCancel: () => void;
}

const PHASE_ICONS: Record<string, string> = {
  idle: '⏳',
  transcribing: '🎧',
  recognizing: '🖼',
  generating: '✍️',
  done: '✅',
  error: '⚠️',
};

export function AIGeneratingScreen({ progress, onCancel }: AIGeneratingScreenProps): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const isDone = progress.phase === 'done';
  const isError = progress.phase === 'error';

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background, paddingTop: insets.top }]}>
      <View style={styles.content}>
        <Text style={styles.icon}>{isError ? '⚠️' : PHASE_ICONS[progress.phase] ?? '⏳'}</Text>

        {!isDone && !isError ? (
          <ActivityIndicator size="large" color={theme.colors.primary} style={styles.spinner} />
        ) : null}

        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>
          {isError ? '生成失败' : isDone ? '生成完成' : 'AI 正在生成笔记'}
        </Text>
        <Text style={[styles.message, { color: theme.colors.textSecondary }]}>
          {progress.message || '请稍候…'}
        </Text>

        {progress.detail ? (
          <Text style={[styles.detail, { color: theme.colors.textTertiary }]}>{progress.detail}</Text>
        ) : null}

        {/* 进度阶段指示 */}
        <View style={styles.stepper}>
          {(['transcribing', 'recognizing', 'generating'] as const).map((phase, idx) => {
            const order = ['transcribing', 'recognizing', 'generating', 'done'].indexOf(progress.phase);
            const active = order >= idx + 1 || progress.phase === 'done';
            return (
              <View key={phase} style={styles.stepWrap}>
                <View
                  style={[
                    styles.stepDot,
                    {
                      backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant,
                    },
                  ]}
                />
                <Text
                  style={[
                    styles.stepLabel,
                    { color: active ? theme.colors.primary : theme.colors.textTertiary },
                  ]}
                >
                  {phase === 'transcribing' ? '转写音频' : phase === 'recognizing' ? '识别图片' : '整理笔记'}
                </Text>
              </View>
            );
          })}
        </View>
      </View>

      <View style={[styles.footer, { paddingBottom: insets.bottom + Spacing.lg }]}>
        {isDone ? null : (
          <TouchableOpacity
            style={[styles.cancelBtn, { borderColor: theme.colors.border }]}
            onPress={onCancel}
            activeOpacity={0.85}
          >
            <Text style={[styles.cancelText, { color: theme.colors.textSecondary }]}>
              {isError ? '关闭' : '取消生成'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  content: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  spinner: {
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.xl,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.sm,
  },
  message: {
    fontSize: FontSize.md,
    textAlign: 'center',
  },
  detail: {
    fontSize: FontSize.sm,
    marginTop: Spacing.xs,
  },
  stepper: {
    flexDirection: 'row',
    marginTop: Spacing.xxxl,
    paddingHorizontal: Spacing.lg,
  },
  stepWrap: {
    flex: 1,
    alignItems: 'center',
  },
  stepDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginBottom: Spacing.xs,
  },
  stepLabel: {
    fontSize: FontSize.xs,
  },
  footer: {
    paddingHorizontal: Spacing.xxl,
  },
  cancelBtn: {
    height: 48,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cancelText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
});

export default AIGeneratingScreen;
