/**
 * @file services/media/AudioService.ts
 * @description 音频服务：录音 + 文件选择 + 校验。
 *              基于 expo-audio（录音）与 expo-document-picker（选文件）。
 *
 * 说明：expo-audio 的录音器以 hook（useAudioRecorder）形式提供，
 * 因此本服务采用"注入录音器"模式：组件创建 recorder 后调用 attachRecorder 注入，
 * 随后即可通过本服务统一调用 start/stop/pause/resume。
 * 录音时长等实时状态请使用 useAudioRecorderState(recorder) 获取。
 */

import * as DocumentPicker from 'expo-document-picker';
import { AudioModule, type AudioRecorder } from 'expo-audio';
import { INPUT_LIMITS, AUDIO_EXTENSIONS } from '../../constants/config';
import { FileService } from '../storage/FileService';
import { createAppError } from '../ai/httpClient';
import { formatDuration } from '../../utils/date';
import logger from '../../utils/logger';

/** 选择的音频文件 */
export interface PickedAudio {
  uri: string;
  name: string;
  size: number;
  mimeType?: string;
}

/**
 * 音频服务。
 */
export class AudioService {
  private recorder: AudioRecorder | null = null;

  /**
   * 注入录音器实例（由组件通过 useAudioRecorder 创建）。
   */
  attachRecorder(recorder: AudioRecorder): void {
    this.recorder = recorder;
  }

  /**
   * 设置音频模式（录音前调用）。
   */
  static async setupAudioMode(): Promise<void> {
    try {
      await AudioModule.setAudioModeAsync({
        playsInSilentMode: true,
        interruptionMode: 'duckOthers',
        allowsRecording: true,
        shouldPlayInBackground: false,
      });
    } catch (err) {
      logger.warn('setupAudioMode failed', err);
    }
  }

  /**
   * 开始录音。
   */
  async startRecording(): Promise<void> {
    if (!this.recorder) {
      throw createAppError('NO_RECORDER', '录音器未初始化');
    }
    await AudioService.setupAudioMode();
    // SDK 56 需先 prepare 再 record
    await this.recorder.prepareToRecordAsync();
    if (!this.recorder.isRecording) {
      this.recorder.record();
      logger.debug('Recording started');
    }
  }

  /**
   * 暂停录音。
   */
  async pauseRecording(): Promise<void> {
    if (this.recorder?.isRecording) {
      this.recorder.pause();
      logger.debug('Recording paused');
    }
  }

  /**
   * 继续录音。
   */
  async resumeRecording(): Promise<void> {
    if (this.recorder && !this.recorder.isRecording) {
      this.recorder.record();
      logger.debug('Recording resumed');
    }
  }

  /**
   * 停止录音并返回文件 URI。
   */
  async stopRecording(): Promise<string | null> {
    if (!this.recorder) {
      return null;
    }
    if (this.recorder.isRecording) {
      await this.recorder.stop();
    }
    const uri = this.recorder.uri;
    logger.debug('Recording stopped, uri=', uri);
    return uri;
  }

  /**
   * 当前是否正在录音。
   */
  get isRecording(): boolean {
    return this.recorder?.isRecording ?? false;
  }

  /**
   * 从文件系统选择音频文件。
   */
  static async pickAudioFile(): Promise<PickedAudio | null> {
    try {
      const result = await DocumentPicker.getDocumentAsync({
        type: 'audio/*',
        copyToCacheDirectory: true,
        multiple: false,
      });
      if (result.canceled || (result.assets?.length ?? 0) === 0) {
        return null;
      }
      const asset = result.assets[0];
      const ext = FileService.extractExtension(asset.uri);
      if (!AUDIO_EXTENSIONS.includes(ext)) {
        throw createAppError(
          'UNSUPPORTED_AUDIO',
          `不支持的音频格式: ${ext}，支持 ${AUDIO_EXTENSIONS.join('/')}`,
        );
      }
      return {
        uri: asset.uri,
        name: asset.name,
        size: asset.size ?? 0,
        mimeType: asset.mimeType,
      };
    } catch (err) {
      logger.error('pickAudioFile failed', err);
      throw err;
    }
  }

  /**
   * 校验音频文件大小。
   */
  static validateAudioSize(sizeBytes: number): void {
    if (sizeBytes > INPUT_LIMITS.AUDIO_MAX_BYTES) {
      throw createAppError(
        'AUDIO_TOO_LARGE',
        `音频文件不能超过 ${formatDuration(INPUT_LIMITS.AUDIO_MAX_DURATION_S)} / 50MB`,
      );
    }
  }

  /**
   * 校验录音时长是否超限。
   */
  static validateDuration(seconds: number): void {
    if (seconds > INPUT_LIMITS.AUDIO_MAX_DURATION_S) {
      throw createAppError(
        'AUDIO_TOO_LONG',
        `录音不能超过 ${formatDuration(INPUT_LIMITS.AUDIO_MAX_DURATION_S)}`,
      );
    }
  }
}

export default AudioService;
