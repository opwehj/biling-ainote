/**
 * @file components/MaterialPreview.tsx
 * @description 素材预览组件。统一展示文本/图片/音频三类素材。
 */

import React from 'react';
import { StyleSheet, Text, View, Image, TouchableOpacity } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { Material } from '../types';
import { formatDuration } from '../utils/date';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';

interface MaterialPreviewProps {
  material: Material;
  onRemove?: () => void;
}

export function MaterialPreview({ material, onRemove }: MaterialPreviewProps): React.ReactElement {
  const theme = useTheme();

  const renderBody = (): React.ReactNode => {
    switch (material.type) {
      case 'text':
        return (
          <Text
            style={[styles.textBody, { color: theme.colors.textPrimary }]}
            numberOfLines={4}
          >
            {material.content}
          </Text>
        );
      case 'image':
        return (
          <Image
            source={{ uri: material.content }}
            style={styles.image}
            resizeMode="cover"
          />
        );
      case 'audio':
        return (
          <View style={[styles.audioBody, { backgroundColor: theme.colors.surfaceVariant }]}>
            <Text style={styles.audioIcon}>🎤</Text>
            <View style={styles.audioInfo}>
              <Text style={[styles.audioName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {material.content.split('/').pop() || '录音文件'}
              </Text>
              {material.transcript ? (
                <Text
                  style={[styles.transcript, { color: theme.colors.textSecondary }]}
                  numberOfLines={2}
                >
                  {material.transcript}
                </Text>
              ) : (
                <Text style={[styles.transcript, { color: theme.colors.textTertiary }]}>
                  {material.transcript === '' ? '转写结果为空' : '未转写'}
                </Text>
              )}
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <View
      style={[styles.container, { backgroundColor: theme.colors.surfaceVariant }]}
    >
      {renderBody()}
      {onRemove ? (
        <TouchableOpacity
          style={[styles.removeBtn, { backgroundColor: theme.colors.error }]}
          onPress={onRemove}
          hitSlop={8}
        >
          <Text style={styles.removeText}>✕</Text>
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: 'relative',
    borderRadius: Radius.md,
    marginRight: Spacing.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  textBody: {
    padding: Spacing.md,
    fontSize: FontSize.sm,
    lineHeight: 20,
    maxWidth: 220,
  },
  image: {
    width: 120,
    height: 120,
  },
  audioBody: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    minWidth: 200,
    maxWidth: 280,
  },
  audioIcon: {
    fontSize: 28,
    marginRight: Spacing.md,
  },
  audioInfo: {
    flex: 1,
  },
  audioName: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  transcript: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  removeBtn: {
    position: 'absolute',
    top: 6,
    right: 6,
    width: 22,
    height: 22,
    borderRadius: 11,
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
});

export default MaterialPreview;
