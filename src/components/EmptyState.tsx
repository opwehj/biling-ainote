/**
 * @file components/EmptyState.tsx
 * @description 空状态占位组件。展示图标、标题、副标题与可选操作按钮。
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSize, FontWeight, Spacing } from '../constants/theme';

interface EmptyStateProps {
  icon?: string;
  title: string;
  subtitle?: string;
  actionLabel?: string;
  onAction?: () => void;
}

export function EmptyState({
  icon,
  title,
  subtitle,
  actionLabel,
  onAction,
}: EmptyStateProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View style={styles.container}>
      {icon ? <Text style={[styles.icon, { color: theme.colors.textTertiary }]}>{icon}</Text> : null}
      <Text style={[styles.title, { color: theme.colors.textSecondary }]}>{title}</Text>
      {subtitle ? (
        <Text style={[styles.subtitle, { color: theme.colors.textTertiary }]}>{subtitle}</Text>
      ) : null}
      {actionLabel && onAction ? (
        <TouchableOpacity
          style={[styles.button, { backgroundColor: theme.colors.primary }]}
          onPress={onAction}
          activeOpacity={0.85}
        >
          <Text style={[styles.buttonText, { color: theme.colors.textOnPrimary }]}>
            {actionLabel}
          </Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xxl,
    paddingVertical: Spacing.xxxl * 2,
  },
  icon: {
    fontSize: 64,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.medium,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.sm,
    textAlign: 'center',
    lineHeight: 22,
  },
  button: {
    marginTop: Spacing.xl,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    borderRadius: 24,
  },
  buttonText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
});

export default EmptyState;
