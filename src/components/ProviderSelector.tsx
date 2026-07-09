/**
 * @file components/ProviderSelector.tsx
 * @description 模型提供商选择器。横向卡片列表，选中高亮。
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, FlatList } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { PROVIDER_LIST } from '../constants/providers';
import type { LLMProviderId } from '../types';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';

interface ProviderSelectorProps {
  value: LLMProviderId;
  onChange: (id: LLMProviderId) => void;
}

export function ProviderSelector({ value, onChange }: ProviderSelectorProps): React.ReactElement {
  const theme = useTheme();
  return (
    <FlatList
      horizontal
      data={PROVIDER_LIST}
      keyExtractor={(item) => item.id}
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.list}
      renderItem={({ item }) => {
        const selected = item.id === value;
        return (
          <TouchableOpacity
            activeOpacity={0.85}
            onPress={() => onChange(item.id)}
            style={[
              styles.card,
              {
                backgroundColor: selected ? theme.colors.primary : theme.colors.surfaceVariant,
                borderColor: selected ? theme.colors.primary : theme.colors.border,
              },
            ]}
          >
            <Text
              style={[
                styles.name,
                { color: selected ? theme.colors.textOnPrimary : theme.colors.textPrimary },
              ]}
            >
              {item.name}
            </Text>
            <Text
              style={[
                styles.desc,
                { color: selected ? theme.colors.textOnPrimary : theme.colors.textTertiary },
              ]}
              numberOfLines={1}
            >
              {item.defaultModel}
            </Text>
          </TouchableOpacity>
        );
      }}
    />
  );
}

const styles = StyleSheet.create({
  list: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xs,
  },
  card: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: Spacing.md,
    minWidth: 110,
  },
  name: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  desc: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
});

export default ProviderSelector;
