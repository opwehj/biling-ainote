/**
 * @file screens/CategoryManageScreen.tsx
 * @description 分类管理页。新增、删除、重命名分类，选择颜色。
 */

import React, { useEffect, useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  FlatList,
  Alert,
  Modal,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTheme } from '../hooks/useTheme';
import { useNoteStore } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import { CATEGORY_COLORS } from '../constants/theme';
import { validateCategoryName } from '../utils/validation';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';
import type { AppError, Category } from '../types';

export function CategoryManageScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const categories = useNoteStore((s) => s.categories);
  const loadCategories = useNoteStore((s) => s.loadCategories);
  const addCategory = useNoteStore((s) => s.addCategory);
  const removeCategory = useNoteStore((s) => s.removeCategory);
  const updateCategory = useNoteStore((s) => s.updateCategory);
  const showToast = useUiStore((s) => s.showToast);

  const [name, setName] = useState('');
  const [color, setColor] = useState<string>(CATEGORY_COLORS[0]);
  const [editTarget, setEditTarget] = useState<Category | null>(null);

  useEffect(() => {
    loadCategories();
  }, [loadCategories]);

  const handleAdd = useCallback(async () => {
    try {
      validateCategoryName(name);
      await addCategory(name.trim(), color);
      setName('');
      setColor(CATEGORY_COLORS[0]);
      showToast({ type: 'success', message: '分类已添加' });
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '添加失败' });
    }
  }, [name, color, addCategory, showToast]);

  const handleDelete = useCallback(
    (cat: Category) => {
      Alert.alert('删除分类', `确定删除"${cat.name}"吗？关联笔记将变为未分类。`, [
        { text: '取消', style: 'cancel' },
        {
          text: '删除',
          style: 'destructive',
          onPress: async () => {
            await removeCategory(cat.id);
            showToast({ type: 'success', message: '已删除' });
          },
        },
      ]);
    },
    [removeCategory, showToast],
  );

  const handleSaveEdit = useCallback(
    async (newName: string, newColor: string) => {
      if (!editTarget) return;
      try {
        validateCategoryName(newName);
        await updateCategory(editTarget.id, newName.trim(), newColor);
        showToast({ type: 'success', message: '已更新' });
        setEditTarget(null);
      } catch (err) {
        showToast({ type: 'error', message: (err as AppError)?.message || '更新失败' });
      }
    },
    [editTarget, updateCategory, showToast],
  );

  const renderItem = useCallback(
    ({ item }: { item: Category }) => (
      <View style={[styles.item, { backgroundColor: theme.colors.card }]}>
        <View style={[styles.colorDot, { backgroundColor: item.color }]} />
        <Text style={[styles.itemName, { color: theme.colors.textPrimary }]}>{item.name}</Text>
        <TouchableOpacity onPress={() => setEditTarget(item)} hitSlop={8}>
          <Text style={[styles.actionText, { color: theme.colors.primary }]}>编辑</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => handleDelete(item)}
          hitSlop={8}
          style={{ marginLeft: Spacing.md }}
        >
          <Text style={[styles.actionText, { color: theme.colors.error }]}>删除</Text>
        </TouchableOpacity>
      </View>
    ),
    [theme, handleDelete],
  );

  return (
    <View style={[styles.container, { backgroundColor: theme.colors.background }]}>
      <ScrollView
        contentContainerStyle={{ paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.xxxl }}
      >
        {/* 新增区 */}
        <View style={[styles.addCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>新建分类</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}
            value={name}
            onChangeText={setName}
            placeholder="分类名称（不超过 20 字）"
            placeholderTextColor={theme.colors.textTertiary}
            maxLength={20}
          />
          <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>颜色</Text>
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((c) => {
              const active = color === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorBtn, { backgroundColor: c, borderColor: active ? theme.colors.textPrimary : 'transparent' }]}
                  onPress={() => setColor(c)}
                />
              );
            })}
          </View>
          <TouchableOpacity
            style={[styles.addBtn, { backgroundColor: theme.colors.primary }]}
            onPress={handleAdd}
          >
            <Text style={styles.addBtnText}>添加</Text>
          </TouchableOpacity>
        </View>

        {/* 列表 */}
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginTop: Spacing.lg }]}>
          已有分类（{categories.length}）
        </Text>
        <FlatList
          data={categories}
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          scrollEnabled={false}
          contentContainerStyle={styles.list}
        />
      </ScrollView>

      {/* 编辑弹窗 */}
      <EditCategoryModal
        category={editTarget}
        onClose={() => setEditTarget(null)}
        onSave={handleSaveEdit}
      />
    </View>
  );
}

/**
 * 编辑分类弹窗。
 */
function EditCategoryModal({
  category,
  onClose,
  onSave,
}: {
  category: Category | null;
  onClose: () => void;
  onSave: (name: string, color: string) => void;
}): React.ReactElement | null {
  const theme = useTheme();
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState<string>(CATEGORY_COLORS[0]);

  useEffect(() => {
    if (category) {
      setEditName(category.name);
      setEditColor(category.color);
    }
  }, [category]);

  if (!category) return null;

  return (
    <Modal visible={!!category} transparent animationType="fade" onRequestClose={onClose}>
      <TouchableOpacity style={styles.modalOverlay} onPress={onClose} activeOpacity={1}>
        <View style={[styles.modalCard, { backgroundColor: theme.colors.card }]}>
          <Text style={[styles.modalTitle, { color: theme.colors.textPrimary }]}>编辑分类</Text>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}
            value={editName}
            onChangeText={setEditName}
            maxLength={20}
          />
          <View style={styles.colorRow}>
            {CATEGORY_COLORS.map((c) => {
              const active = editColor === c;
              return (
                <TouchableOpacity
                  key={c}
                  style={[styles.colorBtn, { backgroundColor: c, borderColor: active ? theme.colors.textPrimary : 'transparent' }]}
                  onPress={() => setEditColor(c)}
                />
              );
            })}
          </View>
          <View style={styles.modalActions}>
            <TouchableOpacity style={[styles.modalBtn, { borderColor: theme.colors.border }]} onPress={onClose}>
              <Text style={{ color: theme.colors.textSecondary }}>取消</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.modalBtn, { backgroundColor: theme.colors.primary }]}
              onPress={() => onSave(editName, editColor)}
            >
              <Text style={{ color: theme.colors.textOnPrimary }}>保存</Text>
            </TouchableOpacity>
          </View>
        </View>
      </TouchableOpacity>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  addCard: {
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  input: {
    height: 44,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: StyleSheet.hairlineWidth,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.xs,
  },
  colorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
  },
  colorBtn: {
    width: 32,
    height: 32,
    borderRadius: 16,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
    borderWidth: 3,
  },
  addBtn: {
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  addBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  list: {
    paddingBottom: Spacing.lg,
  },
  item: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.md,
  },
  itemName: {
    flex: 1,
    fontSize: FontSize.md,
  },
  actionText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.4)',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  modalCard: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  modalTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  modalActions: {
    flexDirection: 'row',
    marginTop: Spacing.lg,
  },
  modalBtn: {
    flex: 1,
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: Spacing.xs,
    borderWidth: StyleSheet.hairlineWidth,
  },
});

export default CategoryManageScreen;
