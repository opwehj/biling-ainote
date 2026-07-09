/**
 * @file services/storage/FileService.ts
 * @description 文件系统封装。基于 expo-file-system。
 *              提供 base64 读取、复制到 App 目录、删除、信息查询等。
 */

import * as FileSystem from 'expo-file-system/legacy';
import logger from '../../utils/logger';

/** App 私有素材目录（图片/音频持久化存放） */
export const APP_MEDIA_DIR = `${FileSystem.documentDirectory}media/`;

/**
 * 文件服务。
 */
export class FileService {
  /**
   * 将文件读取为 base64 字符串。
   * @param uri 文件 URI
   * @returns base64 字符串（不含 data: 前缀）
   */
  static async readAsBase64(uri: string): Promise<string> {
    try {
      const base64 = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.Base64,
      });
      return base64;
    } catch (err) {
      logger.error('FileService.readAsBase64 failed', uri, err);
      throw err;
    }
  }

  /**
   * 将文件读取为 base64 Data URL（含 MIME 前缀）。
   * @param uri 文件 URI
   * @param mimeType MIME 类型（如 image/jpeg）
   */
  static async readAsDataUrl(uri: string, mimeType: string): Promise<string> {
    const base64 = await this.readAsBase64(uri);
    return `data:${mimeType};base64,${base64}`;
  }

  /**
   * 确保 App 媒体目录存在。
   */
  static async ensureMediaDir(): Promise<void> {
    const info = await FileSystem.getInfoAsync(APP_MEDIA_DIR);
    if (!info.exists) {
      await FileSystem.makeDirectoryAsync(APP_MEDIA_DIR, { intermediates: true });
    }
  }

  /**
   * 复制外部文件到 App 私有目录，返回新 URI。
   * 用于持久化用户选中的临时文件（相册/录音/文档）。
   * @param uri 源文件 URI
   * @param fileName 目标文件名（含扩展名），为空则用源文件名
   */
  static async copyToAppDir(uri: string, fileName?: string): Promise<string> {
    await this.ensureMediaDir();
    const name = fileName || this.extractFileName(uri);
    const dest = `${APP_MEDIA_DIR}${name}`;
    await FileSystem.copyAsync({ from: uri, to: dest });
    logger.debug('File copied to app dir:', dest);
    return dest;
  }

  /**
   * 删除文件（忽略不存在错误）。
   */
  static async deleteFile(uri: string): Promise<void> {
    try {
      const info = await FileSystem.getInfoAsync(uri);
      if (info.exists) {
        await FileSystem.deleteAsync(uri, { idempotent: true });
        logger.debug('File deleted:', uri);
      }
    } catch (err) {
      logger.warn('FileService.deleteFile failed', uri, err);
    }
  }

  /**
   * 获取文件信息（大小、是否存在）。
   */
  static async getInfo(uri: string): Promise<FileSystem.FileInfo> {
    return FileSystem.getInfoAsync(uri);
  }

  /**
   * 提取文件名。
   */
  static extractFileName(uri: string): string {
    const cleaned = uri.split('?')[0].split('#')[0];
    const parts = cleaned.split('/');
    return parts[parts.length - 1] || `file_${Date.now()}`;
  }

  /**
   * 提取扩展名（小写，不含点）。
   */
  static extractExtension(uri: string): string {
    const name = this.extractFileName(uri);
    const idx = name.lastIndexOf('.');
    if (idx === -1) return '';
    return name.slice(idx + 1).toLowerCase();
  }

  /**
   * 根据扩展名推断 MIME。
   */
  static inferMimeType(uri: string): string {
    const ext = this.extractExtension(uri);
    switch (ext) {
      case 'jpg':
      case 'jpeg':
        return 'image/jpeg';
      case 'png':
        return 'image/png';
      case 'heic':
        return 'image/heic';
      case 'webp':
        return 'image/webp';
      case 'm4a':
        return 'audio/m4a';
      case 'mp3':
        return 'audio/mpeg';
      case 'wav':
        return 'audio/wav';
      case 'aac':
        return 'audio/aac';
      default:
        return 'application/octet-stream';
    }
  }
}

export default FileService;
