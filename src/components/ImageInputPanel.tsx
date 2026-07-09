/**
 * @file components/ImageInputPanel.tsx
 * @description 图片输入面板。支持拍照/相册选图，横向预览，删除单张。
 *              内部调用 ImageService 完成压缩。
 */

import React, { useCallback, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  Image,
  ActivityIndicator,
} from 'react-native';
import { useTheme } from '../hooks/useTheme';
import { ImageService } from '../services/media/ImageService';
import { INPUT_LIMITS } from '../constants/config';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';
import { useUiStore } from '../store/uiStore';
import type { AppError } from '../types';

interface ImageInputPanelProps {
  uris: string[];
  onChange: (uris: string[]) => void;
}

export function ImageInputPanel({ uris, onChange }: ImageInputPanelProps): React.ReactElement {
  const theme = useTheme();
  const [busy, setBusy] = useState(false);
  const showToast = useUiStore((s) => s.showToast);

  const remaining = INPUT_LIMITS.MAX_IMAGE_COUNT - uris.length;

  const handleCamera = useCallback(async () => {
    if (remaining <= 0) {
      showToast({ type: 'warning', message: `最多 ${INPUT_LIMITS.MAX_IMAGE_COUNT} 张` });
      return;
    }
    setBusy(true);
    try {
      const img = await ImageService.openCamera();
      if (img) {
        onChange([...uris, img.uri]);
      }
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '拍照失败' });
    } finally {
      setBusy(false);
    }
  }, [uris, onChange, remaining, showToast]);

  const handlePicker = useCallback(async () => {
    if (remaining <= 0) {
      showToast({ type: 'warning', message: `最多 ${INPUT_LIMITS.MAX_IMAGE_COUNT} 张` });
      return;
    }
    setBusy(true);
    try {
      const imgs = await ImageService.openPicker(remaining);
      if (imgs.length > 0) {
        onChange([...uris, ...imgs.map((i) => i.uri)]);
      }
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '选图失败' });
    } finally {
      setBusy(false);
    }
  }, [uris, onChange, remaining, showToast]);

  const handleRemove = useCallback(
    (index: number) => {
      const next = uris.filter((_, i) => i !== index);
      onChange(next);
    },
    [uris, onChange],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={handleCamera}
          disabled={busy}
          activeOpacity={0.85}
        >
          {busy ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text style={styles.btnIcon}>📷</Text>
          )}
          <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>拍照</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={handlePicker}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.btnIcon}>🖼</Text>
          <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>相册</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
          {uris.length} / {INPUT_LIMITS.MAX_IMAGE_COUNT}
        </Text>
      </View>

      {uris.length > 0 ? (
        <FlatList
          horizontal
          data={uris}
          keyExtractor={(item, index) => `${item}-${index}`}
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.list}
          renderItem={({ item, index }) => (
            <View style={styles.thumbWrap}>
              <Image source={{ uri: item }} style={styles.thumb} resizeMode="cover" />
              <TouchableOpacity
                style={styles.removeBtn}
                onPress={() => handleRemove(index)}
                activeOpacity={0.7}
              >
                <Text style={styles.removeText}>✕</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : (
        <View style={[styles.placeholder, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.placeholderText, { color: theme.colors.textTertiary }]}>
            拍照或从相册选择图片（最多 {INPUT_LIMITS.MAX_IMAGE_COUNT} 张）
          </Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  toolbar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  btn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginRight: Spacing.md,
  },
  btnIcon: {
    fontSize: FontSize.lg,
    marginRight: Spacing.xs,
  },
  btnText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  hint: {
    marginLeft: 'auto',
    fontSize: FontSize.xs,
  },
  list: {
    paddingVertical: Spacing.md,
  },
  thumbWrap: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  thumb: {
    width: 100,
    height: 100,
    borderRadius: Radius.md,
  },
  removeBtn: {
    position: 'absolute',
    top: -6,
    right: -6,
    width: 22,
    height: 22,
    borderRadius: 11,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  removeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: FontWeight.bold,
  },
  placeholder: {
    flex: 1,
    minHeight: 120,
    borderRadius: Radius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  placeholderText: {
    fontSize: FontSize.sm,
  },
});

export default ImageInputPanel;
