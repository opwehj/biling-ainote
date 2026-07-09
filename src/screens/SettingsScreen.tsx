/**
 * @file screens/SettingsScreen.tsx
 * @description 设置页。模型提供商选择、API Key 配置、连通性测试、
 *              高级参数（temperature/maxTokens）、主题与排序偏好、分类管理入口、数据清空。
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Switch,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps, ThemeMode, SortOrder } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore, validateTemperature, validateMaxTokens } from '../store/settingsStore';
import { useNoteStore } from '../store/noteStore';
import { useUiStore } from '../store/uiStore';
import { ProviderSelector } from '../components/ProviderSelector';
import { PROVIDERS } from '../constants/providers';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';
import type { AppError } from '../types';

const THEME_OPTIONS: { label: string; value: ThemeMode }[] = [
  { label: '跟随系统', value: 'system' },
  { label: '浅色', value: 'light' },
  { label: '深色', value: 'dark' },
];

const SORT_OPTIONS: { label: string; value: SortOrder }[] = [
  { label: '最近更新', value: 'updated_desc' },
  { label: '最早更新', value: 'updated_asc' },
  { label: '最近创建', value: 'created_desc' },
  { label: '最早创建', value: 'created_asc' },
];

export function SettingsScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const nav = useNavigation<RootStackScreenProps<'CategoryManage'>['navigation']>();

  const setting = useSettingsStore((s) => s.setting);
  const llmApiKey = useSettingsStore((s) => s.llmApiKey);
  const asrApiKey = useSettingsStore((s) => s.asrApiKey);
  const saveSetting = useSettingsStore((s) => s.saveSetting);
  const changeProvider = useSettingsStore((s) => s.changeProvider);
  const saveLlmApiKey = useSettingsStore((s) => s.saveLlmApiKey);
  const saveAsrApiKey = useSettingsStore((s) => s.saveAsrApiKey);
  const testing = useSettingsStore((s) => s.testing);
  const testResult = useSettingsStore((s) => s.testResult);
  const testConnection = useSettingsStore((s) => s.testConnection);
  const showToast = useUiStore((s) => s.showToast);
  const loadNotes = useNoteStore((s) => s.loadNotes);

  const [llmKeyInput, setLlmKeyInput] = useState(llmApiKey);
  const [asrKeyInput, setAsrKeyInput] = useState(asrApiKey);
  const [showAdvanced, setShowAdvanced] = useState(false);

  const providerMeta = PROVIDERS[setting.llmProvider];

  const handleSaveLlmKey = useCallback(async () => {
    try {
      if (llmKeyInput && llmKeyInput.trim().length < 8) {
        showToast({ type: 'error', message: 'API Key 格式不正确' });
        return;
      }
      if (llmKeyInput.trim()) {
        await saveLlmApiKey(llmKeyInput.trim());
        showToast({ type: 'success', message: 'Key 已保存' });
      }
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '保存失败' });
    }
  }, [llmKeyInput, saveLlmApiKey, showToast]);

  const handleSaveAsrKey = useCallback(async () => {
    try {
      await saveAsrApiKey(asrKeyInput.trim());
      showToast({ type: 'success', message: 'ASR Key 已保存' });
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '保存失败' });
    }
  }, [asrKeyInput, saveAsrApiKey, showToast]);

  const handleTest = useCallback(async () => {
    await handleSaveLlmKey();
    await testConnection();
  }, [handleSaveLlmKey, testConnection]);

  const handleClearData = useCallback(() => {
    Alert.alert('清空数据', '将删除全部笔记与素材，且不可恢复。确定继续吗？', [
      { text: '取消', style: 'cancel' },
      {
        text: '清空',
        style: 'destructive',
        onPress: () => {
          showToast({ type: 'info', message: '请在数据库中手动清理（MVP 暂未提供一键清空）' });
        },
      },
    ]);
  }, [showToast]);

  const handleCategoryManage = useCallback(() => {
    nav.navigate('CategoryManage');
  }, [nav]);

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: theme.colors.background }]}
      contentContainerStyle={{ paddingTop: insets.top + Spacing.sm, paddingBottom: insets.bottom + Spacing.xxxl }}
    >
      <Text style={[styles.title, { color: theme.colors.textPrimary }]}>设置</Text>

      {/* 模型配置 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>AI 模型</Text>
        <ProviderSelector value={setting.llmProvider} onChange={changeProvider} />
        <View style={[styles.infoBox, { backgroundColor: theme.colors.surfaceVariant }]}>
          <Text style={[styles.infoText, { color: theme.colors.textSecondary }]}>
            {providerMeta.description}
          </Text>
          <Text style={[styles.infoModel, { color: theme.colors.textTertiary }]}>
            文本模型：{setting.llmModel}{'\n'}视觉模型：{setting.visionModel}
          </Text>
        </View>
      </View>

      {/* API Key */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>API Key</Text>
        <TextInput
          style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
          value={llmKeyInput}
          onChangeText={setLlmKeyInput}
          placeholder="输入 LLM API Key"
          placeholderTextColor={theme.colors.textTertiary}
          secureTextEntry
          autoCapitalize="none"
          autoCorrect={false}
        />
        <View style={styles.row}>
          <TouchableOpacity
            style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, flex: 1 }]}
            onPress={handleTest}
            disabled={testing}
          >
            {testing ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>测试连接</Text>}
          </TouchableOpacity>
        </View>
        {testResult === 'success' ? (
          <Text style={[styles.resultText, { color: theme.colors.success }]}>✓ 连接成功</Text>
        ) : null}
        {testResult === 'fail' ? (
          <Text style={[styles.resultText, { color: theme.colors.error }]}>✗ 连接失败，请检查 Key 与网络</Text>
        ) : null}
      </View>

      {/* ASR Key（按需显示） */}
      {providerMeta.needsAsrKey ? (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>语音转写 Key</Text>
          <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
            当前提供商需独立的 DashScope ASR Key 用于语音转写。
          </Text>
          <TextInput
            style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surface, borderColor: theme.colors.border }]}
            value={asrKeyInput}
            onChangeText={setAsrKeyInput}
            placeholder="输入 ASR API Key（DashScope）"
            placeholderTextColor={theme.colors.textTertiary}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
          />
          <TouchableOpacity
            style={[styles.ghostBtn, { borderColor: theme.colors.border }]}
            onPress={handleSaveAsrKey}
          >
            <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>保存 ASR Key</Text>
          </TouchableOpacity>
        </View>
      ) : null}

      {/* 语音转写开关 */}
      <View style={styles.section}>
        <View style={[styles.rowItem, { backgroundColor: theme.colors.card }]}>
          <View style={{ flex: 1 }}>
            <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>语音转写</Text>
            <Text style={[styles.itemDesc, { color: theme.colors.textTertiary }]}>
              录音后自动转写为文字
            </Text>
          </View>
          <Switch
            value={setting.asrEnabled}
            onValueChange={(v) => saveSetting({ asrEnabled: v })}
            trackColor={{ false: theme.colors.border, true: theme.colors.primary }}
          />
        </View>
      </View>

      {/* 高级设置 */}
      <View style={styles.section}>
        <TouchableOpacity
          style={[styles.advancedHeader, { backgroundColor: theme.colors.card }]}
          onPress={() => setShowAdvanced((v) => !v)}
        >
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>高级设置</Text>
          <Text style={{ color: theme.colors.textTertiary }}>{showAdvanced ? '▲' : '▼'}</Text>
        </TouchableOpacity>
        {showAdvanced ? (
          <View style={[styles.advancedBody, { backgroundColor: theme.colors.card }]}>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                采样温度（0-2，越大越随机）：{setting.temperature.toFixed(1)}
              </Text>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}
                value={String(setting.temperature)}
                onChangeText={(v) => {
                  const n = parseFloat(v);
                  if (!Number.isNaN(n)) saveSetting({ temperature: validateTemperature(n) });
                }}
                keyboardType="decimal-pad"
              />
            </View>
            <View style={styles.field}>
              <Text style={[styles.fieldLabel, { color: theme.colors.textSecondary }]}>
                最大 Tokens（256-8192）
              </Text>
              <TextInput
                style={[styles.input, { color: theme.colors.textPrimary, backgroundColor: theme.colors.surfaceVariant, borderColor: theme.colors.border }]}
                value={String(setting.maxTokens)}
                onChangeText={(v) => {
                  const n = parseInt(v, 10);
                  if (!Number.isNaN(n)) saveSetting({ maxTokens: validateMaxTokens(n) });
                }}
                keyboardType="numeric"
              />
            </View>
          </View>
        ) : null}
      </View>

      {/* 偏好 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>外观</Text>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {THEME_OPTIONS.map((o) => {
            const active = setting.themeMode === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant }]}
                onPress={() => saveSetting({ themeMode: o.value })}
              >
                <Text style={{ color: active ? theme.colors.textOnPrimary : theme.colors.textSecondary, fontSize: FontSize.sm }}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>笔记排序</Text>
        <View style={[styles.row, { flexWrap: 'wrap' }]}>
          {SORT_OPTIONS.map((o) => {
            const active = setting.sortOrder === o.value;
            return (
              <TouchableOpacity
                key={o.value}
                style={[styles.chip, { backgroundColor: active ? theme.colors.primary : theme.colors.surfaceVariant }]}
                onPress={() => {
                  saveSetting({ sortOrder: o.value });
                  loadNotes();
                }}
              >
                <Text style={{ color: active ? theme.colors.textOnPrimary : theme.colors.textSecondary, fontSize: FontSize.sm }}>
                  {o.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>

      {/* 分类管理 */}
      <View style={styles.section}>
        <TouchableOpacity style={[styles.rowItem, { backgroundColor: theme.colors.card }]} onPress={handleCategoryManage}>
          <Text style={[styles.itemTitle, { color: theme.colors.textPrimary }]}>分类管理</Text>
          <Text style={{ color: theme.colors.textTertiary }}>›</Text>
        </TouchableOpacity>
      </View>

      {/* 数据管理 */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>数据管理</Text>
        <TouchableOpacity style={[styles.dangerBtn, { borderColor: theme.colors.error }]} onPress={handleClearData}>
          <Text style={[styles.dangerText, { color: theme.colors.error }]}>清空全部数据</Text>
        </TouchableOpacity>
      </View>

      <Text style={[styles.version, { color: theme.colors.textTertiary }]}>笔灵 BiLing v1.0.0</Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    marginBottom: Spacing.md,
  },
  section: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  infoBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.sm,
  },
  infoText: {
    fontSize: FontSize.sm,
    lineHeight: 20,
  },
  infoModel: {
    fontSize: FontSize.xs,
    marginTop: Spacing.xs,
    lineHeight: 18,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginBottom: Spacing.sm,
  },
  row: {
    flexDirection: 'row',
  },
  primaryBtn: {
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ghostBtn: {
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  btnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  resultText: {
    fontSize: FontSize.sm,
    marginTop: Spacing.sm,
  },
  hint: {
    fontSize: FontSize.xs,
    marginBottom: Spacing.sm,
    lineHeight: 18,
  },
  rowItem: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  itemTitle: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  itemDesc: {
    fontSize: FontSize.xs,
    marginTop: 2,
  },
  advancedHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
  },
  advancedBody: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderBottomLeftRadius: Radius.md,
    borderBottomRightRadius: Radius.md,
  },
  field: {
    marginBottom: Spacing.md,
  },
  fieldLabel: {
    fontSize: FontSize.sm,
    marginBottom: Spacing.xs,
  },
  chip: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginRight: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  dangerBtn: {
    height: 44,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
  },
  dangerText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  version: {
    textAlign: 'center',
    fontSize: FontSize.xs,
    marginTop: Spacing.lg,
  },
});

export default SettingsScreen;
