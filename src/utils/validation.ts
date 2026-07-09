/**
 * @file utils/validation.ts
 * @description 输入校验工具：文本长度、图片数量、API Key 格式等。
 */

import { INPUT_LIMITS, AUDIO_EXTENSIONS } from '../constants/config';
import { FileService } from '../services/storage/FileService';
import { createAppError } from '../services/ai/httpClient';

/**
 * 校验文本长度。
 */
export function validateTextLength(text: string): void {
  if (text.length > INPUT_LIMITS.MAX_TEXT_LENGTH) {
    throw createAppError(
      'TEXT_TOO_LONG',
      `文本不能超过 ${INPUT_LIMITS.MAX_TEXT_LENGTH} 字符`,
      { length: text.length },
    );
  }
}

/**
 * 校验图片数量。
 */
export function validateImageCount(count: number): void {
  if (count > INPUT_LIMITS.MAX_IMAGE_COUNT) {
    throw createAppError(
      'TOO_MANY_IMAGES',
      `图片不能超过 ${INPUT_LIMITS.MAX_IMAGE_COUNT} 张`,
      { count },
    );
  }
}

/**
 * 校验音频文件扩展名。
 */
export function validateAudioExtension(uri: string): void {
  const ext = FileService.extractExtension(uri);
  if (!AUDIO_EXTENSIONS.includes(ext)) {
    throw createAppError(
      'UNSUPPORTED_AUDIO',
      `不支持的音频格式: .${ext}，支持 ${AUDIO_EXTENSIONS.join('/')}`,
    );
  }
}

/**
 * 校验 API Key 非空（格式宽松，仅检查非空与长度下限）。
 */
export function validateApiKey(key: string, providerName: string): void {
  if (!key || !key.trim()) {
    throw createAppError('EMPTY_API_KEY', `请输入${providerName}的 API Key`);
  }
  if (key.trim().length < 8) {
    throw createAppError('INVALID_API_KEY', 'API Key 格式不正确');
  }
}

/**
 * 校验分类名称。
 */
export function validateCategoryName(name: string): void {
  if (!name || !name.trim()) {
    throw createAppError('EMPTY_NAME', '分类名称不能为空');
  }
  if (name.length > 20) {
    throw createAppError('NAME_TOO_LONG', '分类名称不能超过 20 字');
  }
}

/**
 * 校验笔记标题。
 */
export function validateNoteTitle(title: string): void {
  if (title.length > 100) {
    throw createAppError('TITLE_TOO_LONG', '标题不能超过 100 字');
  }
}

/**
 * 判断字符串是否为有效 URL/URI。
 */
export function isUri(value: string): boolean {
  return /^(file:|https?:|content:|asset:)/i.test(value);
}
