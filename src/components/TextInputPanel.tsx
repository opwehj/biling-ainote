/**
 * @file components/TextInputPanel.tsx
 * @description 文本输入面板。多行文本输入，带字数统计与上限校验。
 */

import React from 'react';
import { StyleSheet, Text, TextInput, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { INPUT_LIMITS } from '../constants/config';
import { FontSize, Radius, Spacing } from '../constants/theme';

interface TextInputPanelProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
}

export function TextInputPanel({
  value,
  onChangeText,
  placeholder = '在这里输入文字，AI 会帮你整理成笔记…',
}: TextInputPanelProps): React.ReactElement {
  const theme = useTheme();
  const count = value.length;
  const overLimit = count > INPUT_LIMITS.MAX_TEXT_LENGTH;

  return (
    <View style={styles.container}>
      <TextInput
        style={[
          styles.input,
          {
            color: theme.colors.textPrimary,
            backgroundColor: theme.colors.surface,
            borderColor: theme.colors.border,
          },
        ]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        multiline
        textAlignVertical="top"
        autoCorrect
        maxLength={INPUT_LIMITS.MAX_TEXT_LENGTH + 100}
      />
      <Text style={[styles.counter, { color: overLimit ? theme.colors.error : theme.colors.textTertiary }]}>
        {count} / {INPUT_LIMITS.MAX_TEXT_LENGTH}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  input: {
    flex: 1,
    minHeight: 160,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
    fontSize: FontSize.md,
    lineHeight: 24,
  },
  counter: {
    textAlign: 'right',
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    marginRight: Spacing.xs,
  },
});

export default TextInputPanel;
