/**
 * @file components/LoadingOverlay.tsx
 * @description 加载遮罩组件。全屏半透明遮罩 + 居中 ActivityIndicator + 文案。
 *              用于全局 loading 与 AI 生成中页面。
 */

import React from 'react';
import { StyleSheet, View, ActivityIndicator, Text, Modal } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';

interface LoadingOverlayProps {
  visible: boolean;
  text?: string;
  transparent?: boolean;
}

export function LoadingOverlay({
  visible,
  text = '加载中…',
  transparent = true,
}: LoadingOverlayProps): React.ReactElement | null {
  const theme = useTheme();
  if (!visible) return null;
  return (
    <Modal visible={visible} transparent={transparent} animationType="fade" onRequestClose={() => {}}>
      <View style={[styles.overlay, { backgroundColor: theme.colors.overlay }]}>
        <View style={[styles.card, { backgroundColor: theme.colors.surface }]}>
          <ActivityIndicator size="large" color={theme.colors.primary} />
          <Text style={[styles.text, { color: theme.colors.textPrimary }]}>{text}</Text>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  card: {
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xl,
    borderRadius: Radius.lg,
    alignItems: 'center',
    minWidth: 120,
  },
  text: {
    marginTop: Spacing.md,
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});

export default LoadingOverlay;
