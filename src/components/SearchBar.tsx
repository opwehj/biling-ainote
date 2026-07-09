/**
 * @file components/SearchBar.tsx
 * @description 搜索栏组件。受控输入，带清除按钮。
 */

import React from 'react';
import {
  StyleSheet,
  TextInput,
  View,
  TouchableOpacity,
  Text,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { FontSize, Radius, Spacing } from '../constants/theme';

interface SearchBarProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  loading?: boolean;
  onSubmit?: () => void;
}

export function SearchBar({
  value,
  onChangeText,
  placeholder = '搜索笔记…',
  loading,
  onSubmit,
}: SearchBarProps): React.ReactElement {
  const theme = useTheme();
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border },
      ]}
    >
      <Text style={[styles.icon, { color: theme.colors.textTertiary }]}>🔍</Text>
      <TextInput
        style={[styles.input, { color: theme.colors.textPrimary }]}
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        placeholderTextColor={theme.colors.textTertiary}
        returnKeyType="search"
        onSubmitEditing={onSubmit}
        autoCorrect={false}
        clearButtonMode="while-editing"
      />
      {loading ? (
        <ActivityIndicator size="small" color={theme.colors.textTertiary} />
      ) : value.length > 0 ? (
        <TouchableOpacity onPress={() => onChangeText('')} hitSlop={8}>
          <Text style={[styles.clear, { color: theme.colors.textTertiary }]}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    height: 40,
    borderRadius: Radius.lg,
    borderWidth: StyleSheet.hairlineWidth,
  },
  icon: {
    fontSize: FontSize.md,
    marginRight: Spacing.xs,
  },
  input: {
    flex: 1,
    fontSize: FontSize.md,
    padding: 0,
  },
  clear: {
    fontSize: FontSize.md,
    paddingHorizontal: Spacing.xs,
  },
});

export default SearchBar;
