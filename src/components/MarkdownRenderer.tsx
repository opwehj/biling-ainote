/**
 * @file components/MarkdownRenderer.tsx
 * @description Markdown 渲染封装。基于 react-native-markdown-display。
 *              注入主题色，统一笔记正文样式。
 */

import React from 'react';
import Markdown from 'react-native-markdown-display';
import { StyleSheet, View } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSize, FontWeight, Spacing } from '../constants/theme';
import type { AppTheme } from '../constants/theme';

interface MarkdownRendererProps {
  content: string;
  maxHeight?: number;
}

/**
 * 根据主题生成 Markdown 样式表。
 */
function buildMarkdownStyles(theme: AppTheme): Record<string, object> {
  return {
    body: {
      color: theme.colors.textPrimary,
      fontSize: FontSize.md,
      lineHeight: 24,
    },
    heading1: {
      color: theme.colors.textPrimary,
      fontSize: FontSize.xxl,
      fontWeight: FontWeight.bold,
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    heading2: {
      color: theme.colors.textPrimary,
      fontSize: FontSize.xl,
      fontWeight: FontWeight.semibold,
      marginTop: Spacing.lg,
      marginBottom: Spacing.sm,
    },
    heading3: {
      color: theme.colors.textPrimary,
      fontSize: FontSize.lg,
      fontWeight: FontWeight.semibold,
      marginTop: Spacing.md,
      marginBottom: Spacing.xs,
    },
    text: {
      color: theme.colors.textPrimary,
      lineHeight: 24,
    },
    bullet_list: {
      marginVertical: Spacing.xs,
    },
    ordered_list: {
      marginVertical: Spacing.xs,
    },
    list_item: {
      marginVertical: 2,
    },
    code_inline: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.primary,
      fontFamily: 'Menlo',
      paddingHorizontal: 4,
      borderRadius: 4,
    },
    code_block: {
      backgroundColor: theme.colors.surfaceVariant,
      color: theme.colors.textPrimary,
      padding: Spacing.md,
      borderRadius: 8,
      fontFamily: 'Menlo',
      fontSize: FontSize.sm,
    },
    blockquote: {
      backgroundColor: theme.colors.surfaceVariant,
      borderLeftWidth: 3,
      borderLeftColor: theme.colors.primary,
      paddingLeft: Spacing.md,
      paddingVertical: Spacing.xs,
      marginVertical: Spacing.sm,
    },
    strong: {
      fontWeight: FontWeight.bold,
    },
    em: {
      fontStyle: 'italic',
    },
    link: {
      color: theme.colors.primary,
      textDecorationLine: 'underline',
    },
  };
}

export function MarkdownRenderer({ content, maxHeight }: MarkdownRendererProps): React.ReactElement {
  const theme = useTheme();
  const mdStyles = buildMarkdownStyles(theme);
  const viewStyle = maxHeight ? { maxHeight } : undefined;
  return (
    <View style={viewStyle}>
      <Markdown style={mdStyles} mergeStyle={true}>
        {content || '（暂无内容）'}
      </Markdown>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
});

export default MarkdownRenderer;
