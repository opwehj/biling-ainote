/**
 * @file components/NoteCard.tsx
 * @description 笔记列表卡片。展示标题、摘要、标签、时间、素材数量。
 */

import React from 'react';
import { StyleSheet, Text, View, TouchableOpacity, Image } from 'react-native';
import { useTheme } from '../hooks/useTheme';
import type { Note } from '../types';
import { formatRelativeTime } from '../utils/date';
import { extractPreview } from '../utils/markdown';
import { FontSize, FontWeight, Radius, Spacing, Shadows } from '../constants/theme';
import { TagChip } from './TagChip';

interface NoteCardProps {
  note: Note;
  onPress: (note: Note) => void;
  onLongPress?: (note: Note) => void;
}

export function NoteCard({ note, onPress, onLongPress }: NoteCardProps): React.ReactElement {
  const theme = useTheme();

  // 取第一张图片作为封面
  const coverImage = note.materials.find((m) => m.type === 'image')?.content;
  const imageCount = note.materials.filter((m) => m.type === 'image').length;
  const audioCount = note.materials.filter((m) => m.type === 'audio').length;
  const textCount = note.materials.filter((m) => m.type === 'text').length;

  const preview = note.summary || extractPreview(note.content, 80);

  return (
    <TouchableOpacity
      activeOpacity={0.85}
      onPress={() => onPress(note)}
      onLongPress={onLongPress ? () => onLongPress(note) : undefined}
      style={[styles.card, { backgroundColor: theme.colors.card }, Shadows.sm]}
    >
      <View style={styles.header}>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]} numberOfLines={2}>
          {note.title || '未命名笔记'}
        </Text>
        {note.status === 'draft' ? (
          <View style={[styles.badge, { backgroundColor: theme.colors.warning + '22' }]}>
            <Text style={[styles.badgeText, { color: theme.colors.warning }]}>草稿</Text>
          </View>
        ) : null}
      </View>

      {coverImage ? (
        <Image source={{ uri: coverImage }} style={styles.cover} resizeMode="cover" />
      ) : null}

      {preview ? (
        <Text style={[styles.summary, { color: theme.colors.textSecondary }]} numberOfLines={3}>
          {preview}
        </Text>
      ) : null}

      {note.keyPoints.length > 0 ? (
        <View style={styles.points}>
          {note.keyPoints.slice(0, 3).map((p, i) => (
            <Text
              key={i}
              style={[styles.point, { color: theme.colors.textSecondary }]}
              numberOfLines={1}
            >
              · {p}
            </Text>
          ))}
        </View>
      ) : null}

      {note.tags.length > 0 ? (
        <View style={styles.tagsRow}>
          {note.tags.slice(0, 4).map((t, i) => (
            <TagChip key={i} label={t} />
          ))}
        </View>
      ) : null}

      <View style={[styles.footer, { borderTopColor: theme.colors.divider }]}>
        <Text style={[styles.meta, { color: theme.colors.textTertiary }]}>
          {formatRelativeTime(note.updatedAt)}
        </Text>
        <View style={styles.materials}>
          {textCount > 0 ? <Text style={styles.materialIcon}>📝 {textCount}</Text> : null}
          {imageCount > 0 ? <Text style={styles.materialIcon}>🖼 {imageCount}</Text> : null}
          {audioCount > 0 ? <Text style={styles.materialIcon}>🎤 {audioCount}</Text> : null}
        </View>
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  card: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.sm,
    borderRadius: Radius.lg,
    padding: Spacing.lg,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    marginBottom: Spacing.xs,
  },
  title: {
    flex: 1,
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginRight: Spacing.sm,
  },
  badge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
  },
  badgeText: {
    fontSize: FontSize.xs,
    fontWeight: FontWeight.medium,
  },
  cover: {
    width: '100%',
    height: 140,
    borderRadius: Radius.md,
    marginBottom: Spacing.md,
  },
  summary: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginBottom: Spacing.sm,
  },
  points: {
    marginBottom: Spacing.sm,
  },
  point: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  tagsRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginTop: Spacing.xs,
  },
  footer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingTop: Spacing.sm,
    marginTop: Spacing.sm,
    borderTopWidth: StyleSheet.hairlineWidth,
  },
  meta: {
    fontSize: FontSize.xs,
  },
  materials: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  materialIcon: {
    fontSize: FontSize.xs,
    marginLeft: Spacing.md,
    color: '#888',
  },
});

export default NoteCard;
