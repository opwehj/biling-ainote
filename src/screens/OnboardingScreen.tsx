/**
 * @file screens/OnboardingScreen.tsx
 * @description 首次启动引导页。引导用户选择提供商并配置 API Key，测试连通后进入主界面。
 */

import React, { useState, useCallback } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import type { RootStackScreenProps } from '../types';
import { useTheme } from '../hooks/useTheme';
import { useSettingsStore } from '../store/settingsStore';
import { useUiStore } from '../store/uiStore';
import { ProviderSelector } from '../components/ProviderSelector';
import { PROVIDERS } from '../constants/providers';
import { FontSize, FontWeight, Radius, Spacing, Shadows } from '../constants/theme';
import { validateApiKey } from '../utils/validation';
import type { LLMProviderId, AppError } from '../types';

export function OnboardingScreen(): React.ReactElement {
  const theme = useTheme();
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<RootStackScreenProps<'Onboarding'>['navigation']>();
  const setting = useSettingsStore((s) => s.setting);
  const changeProvider = useSettingsStore((s) => s.changeProvider);
  const saveLlmApiKey = useSettingsStore((s) => s.saveLlmApiKey);
  const completeOnboarding = useSettingsStore((s) => s.completeOnboarding);
  const testConnection = useSettingsStore((s) => s.testConnection);
  const testing = useSettingsStore((s) => s.testing);
  const testResult = useSettingsStore((s) => s.testResult);
  const showToast = useUiStore((s) => s.showToast);

  const [apiKey, setApiKey] = useState('');
  const [step, setStep] = useState<1 | 2>(1);

  const providerMeta = PROVIDERS[setting.llmProvider];
  const needsAsrKey = providerMeta.needsAsrKey;

  const handleTest = useCallback(async () => {
    try {
      validateApiKey(apiKey, providerMeta.name);
      await saveLlmApiKey(apiKey.trim());
      const ok = await testConnection();
      if (ok) {
        setStep(2);
      } else {
        showToast({ type: 'error', message: '连接失败，请检查 Key 与网络' });
      }
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '操作失败' });
    }
  }, [apiKey, providerMeta.name, saveLlmApiKey, testConnection, showToast]);

  const enterApp = useCallback(() => {
    completeOnboarding();
    // 重置根路由到主界面
    navigation.reset({ index: 0, routes: [{ name: 'MainTabs' }] });
  }, [completeOnboarding, navigation]);

  const handleSkip = useCallback(() => {
    enterApp();
  }, [enterApp]);

  const handleFinish = useCallback(() => {
    enterApp();
    showToast({ type: 'success', message: '设置完成，开始使用吧' });
  }, [enterApp, showToast]);

  return (
    <KeyboardAvoidingView
      style={{ flex: 1, backgroundColor: theme.colors.background }}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
    >
      <ScrollView
        contentContainerStyle={[styles.container, { paddingTop: insets.top + Spacing.xxxl }]}
        keyboardShouldPersistTaps="handled"
      >
        <Text style={[styles.emoji]}>✍️</Text>
        <Text style={[styles.title, { color: theme.colors.textPrimary }]}>欢迎使用笔灵</Text>
        <Text style={[styles.subtitle, { color: theme.colors.textSecondary }]}>
          AI 智能笔记，让记录更轻松
        </Text>

        {step === 1 ? (
          <View style={[styles.card, { backgroundColor: theme.colors.card }, Shadows.md]}>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary }]}>
              1. 选择 AI 模型
            </Text>
            <ProviderSelector value={setting.llmProvider} onChange={changeProvider} />

            <Text style={[styles.providerDesc, { color: theme.colors.textSecondary }]}>
              {providerMeta.description}
            </Text>

            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, marginTop: Spacing.xl }]}>
              2. 配置 API Key
            </Text>
            <TextInput
              style={[
                styles.input,
                {
                  color: theme.colors.textPrimary,
                  backgroundColor: theme.colors.surfaceVariant,
                  borderColor: theme.colors.border,
                },
              ]}
              value={apiKey}
              onChangeText={setApiKey}
              placeholder="输入 API Key"
              placeholderTextColor={theme.colors.textTertiary}
              secureTextEntry
              autoCapitalize="none"
              autoCorrect={false}
            />
            <TouchableOpacity
              style={styles.linkBtn}
              onPress={() => {}}
              activeOpacity={0.7}
            >
              <Text style={[styles.linkText, { color: theme.colors.primary }]}>
                如何获取 API Key？
              </Text>
            </TouchableOpacity>

            {needsAsrKey ? (
              <View style={[styles.tipBox, { backgroundColor: theme.colors.warning + '18' }]}>
                <Text style={[styles.tipText, { color: theme.colors.warning }]}>
                  该提供商语音转写需独立 ASR Key，可稍后在设置中配置。
                </Text>
              </View>
            ) : null}

            <View style={styles.row}>
              <TouchableOpacity
                style={[styles.ghostBtn, { borderColor: theme.colors.border }]}
                onPress={handleSkip}
              >
                <Text style={[styles.ghostBtnText, { color: theme.colors.textSecondary }]}>
                  稍后配置
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[styles.primaryBtn, { backgroundColor: theme.colors.primary }]}
                onPress={handleTest}
                disabled={testing}
              >
                {testing ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.primaryBtnText}>测试并继续</Text>
                )}
              </TouchableOpacity>
            </View>

            {testResult === 'fail' ? (
              <Text style={[styles.failText, { color: theme.colors.error }]}>
                连接失败，请确认 Key 正确且网络可用
              </Text>
            ) : null}
          </View>
        ) : (
          <View style={[styles.card, { backgroundColor: theme.colors.card }, Shadows.md]}>
            <Text style={[styles.successIcon]}>✅</Text>
            <Text style={[styles.sectionTitle, { color: theme.colors.textPrimary, textAlign: 'center' }]}>
              连接成功！
            </Text>
            <Text style={[styles.providerDesc, { color: theme.colors.textSecondary, textAlign: 'center' }]}>
              你已配置 {providerMeta.name}，现在可以开始用 AI 生成笔记了。
            </Text>
            <TouchableOpacity
              style={[styles.primaryBtn, { backgroundColor: theme.colors.primary, marginTop: Spacing.xl }]}
              onPress={handleFinish}
            >
              <Text style={styles.primaryBtnText}>开始使用</Text>
            </TouchableOpacity>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xxxl,
  },
  emoji: {
    fontSize: 56,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
  title: {
    fontSize: 28,
    fontWeight: FontWeight.bold,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: FontSize.md,
    textAlign: 'center',
    marginTop: Spacing.xs,
    marginBottom: Spacing.xxl,
  },
  card: {
    borderRadius: Radius.lg,
    padding: Spacing.xl,
  },
  sectionTitle: {
    fontSize: FontSize.lg,
    fontWeight: FontWeight.semibold,
    marginBottom: Spacing.md,
  },
  providerDesc: {
    fontSize: FontSize.sm,
    lineHeight: 20,
    marginTop: Spacing.sm,
  },
  input: {
    height: 48,
    borderRadius: Radius.md,
    paddingHorizontal: Spacing.md,
    fontSize: FontSize.md,
    borderWidth: StyleSheet.hairlineWidth,
    marginTop: Spacing.sm,
  },
  linkBtn: {
    alignSelf: 'flex-start',
    marginTop: Spacing.xs,
    paddingVertical: Spacing.xs,
  },
  linkText: {
    fontSize: FontSize.sm,
  },
  tipBox: {
    padding: Spacing.md,
    borderRadius: Radius.md,
    marginTop: Spacing.md,
  },
  tipText: {
    fontSize: FontSize.xs,
    lineHeight: 18,
  },
  row: {
    flexDirection: 'row',
    marginTop: Spacing.xl,
  },
  ghostBtn: {
    flex: 1,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
    borderWidth: StyleSheet.hairlineWidth,
    marginRight: Spacing.md,
  },
  ghostBtnText: {
    fontSize: FontSize.md,
    fontWeight: FontWeight.medium,
  },
  primaryBtn: {
    flex: 1.5,
    height: 48,
    borderRadius: Radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  primaryBtnText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  failText: {
    fontSize: FontSize.xs,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  successIcon: {
    fontSize: 48,
    textAlign: 'center',
    marginBottom: Spacing.md,
  },
});

export default OnboardingScreen;
