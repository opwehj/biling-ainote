/**
 * @file components/AudioInputPanel.tsx
 * @description 音频输入面板。支持录音（暂停/继续/停止）与从文件选择音频。
 *              使用 expo-audio 的 useAudioRecorder hook。
 */

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  StyleSheet,
  View,
  Text,
  TouchableOpacity,
  FlatList,
  ActivityIndicator,
} from 'react-native';
import { useAudioRecorder, useAudioRecorderState, RecordingPresets } from 'expo-audio';
import { useTheme } from '../hooks/useTheme';
import { AudioService } from '../services/media/AudioService';
import { formatDuration } from '../utils/date';
import { INPUT_LIMITS } from '../constants/config';
import { FontSize, FontWeight, Radius, Spacing } from '../constants/theme';
import { useUiStore } from '../store/uiStore';
import type { AppError } from '../types';

interface AudioInputPanelProps {
  uris: string[];
  onChange: (uris: string[]) => void;
}

export function AudioInputPanel({ uris, onChange }: AudioInputPanelProps): React.ReactElement {
  const theme = useTheme();
  const showToast = useUiStore((s) => s.showToast);
  const [recording, setRecording] = useState(false);
  const [paused, setPaused] = useState(false);
  const [duration, setDuration] = useState(0);
  const [busy, setBusy] = useState(false);

  const recorder = useAudioRecorder(RecordingPresets.HIGH_QUALITY);
  // 实时状态：isRecording / durationMillis（轮询）
  const recState = useAudioRecorderState(recorder, 200);

  const serviceRef = useRef<AudioService>(new AudioService());
  useEffect(() => {
    serviceRef.current.attachRecorder(recorder);
  }, [recorder]);

  // 同步实时录音时长
  useEffect(() => {
    setDuration(recState.durationMillis / 1000);
  }, [recState.durationMillis]);

  const handleStart = useCallback(async () => {
    setBusy(true);
    try {
      AudioService.validateDuration(duration);
      await serviceRef.current.startRecording();
      setRecording(true);
      setPaused(false);
      setDuration(0);
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '无法开始录音' });
    } finally {
      setBusy(false);
    }
  }, [duration, showToast]);

  const handlePause = useCallback(async () => {
    await serviceRef.current.pauseRecording();
    setPaused(true);
  }, []);

  const handleResume = useCallback(async () => {
    await serviceRef.current.resumeRecording();
    setPaused(false);
  }, []);

  const handleStop = useCallback(async () => {
    setBusy(true);
    try {
      const uri = await serviceRef.current.stopRecording();
      if (uri) {
        onChange([...uris, uri]);
      }
      setRecording(false);
      setPaused(false);
      setDuration(0);
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '录音停止失败' });
    } finally {
      setBusy(false);
    }
  }, [uris, onChange, showToast]);

  const handlePickFile = useCallback(async () => {
    setBusy(true);
    try {
      const audio = await AudioService.pickAudioFile();
      if (audio) {
        AudioService.validateAudioSize(audio.size);
        onChange([...uris, audio.uri]);
      }
    } catch (err) {
      showToast({ type: 'error', message: (err as AppError)?.message || '选择音频失败' });
    } finally {
      setBusy(false);
    }
  }, [uris, onChange, showToast]);

  const handleRemove = useCallback(
    (index: number) => {
      onChange(uris.filter((_, i) => i !== index));
    },
    [uris, onChange],
  );

  return (
    <View style={styles.container}>
      <View style={[styles.toolbar, { borderColor: theme.colors.border }]}>
        <TouchableOpacity
          style={[styles.btn, { backgroundColor: theme.colors.surfaceVariant }]}
          onPress={handlePickFile}
          disabled={busy || recording}
          activeOpacity={0.85}
        >
          {busy && !recording ? (
            <ActivityIndicator color={theme.colors.primary} size="small" />
          ) : (
            <Text style={styles.btnIcon}>📁</Text>
          )}
          <Text style={[styles.btnText, { color: theme.colors.textPrimary }]}>选择文件</Text>
        </TouchableOpacity>
        <Text style={[styles.hint, { color: theme.colors.textTertiary }]}>
          上限 {formatDuration(INPUT_LIMITS.AUDIO_MAX_DURATION_S)} / 50MB
        </Text>
      </View>

      {recording ? (
        <View style={[styles.recordingCard, { backgroundColor: theme.colors.surface }]}>
          <View style={styles.recInfo}>
            <View style={[styles.dot, { backgroundColor: paused ? theme.colors.warning : theme.colors.error }]} />
            <Text style={[styles.recTime, { color: theme.colors.textPrimary }]}>
              {formatDuration(duration)}
            </Text>
            <Text style={[styles.recStatus, { color: theme.colors.textTertiary }]}>
              {paused ? '已暂停' : '录音中…'}
            </Text>
          </View>
          <View style={styles.recActions}>
            {paused ? (
              <TouchableOpacity
                style={[styles.recBtn, { backgroundColor: theme.colors.success }]}
                onPress={handleResume}
              >
                <Text style={styles.recBtnText}>继续</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={[styles.recBtn, { backgroundColor: theme.colors.warning }]}
                onPress={handlePause}
              >
                <Text style={styles.recBtnText}>暂停</Text>
              </TouchableOpacity>
            )}
            <TouchableOpacity
              style={[styles.recBtn, { backgroundColor: theme.colors.error }]}
              onPress={handleStop}
            >
              <Text style={styles.recBtnText}>停止</Text>
            </TouchableOpacity>
          </View>
        </View>
      ) : (
        <TouchableOpacity
          style={[styles.recordBtn, { backgroundColor: theme.colors.primary }]}
          onPress={handleStart}
          disabled={busy}
          activeOpacity={0.85}
        >
          <Text style={styles.recordIcon}>🎤</Text>
          <Text style={styles.recordText}>开始录音</Text>
        </TouchableOpacity>
      )}

      {uris.length > 0 ? (
        <FlatList
          data={uris}
          keyExtractor={(item, index) => `${item}-${index}`}
          style={styles.list}
          renderItem={({ item, index }) => (
            <View style={[styles.audioItem, { backgroundColor: theme.colors.surfaceVariant }]}>
              <Text style={styles.audioIcon}>🎵</Text>
              <Text style={[styles.audioName, { color: theme.colors.textPrimary }]} numberOfLines={1}>
                {item.split('/').pop() || `录音 ${index + 1}`}
              </Text>
              <TouchableOpacity onPress={() => handleRemove(index)} hitSlop={8}>
                <Text style={[styles.removeText, { color: theme.colors.error }]}>删除</Text>
              </TouchableOpacity>
            </View>
          )}
        />
      ) : null}
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
  recordBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.lg,
    borderRadius: Radius.lg,
    marginTop: Spacing.lg,
  },
  recordIcon: {
    fontSize: FontSize.xl,
    marginRight: Spacing.sm,
  },
  recordText: {
    color: '#fff',
    fontSize: FontSize.md,
    fontWeight: FontWeight.semibold,
  },
  recordingCard: {
    marginTop: Spacing.lg,
    padding: Spacing.lg,
    borderRadius: Radius.lg,
  },
  recInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  recTime: {
    fontSize: FontSize.xxl,
    fontWeight: FontWeight.bold,
    marginRight: Spacing.md,
  },
  recStatus: {
    fontSize: FontSize.sm,
  },
  recActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
  },
  recBtn: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    borderRadius: Radius.md,
    marginLeft: Spacing.md,
  },
  recBtnText: {
    color: '#fff',
    fontSize: FontSize.sm,
    fontWeight: FontWeight.semibold,
  },
  list: {
    marginTop: Spacing.md,
  },
  audioItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    borderRadius: Radius.md,
    marginBottom: Spacing.sm,
  },
  audioIcon: {
    fontSize: FontSize.lg,
    marginRight: Spacing.md,
  },
  audioName: {
    flex: 1,
    fontSize: FontSize.sm,
  },
  removeText: {
    fontSize: FontSize.sm,
    fontWeight: FontWeight.medium,
  },
});

export default AudioInputPanel;
