/**
 * @file services/media/ImageService.ts
 * @description 图片服务：拍照 / 相册选图 + 压缩（长边≤1920px、≤2MB）。
 *              基于 expo-image-picker + expo-image-manipulator。
 */

import * as ImagePicker from 'expo-image-picker';
import { manipulateAsync, SaveFormat, type Action } from 'expo-image-manipulator';
import { INPUT_LIMITS, IMAGE_MIME_TYPES } from '../../constants/config';
import { createAppError } from '../ai/httpClient';
import logger from '../../utils/logger';

/** 选图结果 */
export interface PickedImage {
  uri: string;
  width: number;
  height: number;
  mimeType: string;
  size?: number;
}

/**
 * 图片服务。
 */
export class ImageService {
  /**
   * 请求相机权限。
   */
  static async requestCameraPermission(): Promise<boolean> {
    const perm = await ImagePicker.requestCameraPermissionsAsync();
    return perm.granted;
  }

  /**
   * 请求相册权限。
   */
  static async requestLibraryPermission(): Promise<boolean> {
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    return perm.granted;
  }

  /**
   * 拍照并压缩。取消时返回 null。
   */
  static async openCamera(): Promise<PickedImage | null> {
    const granted = await this.requestCameraPermission();
    if (!granted) {
      throw createAppError('PERMISSION_DENIED', '需要相机权限才能拍照');
    }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: false,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) {
      return null;
    }
    const asset = result.assets[0];
    return this.processImage(asset.uri, asset.width, asset.height, asset.mimeType);
  }

  /**
   * 从相册选图（多选，最多 9 张）并压缩。取消时返回空数组。
   */
  static async openPicker(maxCount: number = INPUT_LIMITS.MAX_IMAGE_COUNT): Promise<PickedImage[]> {
    const granted = await this.requestLibraryPermission();
    if (!granted) {
      throw createAppError('PERMISSION_DENIED', '需要相册权限才能选择图片');
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsMultipleSelection: true,
      selectionLimit: maxCount,
      quality: 0.8,
    });
    if (result.canceled || result.assets.length === 0) {
      return [];
    }
    const out: PickedImage[] = [];
    for (const asset of result.assets) {
      const processed = await this.processImage(asset.uri, asset.width, asset.height, asset.mimeType);
      out.push(processed);
    }
    return out.slice(0, maxCount);
  }

  /**
   * 处理单张图片：校验类型 + 压缩（长边≤1920px）。
   */
  static async processImage(
    uri: string,
    width: number,
    height: number,
    mimeType?: string,
  ): Promise<PickedImage> {
    // MIME 校验
    const mime = mimeType || 'image/jpeg';
    if (!IMAGE_MIME_TYPES.includes(mime)) {
      throw createAppError('UNSUPPORTED_IMAGE', `不支持的图片格式: ${mime}`);
    }

    const compressed = await this.compressImage(uri, width, height);
    return {
      uri: compressed.uri,
      width: compressed.width ?? width,
      height: compressed.height ?? height,
      mimeType: 'image/jpeg',
      size: compressed.size,
    };
  }

  /**
   * 压缩图片：长边超过 1920px 时缩放，统一转为 JPEG 质量 0.7。
   * @returns 压缩后 URI 及尺寸
   */
  static async compressImage(
    uri: string,
    originalWidth: number,
    originalHeight: number,
  ): Promise<{ uri: string; width?: number; height?: number; size?: number }> {
    const MAX_DIM = INPUT_LIMITS.IMAGE_MAX_DIMENSION;
    try {
      const actions: Action[] = [];
      let targetWidth = originalWidth;
      let targetHeight = originalHeight;
      const longEdge = Math.max(originalWidth, originalHeight);
      if (longEdge > MAX_DIM) {
        const scale = MAX_DIM / longEdge;
        targetWidth = Math.round(originalWidth * scale);
        targetHeight = Math.round(originalHeight * scale);
        actions.push({ resize: { width: targetWidth, height: targetHeight } });
      }

      const result = await manipulateAsync(uri, actions, {
        compress: 0.7,
        format: SaveFormat.JPEG,
      });

      logger.debug('Image compressed:', result.uri);
      return {
        uri: result.uri,
        width: targetWidth,
        height: targetHeight,
      };
    } catch (err) {
      logger.warn('compressImage failed, returning original', err);
      return { uri, width: originalWidth, height: originalHeight };
    }
  }
}

export default ImageService;
