/**
 * @file components/TagChip.tsx
 * @description 标签芯片组件。用于笔记标签、分类标签等小标签展示。
 */

import React from 'react';
import { StyleSheet, Text, View, ViewStyle } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';

interface TagChipProps {
  label: string;
  color?: string;
  style?: ViewStyle;
}

export function TagChip({ label, color, style }: TagChipProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.chip,
        { backgroundColor: theme.colors.tagBg },
        color ? { backgroundColor: color + '22' } : null,
        style,
      ]}
    >
      <Text
        style={[styles.text, { color: color || theme.colors.primary }]}
        numberOfLines={1}
      >
        {label}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  chip: {
    paddingHorizontal: Spacing.sm + 2,
    paddingVertical: Spacing.xs,
    borderRadius: Radius.sm,
    marginRight: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  text: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
});

export default TagChip;
